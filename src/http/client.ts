import {
  YTMusicAuthError,
  YTMusicNetworkError,
  YTMusicParseError,
  YTMusicServerError,
} from "../errors.js";
import type { JsonDict } from "../types.js";
import { RequestDeduplicator } from "./deduplication.js";
import { computeBackoff, isRetryableStatus } from "./retry.js";

export interface HttpClientConfig {
  timeout?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
  headerProvider?: () => Promise<Record<string, string>>;
}

export class HttpClient {
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;
  private readonly headerProvider?: () => Promise<Record<string, string>>;
  private readonly deduplicator = new RequestDeduplicator();

  constructor(config: HttpClientConfig = {}) {
    this.timeout = config.timeout ?? 30_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelay = config.retryBaseDelay ?? 1000;
    this.headerProvider = config.headerProvider;
  }

  async post(url: string, body: JsonDict, extraHeaders?: Record<string, string>): Promise<JsonDict> {
    const jsonBody = JSON.stringify(body);
    const headers = await this.buildHeaders(extraHeaders);
    headers["content-type"] = "application/json";

    return this.executeWithRetry(url, {
      method: "POST",
      headers,
      body: jsonBody,
    });
  }

  async get(url: string, extraHeaders?: Record<string, string>): Promise<JsonDict> {
    const headers = await this.buildHeaders(extraHeaders);
    return this.executeWithRetry(url, {
      method: "GET",
      headers,
    });
  }

  private async buildHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
    const base = this.headerProvider ? await this.headerProvider() : {};
    return extra ? { ...base, ...extra } : { ...base };
  }

  private async executeWithRetry(url: string, init: RequestInit): Promise<JsonDict> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await this.deduplicator.execute(
          url,
          init.body as string | undefined,
          () => fetch(url, { ...init, signal: controller.signal }),
        );

        if (response.status === 401 || response.status === 403) {
          const reason = response.status === 401 ? "expired" : "invalid";
          throw new YTMusicAuthError(
            `Authentication failed with status ${response.status}`,
            reason,
          );
        }

        if (response.status >= 400) {
          if (isRetryableStatus(response.status) && attempt < this.maxRetries) {
            const delay = computeBackoff(attempt, this.retryBaseDelay);
            await this.sleep(delay);
            continue;
          }
          throw new YTMusicServerError(
            `Server returned HTTP ${response.status}`,
            response.status,
          );
        }

        try {
          return await response.json();
        } catch {
          throw new YTMusicParseError("Failed to parse response as JSON");
        }
      } catch (error) {
        if (
          error instanceof YTMusicAuthError ||
          error instanceof YTMusicServerError ||
          error instanceof YTMusicParseError
        ) {
          throw error;
        }

        lastError = error as Error;

        if (attempt < this.maxRetries) {
          const delay = computeBackoff(attempt, this.retryBaseDelay);
          await this.sleep(delay);
          continue;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw new YTMusicNetworkError(
      `Network request failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
      this.maxRetries + 1,
      null,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
