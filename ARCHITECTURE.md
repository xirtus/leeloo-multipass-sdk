# Leeloo Multipass architecture

Leeloo Multipass separates an account-linking Passport, a browser launch SDK, and a future identity provider. A branded product can use these components without making its brand the name of the reusable infrastructure.

## Three boundaries

1. The Passport service verifies and records external account ownership. A saved address is distinct from a verified stamp. Existing server adapters use Bluesky OAuth, Mastodon profile-read OAuth, Matrix browser SSO and ActivityPub public-profile proof.
2. This browser SDK opens the trusted Passport surface. It carries selected provider/address hints and observes browser lifecycle. It receives neither provider tokens nor a verified identity result.
3. A future relying-party sign-in service must use a maintained, standards-compliant OpenID Connect provider and registered applications. Authentication must validate issuer, audience, state, nonce, PKCE, callback URLs and token lifetime; account linking does not substitute for those checks.

Where a Matrix Authentication Service is already deployed, its standard OIDC issuer may provide the authentication foundation. External-network stamps would remain separately consented profile claims or protected API resources. They are not automatically claims in every issued token.

## Corrections to the proposed vault blueprint

Matrix `account_data` is not automatically end-to-end encrypted. An application can store ciphertext there, but it must design client-side encryption, key storage, recovery, rotation, device verification and revocation. See [Matrix account data](https://spec.matrix.org/latest/client-server-api/#client-config). A private room also needs explicit encryption configuration and suitable clients; room membership alone does not encrypt arbitrary secrets.

The current ownership-checking backend can see the temporary credentials it exchanges with providers. Server-side encryption at rest is useful but does not make that exchange an end-to-end encrypted vault. A future client-held vault requires its own threat model and recovery design and should not silently replace the existing token handling.

Nostr `npub`/public keys are public identifiers; `nsec`/private keys are signing authority. Do not derive Nostr private keys from Matrix IDs, collect private keys in embedding applications, or present generic event signing as a harmless login. A [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) browser signer or NIP-46 remote signer must approve a scoped request. The relying service still has to verify the returned signature and one-time challenge.

DIDs identify subjects through a defined method and resolution model. Creating a string named `did:matrix` or `did:leeloo` does not establish an interoperable DID method. Initially retain each provider's authoritative identifier—DID for AT Protocol, Matrix ID for Matrix, actor ID for ActivityPub, public key for Nostr—and map them to a separate immutable Passport account identifier. Follow the [DID Core method model](https://www.w3.org/TR/did-core/) if a distinct method is later proposed.

ActivityPub federation does not supply universal login, and a local Matrix session cannot mint a token for another server. [Misskey MiAuth](https://misskey-hub.net/en/docs/for-developers/api/token/miauth/) still requires the user's authorization on that instance. [IndieAuth](https://indieauth.spec.indieweb.org/) is an identity layer built on OAuth 2.0, rather than an escape from authorization protocols. A destination can accept Leeloo sign-in only after its operator integrates a compatible provider.

## Profile synchronization

A verification stamp should never imply profile-write permission. Profile sync needs separate opt-in scopes, a preview of the exact changed fields, explicit destination selection, retries without duplicate writes, provider-specific limits, conflict resolution and independent revocation. Provider APIs may not expose equivalent profile editing. No profile-sync webhook or remote-profile write is implemented in this SDK.

## Repository split

Keep the reusable server/adapters and the browser SDK in separate repositories when release ownership warrants it. Keep a branded application and its deployment configuration separate again. The SDK repository can consist only of this package directory; it has no game database, purchased assets, host credentials or local workspace dependencies.

Choose one canonical upstream and use the other forge as a mirror unless there is an explicit process for reconciling competing histories. Preserve a protected baseline, route contributions to a development branch, and promote reviewed changes through pull/merge requests. Repository names and package namespaces require availability checks; source licenses and package metadata must be reviewed before publication.

## Next engineering milestones

- Publish a server capability endpoint whose schema distinguishes available, instance-dependent and planned adapters. Bind server responses to the trusted configured issuer; do not treat the local SDK catalogue as a deployment attestation.
- Add MiAuth and IndieAuth as separate adapters with protocol-specific tests, consent and revocation behavior.
- Add a Nostr public-key proof using a maintained signature verifier and a scoped, single-use challenge; keep signing keys in the user's chosen signer.
- Integrate a maintained OIDC provider and a relying-party conformance suite before enabling a Sign in with Leeloo button.
- Design any encrypted vault as a separate component, with recovery and device compromise included from the start.
