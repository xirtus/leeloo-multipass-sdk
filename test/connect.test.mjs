import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPassportConnect, PassportConnectError, CAPABILITIES, getCapability } from '../src/index.js';

function browserFixture({ blocked = false, openerFails = false, navigationFails = false } = {}) {
  const intervals = new Map(), timeouts = new Map(); let serial = 0;
  const navigations = [], opens = [];
  const target = { closed: false, _opener: { app: true },
    set opener(value) { if (openerFails) throw Error('opener inaccessible'); this._opener = value; },
    get opener() { return this._opener; },
    location: { replace(url) { if (navigationFails) throw Error('navigation failed'); assert.equal(target.opener, null, 'opener is cleared before navigation'); navigations.push(url); } },
    close() { this.closed = true; },
  };
  return {
    target, navigations, opens, intervals, timeouts,
    browser: {
      open(...args) { opens.push(args); return blocked ? null : target; },
      setInterval(fn) { const id = ++serial; intervals.set(id, fn); return id; }, clearInterval(id) { intervals.delete(id); },
      setTimeout(fn) { const id = ++serial; timeouts.set(id, fn); return id; }, clearTimeout(id) { timeouts.delete(id); },
    },
    tick() { for (const fn of [...intervals.values()]) fn(); },
    timeout() { for (const fn of [...timeouts.values()]) fn(); },
  };
}
const origin = 'https://passport.example';

test('trusted origin validation rejects credentials, paths, query and insecure hosts', () => {
  for (const value of [undefined, '', 'javascript:alert(1)', 'http://passport.example', 'https://user:pass@passport.example', origin + '/other', origin + '?return=https://evil.example', origin + '#token']) {
    assert.throws(() => createPassportConnect({ origin: value }), error => error.code === 'invalid_origin');
  }
  assert.equal(createPassportConnect({ origin }).origin, origin);
  assert.throws(() => createPassportConnect({ origin: 'http://localhost:8787' }));
  assert.equal(createPassportConnect({ origin: 'http://localhost:8787', allowLoopbackHttp: true }).origin, 'http://localhost:8787');
  assert.throws(() => createPassportConnect({ origin: 'http://localhost.evil.example', allowLoopbackHttp: true }));
});

test('configured connection path cannot redirect to another origin or normalize dot segments', () => {
  for (const path of ['https://evil.example', '//evil.example', '/a/../b', '/connect?redirect=evil', '/connect#token', '/a\\b', '/space here']) {
    assert.throws(() => createPassportConnect({ origin, connectPath: path }), error => error.code === 'invalid_path');
  }
  assert.equal(createPassportConnect({ origin, connectPath: '/passport/connect' }).getConnectUrl(), origin + '/passport/connect');
});

test('public addresses are encoded as data and cannot inject query parameters or start automatic consent', () => {
  const sdk = createPassportConnect({ origin });
  const url = new URL(sdk.getConnectUrl({ provider: 'fediverse', address: '@alice:example.org&return=https://evil.example' }));
  assert.equal(url.origin, origin);
  assert.equal(url.searchParams.get('address'), '@alice:example.org&return=https://evil.example');
  assert.equal(url.searchParams.get('return'), null); assert.equal(url.searchParams.get('connect'), null);
  assert.equal(url.searchParams.get('provider'), 'fediverse');
  assert.throws(() => sdk.getConnectUrl({ address: 'a'.repeat(513) }), error => error.code === 'invalid_address');
  assert.throws(() => sdk.getConnectUrl({ address: 'alice\nSet-Cookie: bad' }), error => error.code === 'invalid_address');
  assert.throws(() => sdk.getConnectUrl({ provider: 'nostr' }), error => error.code === 'capability_unavailable');
});

