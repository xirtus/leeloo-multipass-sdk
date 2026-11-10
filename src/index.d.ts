export type LinkProvider = 'bluesky' | 'mastodon' | 'matrix' | 'fediverse';
export interface Capability {
  readonly id: string;
  readonly provider: LinkProvider | null;
  readonly status: 'available' | 'planned' | 'unavailable';
  readonly protocol: string;
  readonly method: string;
  readonly purpose: 'link-account' | 'save-address' | 'sign-in' | 'update-profiles';
  readonly requirement: string;
}
export declare const CAPABILITIES: readonly Capability[];
export declare function getCapability(id: string): Capability | undefined;
export declare class PassportConnectError extends Error { readonly code: string; constructor(code: string, message: string); }
export interface ConnectParameters { provider?: LinkProvider; address?: string; }
export interface LaunchParameters extends ConnectParameters { presentation?: 'tab' | 'popup'; timeoutMs?: number; signal?: AbortSignal; }
export interface ConnectionLaunch {
  readonly url: string;
  readonly lifecycle: Promise<Readonly<{ reason: 'closed'; verification: 'unknown' }>>;
}
export interface ButtonSettings extends LaunchParameters {
  label?: string;
  onLaunch?: (connection: ConnectionLaunch) => void;
  onError?: (error: PassportConnectError) => void;
}
export interface PassportConnect {
  readonly origin: string;
  readonly capabilities: readonly Capability[];
  getConnectUrl(parameters?: ConnectParameters): string;
  launch(parameters?: LaunchParameters): ConnectionLaunch;
  mountButton(container: HTMLElement, settings?: ButtonSettings): Readonly<{ button: HTMLButtonElement; destroy(): void }>;
  signIn(): Promise<never>;
}
export declare function createPassportConnect(options: {
  origin: string;
  connectPath?: string;
  allowLoopbackHttp?: boolean;
  browser?: Window;
}): PassportConnect;
export type { ConnectionStatus, ConnectionRecord, AdapterCapability, ServerLinkContext, ConnectionInput, AuthorizationStart, ProviderResponse, VerifiedProviderSubject, ProviderAdapter } from './adapter-contracts.js';
