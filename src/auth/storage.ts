import type { RefreshableTokenDict } from "./oauth/models.js";

/** Consumer-provided interface for persisting OAuth tokens. */
export interface TokenStorage {
  save(token: RefreshableTokenDict): Promise<void>;
  load(): Promise<RefreshableTokenDict | null>;
  clear(): Promise<void>;
}
