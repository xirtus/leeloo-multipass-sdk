import { CAPABILITIES, LINK_PROVIDERS, getCapability } from './capabilities.js';
export { CAPABILITIES, getCapability };

export class PassportConnectError extends Error {
  constructor(code, message) { super(message); this.name = 'PassportConnectError'; this.code = code; }
}
const fail = (code, message) => { throw new PassportConnectError(code, message); };
const loopbacks = new Set(['localhost', '127.0.0.1', '[::1]']);
function trustedOrigin(value, allowLoopbackHttp) {
  let url;
  try { url = new URL(value); } catch { return fail('invalid_origin', 'Set the HTTPS origin of your trusted Passport installation.'); }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol !== 'https:' && !(allowLoopbackHttp && url.protocol === 'http:' && loopbacks.has(url.hostname)))) {
    return fail('invalid_origin', 'Passport origin must be HTTPS and contain no credentials, path, query, or fragment.');
  }
  return url.origin;
}
function connectPath(value, origin) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s?#]/.test(value)) {
    return fail('invalid_path', 'Connect path must be an absolute path on the configured Passport origin.');
  }
  const url = new URL(value, origin);
  if (url.origin !== origin || url.pathname !== value) return fail('invalid_path', 'Connect path cannot change origin or use dot segments.');
  return url.pathname;
}
function launchParameters({ provider, address } = {}) {
  if (provider !== undefined && !LINK_PROVIDERS.includes(provider)) return fail('capability_unavailable', 'This provider has no supported connection adapter in this SDK version.');
  if (address !== undefined && (typeof address !== 'string' || address.length > 512 || /[\u0000-\u001f\u007f]/.test(address))) {
    return fail('invalid_address', 'Address must be text of at most 512 characters without control characters.');
  }
  return { provider, address: address?.trim() };
}

/**
 * Launches account linking at a trusted first-party surface. No credential,
 * identity assertion, or verification result returns through this SDK.
 */
export function createPassportConnect(options = {}) {
  const origin = trustedOrigin(options.origin, options.allowLoopbackHttp === true);
  const path = connectPath(options.connectPath ?? '/v1/networks/ui', origin);
  const browser = options.browser ?? globalThis.window;

  function getConnectUrl(parameters = {}) {
    const { provider, address } = launchParameters(parameters);
    const url = new URL(path, origin);
    if (provider) url.searchParams.set('provider', provider);
    if (address) url.searchParams.set('address', address);
    // The trusted page asks for the user's explicit action and consent.
    // No automatic connect flag, return URL, or authorization scope is injected.
    return url.href;
  }

  function launch(parameters = {}) {
    const url = getConnectUrl(parameters);
    const { signal, timeoutMs = 300_000, presentation = 'tab' } = parameters;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 3_600_000) return fail('invalid_timeout', 'Timeout must be between 1 second and 1 hour.');
    if (!['tab', 'popup'].includes(presentation)) return fail('invalid_presentation', 'Choose tab or popup presentation.');
    if (signal?.aborted) return fail('aborted', 'Connection launch was canceled.');
    if (!browser?.open || !browser.setInterval || !browser.setTimeout) return fail('browser_unavailable', 'Connection launch requires a browser window.');

    // Opening an empty same-origin document keeps a reliable blocked-popup
    // signal. Clear its opener before it can load any trusted or provider code.
    const target = browser.open('about:blank', '_blank', presentation === 'popup' ? 'popup,width=650,height=820' : undefined);
    if (!target) return fail('popup_blocked', 'The browser blocked the Passport window. Launch from a user click or use getConnectUrl() as a link.');
    try { target.opener = null; target.location.replace(url); }
    catch { try { target.close(); } catch {} return fail('navigation_failed', 'The Passport window could not be opened safely.'); }

    let interval, timeout, settled = false;
    let abortListener;
    const lifecycle = new Promise((resolve, reject) => {
      const finish = (reason) => {
        if (settled) return;
        settled = true;
        browser.clearInterval(interval); browser.clearTimeout(timeout);
        if (abortListener) signal?.removeEventListener('abort', abortListener);
        if (reason === 'closed') resolve(Object.freeze({ reason, verification: 'unknown' }));
        else reject(new PassportConnectError(reason, reason === 'timeout' ? 'The SDK stopped waiting. The Passport window may still be open; account verification is unknown.' : 'The SDK stopped waiting because the request was canceled. Account verification is unknown.'));
      };
      interval = browser.setInterval(() => { try { if (target.closed) finish('closed'); } catch { /* COOP may sever the handle; no identity is inferred. */ } }, 300);
      timeout = browser.setTimeout(() => finish('timeout'), timeoutMs);
      abortListener = () => finish('aborted');
      signal?.addEventListener('abort', abortListener, { once: true });
      // Close a race between the initial abort check and listener attachment.
      if (signal?.aborted) abortListener();
    });
    return Object.freeze({ url, lifecycle });
  }

  function mountButton(container, settings = {}) {
    if (!container?.ownerDocument?.createElement || !container.appendChild) return fail('invalid_container', 'Provide a DOM element for the Passport button.');
    const { label = 'Connect Passport', onLaunch, onError, ...parameters } = settings;
    // Validate before mounting so a broken integration does not render an inert control.
    getConnectUrl(parameters);
    const button = container.ownerDocument.createElement('button');
    button.type = 'button'; button.textContent = String(label);
    const click = () => {
      try {
        const connection = launch(parameters);
        // Always observe the promise to avoid an unhandled rejection when a
        // developer intentionally only needs the launch UI.
        connection.lifecycle.catch(error => { onError?.(error); });
        onLaunch?.(connection);
      } catch (error) { onError?.(error); }
    };
    button.addEventListener('click', click); container.appendChild(button);
    return Object.freeze({ button, destroy() { button.removeEventListener('click', click); button.remove(); } });
  }

  async function signIn() {
    return fail('idp_not_configured', 'This package links accounts; it does not authenticate third-party apps. A registered, standards-compliant OIDC provider and relying-party flow are required.');
  }
  return Object.freeze({ origin, capabilities: CAPABILITIES, getConnectUrl, launch, mountButton, signIn });
}
