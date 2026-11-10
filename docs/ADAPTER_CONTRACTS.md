# Provider adapter contracts

A reusable Passport core needs a stable connection model and provider-specific implementations. This is a proposed contract for the server extract; the browser SDK does not implement these server operations.

## Connection record

Store an immutable local account ID and a separate record for every external identity:

```ts
interface Connection {
  id: string;
  passportAccountId: string;
  protocol: string;
  providerOrigin: string;
  subject: string | null;       // authoritative DID, actor ID, account ID, MXID or public key
  displayAddress: string;       // mutable human-readable hint
  profileUrl: string;
  status: 'saved' | 'pending' | 'verified' | 'revoked';
  method: string | null;
  verifiedAt: string | null;
  grantedScopes: string[];
}
```

Saving a reference records no proof. Changing a display handle must not create a new identity when the stable provider subject remains the same. Unique verified-subject bindings and account-linking conflict policy belong to the server, not the SDK.

## Authorization operations

An adapter should expose capability discovery, begin, complete, revoke and refresh only where the provider supports them. Every begin operation is tied to the existing signed-in Passport account and browser session. State is unpredictable, time-limited, single-use and bound to the expected provider/account. Completion resolves the provider's authoritative subject before writing a stamp.

Never expose a universal `translateMatrixSessionToToken()` operation. It is not a capability supplied by these protocols.

| Adapter | Proof contract | Authorization boundary |
| --- | --- | --- |
| AT Protocol | OAuth/PKCE/DPoP with DID and issuer validation | Use a maintained AT Protocol OAuth client; display handle is not the subject |
| Mastodon-compatible | OAuth profile-read token and verified local account ID | Instance discovery, redirect validation, approved scopes and revocation |
| Matrix | Browser SSO or a reviewed Matrix assertion flow, checked against expected MXID | Homeserver authority, safe discovery and proof ownership |
| ActivityPub | WebFinger actor binding plus one-time public profile code | Discovery alone proves no ownership; signed fetch may be required |
| MiAuth | One-time instance session checked only after consent; authoritative local account ID | Detect support per instance and document its token revocation mechanism |
| IndieAuth | Discovery and authorization bound to the claimed website URL | Validate the returned `me`, issuer/discovery endpoints, redirect and PKCE |
| Nostr | Verified signature over a one-time, origin/audience-bound challenge with short expiry | NIP-07/NIP-46 approval; never ask for `nsec` |

Generic public fetches must prevent SSRF through actual socket DNS resolution, redirects, literal/private addresses, oversized responses and timeouts. Credential-bearing requests must not follow uncontrolled redirects. Never log callback authorization codes, tokens, cookies or private signing material.

## Claims for relying applications

A future IdP should release the minimum requested identity claims under explicit consent, using an existing OIDC implementation. An external profile stamp is an assertion about an ownership check at a recorded time. It does not grant the relying application posting permission, room membership, payment authority or moderation rights on that network.

Use separate scopes and audiences for Passport profile claims and remote API access. Audience-specific subjects can limit unnecessary correlation between unrelated applications. Add logout, revocation, subject deletion and recovery behavior before describing the service as a universal identity layer.

The package exports matching TypeScript extension interfaces from `src/adapter-contracts.d.ts`. They describe the server boundary; they are not a verifier or a browser assertion format. Implementations must authenticate the local session, enforce the protocol and consume stored flow state before constructing a verified subject. Type checking alone proves none of those properties.
