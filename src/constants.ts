export const YTM_DOMAIN = "https://music.youtube.com";
export const YTM_BASE_API = YTM_DOMAIN + "/youtubei/v1/";
export const YTM_PARAMS = "?alt=json";
// Public YouTube Music web client API key, embedded in the YouTube Music web app.
// This is not a private credential — it is the same key used by the browser client.
export const YTM_PARAMS_KEY = "&key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0";

export const OAUTH_SCOPE = "https://www.googleapis.com/auth/youtube";
export const OAUTH_CODE_URL = "https://www.youtube.com/o/oauth2/device/code";
export const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_USER_AGENT = USER_AGENT + " Cobalt/Version";

export const SUPPORTED_LANGUAGES = [
  "ar", "cs", "de", "en", "es", "fr", "hi", "it", "ja", "ko", "nl", "pt",
  "ru", "tr", "ur", "zh_CN", "zh_TW",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SUPPORTED_LOCATIONS = [
  "AE", "AR", "AT", "AU", "AZ", "BA", "BD", "BE", "BG", "BH", "BO", "BR",
  "BY", "CA", "CH", "CL", "CO", "CR", "CY", "CZ", "DE", "DK", "DO", "DZ",
  "EC", "EE", "EG", "ES", "FI", "FR", "GB", "GE", "GH", "GR", "GT", "HK",
  "HN", "HR", "HU", "ID", "IE", "IL", "IN", "IQ", "IS", "IT", "JM", "JO",
  "JP", "KE", "KH", "KR", "KW", "KZ", "LA", "LB", "LI", "LK", "LT", "LU",
  "LV", "LY", "MA", "ME", "MK", "MT", "MX", "MY", "NG", "NI", "NL", "NO",
  "NP", "NZ", "OM", "PA", "PE", "PG", "PH", "PK", "PL", "PR", "PT", "PY",
  "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "SN", "SV", "TH",
  "TN", "TR", "TW", "TZ", "UA", "UG", "US", "UY", "VE", "VN", "YE", "ZA",
  "ZW",
] as const;

export type SupportedLocation = (typeof SUPPORTED_LOCATIONS)[number];
