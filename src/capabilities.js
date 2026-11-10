// This catalogue describes the current Passport server. It does not attest to
// a particular installation; operators may deploy a subset of these methods.
const entries = [
  { id: 'bluesky', provider: 'bluesky', status: 'available', protocol: 'AT Protocol', method: 'oauth', purpose: 'link-account', requirement: 'User authorizes the expected DID through the provider.' },
  { id: 'mastodon', provider: 'mastodon', status: 'available', protocol: 'ActivityPub', method: 'oauth', purpose: 'link-account', requirement: 'Selected instance supports the profile-read OAuth flow.' },
  { id: 'matrix', provider: 'matrix', status: 'available', protocol: 'Matrix', method: 'sso', purpose: 'link-account', requirement: 'Selected homeserver exposes browser SSO.' },
  { id: 'activitypub', provider: 'fediverse', status: 'available', protocol: 'ActivityPub', method: 'profile-proof', purpose: 'link-account', requirement: 'Public WebFinger actor and editable federated profile bio; Threads needs fediverse sharing enabled.' },
  { id: 'profile-reference', provider: 'fediverse', status: 'available', protocol: 'HTTPS', method: 'saved-reference', purpose: 'save-address', requirement: 'Public HTTPS profile URL. Saving it does not prove ownership.' },
  { id: 'miauth', provider: null, status: 'planned', protocol: 'Misskey', method: 'miauth', purpose: 'link-account', requirement: 'Per-instance capability detection and consent. A Matrix session cannot mint a Misskey token.' },
  { id: 'indieauth', provider: null, status: 'planned', protocol: 'IndieAuth', method: 'oauth', purpose: 'link-account', requirement: 'Website advertises and supports IndieAuth discovery and authorization.' },
  { id: 'nostr', provider: null, status: 'planned', protocol: 'Nostr', method: 'public-key-proof', purpose: 'link-account', requirement: 'Explicit signer approval and server-verified, scoped, one-time challenge; never collect private keys.' },
  { id: 'oidc-idp', provider: null, status: 'unavailable', protocol: 'OpenID Connect', method: 'authorization-code-pkce', purpose: 'sign-in', requirement: 'Registered relying parties, maintained OIDC provider, validated issuer/audience/nonce and token lifecycle.' },
  { id: 'profile-sync', provider: null, status: 'planned', protocol: 'Provider APIs', method: 'explicit-opt-in', purpose: 'update-profiles', requirement: 'Separate write consent, per-provider support, preview, revocation and conflict recovery.' },
];
export const CAPABILITIES = Object.freeze(entries.map(entry => Object.freeze(entry)));
export function getCapability(id) { return CAPABILITIES.find(entry => entry.id === id); }
export const LINK_PROVIDERS = Object.freeze(['bluesky', 'mastodon', 'matrix', 'fediverse']);