test('popup opening is synchronous, clears opener, and returns no verified identity', async () => {
  const fixture = browserFixture(); const sdk = createPassportConnect({ origin, browser: fixture.browser });
  const result = sdk.launch({ provider: 'bluesky', address: 'alice.example.social', presentation: 'popup' });
  assert.equal(fixture.opens.length, 1); assert.equal(fixture.opens[0][0], 'about:blank'); assert.match(fixture.opens[0][2], /popup/);
  assert.equal(fixture.navigations[0], result.url); assert.equal(fixture.target.opener, null);
  assert.equal('token' in result, false); assert.equal('identity' in result, false);
  fixture.target.closed = true; fixture.tick();
  assert.deepEqual(await result.lifecycle, { reason: 'closed', verification: 'unknown' });
  assert.equal(fixture.intervals.size, 0); assert.equal(fixture.timeouts.size, 0);
});

test('blocked, unsafe navigation and non-browser environments fail explicitly', () => {
  const blocked = browserFixture({ blocked: true });
  assert.throws(() => createPassportConnect({ origin, browser: blocked.browser }).launch(), error => error.code === 'popup_blocked');
  for (const option of [{ openerFails: true }, { navigationFails: true }]) {
    const fixture = browserFixture(option);
    assert.throws(() => createPassportConnect({ origin, browser: fixture.browser }).launch(), error => error.code === 'navigation_failed');
    assert.equal(fixture.target.closed, true);
  }
  assert.throws(() => createPassportConnect({ origin, browser: {} }).launch(), error => error.code === 'browser_unavailable');
});

test('timeout and abort stop observation without pretending a provider session was revoked', async () => {
  const timed = browserFixture(); const launch = createPassportConnect({ origin, browser: timed.browser }).launch({ timeoutMs: 1000 });
  timed.timeout(); await assert.rejects(launch.lifecycle, error => error.code === 'timeout');
  assert.equal(timed.target.closed, false); assert.equal(timed.intervals.size, 0);
  const fixture = browserFixture(); const abort = new AbortController();
  const attempt = createPassportConnect({ origin, browser: fixture.browser }).launch({ signal: abort.signal });
  abort.abort(); await assert.rejects(attempt.lifecycle, error => error.code === 'aborted');
  assert.equal(fixture.target.closed, false); assert.equal(fixture.intervals.size, 0); assert.equal(fixture.timeouts.size, 0);
  assert.throws(() => createPassportConnect({ origin, browser: fixture.browser }).launch({ signal: abort.signal }), error => error.code === 'aborted');
  assert.throws(() => createPassportConnect({ origin, browser: fixture.browser }).launch({ timeoutMs: Infinity }), error => error.code === 'invalid_timeout');
});

test('capability registry distinguishes real adapters from planned native protocols and unavailable IdP', async () => {
  assert.equal(getCapability('activitypub').method, 'profile-proof');
  assert.equal(getCapability('profile-reference').purpose, 'save-address');
  for (const id of ['miauth', 'nostr', 'indieauth']) assert.equal(getCapability(id).status, 'planned');
  assert.equal(getCapability('oidc-idp').status, 'unavailable');
  assert.throws(() => { CAPABILITIES[0].status = 'unavailable'; });
  await assert.rejects(createPassportConnect({ origin }).signIn(), error => error instanceof PassportConnectError && error.code === 'idp_not_configured');
});

test('button renders caller text safely and removes event handlers on destroy', async () => {
  let listener, removed = false, appended;
  const button = { addEventListener(type, fn) { assert.equal(type, 'click'); listener = fn; }, removeEventListener(type, fn) { assert.equal(listener, fn); listener = undefined; }, remove() { removed = true; } };
  const container = { ownerDocument: { createElement: tag => { assert.equal(tag, 'button'); return button; } }, appendChild(value) { appended = value; } };
  const fixture = browserFixture(); const sdk = createPassportConnect({ origin, browser: fixture.browser }); let observed;
  const control = sdk.mountButton(container, { label: '<img onerror=alert(1)>', onLaunch(result) { observed = result; } });
  assert.equal(button.type, 'button'); assert.equal(button.textContent, '<img onerror=alert(1)>'); assert.equal('innerHTML' in button, false); assert.equal(appended, button);
  listener(); fixture.target.closed = true; fixture.tick(); await observed.lifecycle;
  control.destroy(); assert.equal(listener, undefined); assert.equal(removed, true);
});
