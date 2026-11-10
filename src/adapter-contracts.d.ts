/** Server-side extension contracts. These types do not authenticate a caller. */
export type ConnectionStatus = 'saved' | 'pending' | 'verified' | 'revoked';
export interface ConnectionRecord {
  readonly id: string;
  readonly passportAccountId: string;
  readonly protocol: string;
  readonly providerOrigin: string;
  readonly subject: string | null;
  readonly displayAddress: string;
  readonly profileUrl: string;
  readonly status: ConnectionStatus;
  readonly method: string | null;
  readonly verifiedAt: string | null;
  readonly grantedScopes: readonly string[];
}
export interface AdapterCapability {
  readonly id: string;
  readonly protocol: string;
  readonly available: boolean;
  readonly methods: readonly string[];
  readonly scopes: readonly string[];
  readonly requirements: readonly string[];
}
/** IDs refer to records in a server-owned state store, never browser token blobs. */
export interface ServerLinkContext {
  readonly passportAccountId: string;
  readonly browserSessionId: string;
  readonly requestId: string;
  readonly signal?: AbortSignal;
}
export interface ConnectionInput {
  readonly providerOrigin: string;
  readonly address: string;
  readonly requestedScopes: readonly string[];
}
export type AuthorizationStart =
  | Readonly<{ method: 'redirect'; flowId: string; authorizationUrl: string; expiresAt: string }>
  | Readonly<{ method: 'profile-proof'; flowId: string; profileUrl: string; publicCode: string; expiresAt: string }>
  | Readonly<{ method: 'signer-proof'; flowId: string; challenge: string; audience: string; expiresAt: string }>;
/** Provider data is untrusted until complete() performs protocol verification. */
export interface ProviderResponse {
  readonly flowId: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}
export interface VerifiedProviderSubject {
  readonly protocol: string;
  readonly providerOrigin: string;
  readonly subject: string;
  readonly displayAddress: string;
  readonly profileUrl: string;
  readonly verifiedAt: string;
  readonly proofMethod: string;
  readonly grantedScopes: readonly string[];
}
export interface ProviderAdapter {
  readonly capability: AdapterCapability;
  begin(context: ServerLinkContext, input: ConnectionInput): Promise<AuthorizationStart>;
  complete(context: ServerLinkContext, response: ProviderResponse): Promise<VerifiedProviderSubject>;
  revoke?(context: ServerLinkContext, connectionId: string): Promise<void>;
}
