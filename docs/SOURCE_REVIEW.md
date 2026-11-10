# SDK source and credential review

The source in this package was written specifically for the Leeloo Multipass browser launcher. It does not copy server adapters, game source, existing UI assets, provider SDK internals, icons or license-restricted media. The original source is licensed under MIT.

The package has no runtime dependencies, environment-variable reads, configured private hosts, personal account defaults, credentials, signing keys, token stores, fetch calls or `postMessage` listeners. Its configured origin is supplied by the integrating application. Documentation uses reserved `.example` domains; public standards URLs are references only.

The SDK returns an encoded launch URL and a browser-lifecycle promise. Closing a popup always yields `verification: 'unknown'`. No lifecycle event or incoming message can authenticate a user. The unavailable IdP method rejects explicitly.

Prepublication checks:

```sh
npm test
npm run check
npm pack --dry-run
```

Review every file listed in the package manifest before switching off `private`. Confirm the final repository name, package namespace, release version and maintainer details. A successful source scan does not replace protocol conformance or a security review of an eventual IdP, signer or encrypted vault.
