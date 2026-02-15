import {
  YTM_BASE_API,
  YTM_PARAMS,
  YTM_PARAMS_KEY,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LOCATIONS,
} from "./constants.js";
import type { SupportedLanguage, SupportedLocation } from "./constants.js";
import { YTMusicError } from "./errors.js";
import { initializeContext, initializeHeaders } from "./helpers.js";
import { HttpClient } from "./http/client.js";
import type { HttpClientConfig } from "./http/client.js";
import { createHeaderProvider } from "./auth/headers.js";
import { AuthType } from "./auth/types.js";
import type { AuthConfig } from "./auth/types.js";
import type { JsonDict } from "./types.js";

export interface YTMusicConfig {
  auth?: AuthConfig;
  language?: SupportedLanguage;
  location?: SupportedLocation;
  user?: string;
  http?: HttpClientConfig;
}

export class YTMusic {
  readonly context: JsonDict;
  readonly language: string;
  readonly auth: AuthConfig;
  private readonly httpClient: HttpClient;
  private readonly params: string;
  private readonly cookies: Record<string, string> = { SOCS: "CAI" };

  constructor(config: YTMusicConfig = {}) {
    const { auth, language, location, user, http } = config;

    // Validate language
    const lang = language ?? "en";
    if (!SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      throw new YTMusicError(
        `Language not supported. Supported languages are ${SUPPORTED_LANGUAGES.join(", ")}.`,
      );
    }

    // Validate location
    if (location && !SUPPORTED_LOCATIONS.includes(location as SupportedLocation)) {
      throw new YTMusicError("Location not supported. Check the FAQ for supported locations.");
    }

    this.language = lang;
    this.auth = auth ?? { type: AuthType.UNAUTHORIZED };
    this.context = initializeContext(lang, location);

    if (user) {
      this.context.context.user.onBehalfOfUser = user;
    }

    // Set params based on auth type
    this.params = this.auth.type === AuthType.BROWSER
      ? YTM_PARAMS + YTM_PARAMS_KEY
      : YTM_PARAMS;

    // Build header provider and HTTP client
    const baseHeaders = initializeHeaders();
    const headerProvider = createHeaderProvider(this.auth, baseHeaders);

    this.httpClient = new HttpClient({
      ...http,
      headerProvider,
    });
  }

  /** Send a POST request to the YTMusic API. */
  async sendRequest(endpoint: string, body: JsonDict, additionalParams = ""): Promise<JsonDict> {
    const mergedBody = { ...body, ...this.context };
    const url = YTM_BASE_API + endpoint + this.params + additionalParams;
    return this.httpClient.post(url, mergedBody);
  }

  /** Send a GET request. */
  async sendGetRequest(url: string): Promise<JsonDict> {
    return this.httpClient.get(url);
  }

  /** Throws if the client is not authenticated. */
  checkAuth(): void {
    if (this.auth.type === AuthType.UNAUTHORIZED) {
      throw new YTMusicError("Please provide authentication before using this function");
    }
  }
}
