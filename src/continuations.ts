import { nav } from "./navigation.js";
import type { JsonDict, JsonList, ParseFunc, RequestFunc } from "./types.js";

const CONTINUATION_TOKEN = [
  "continuationItemRenderer",
  "continuationEndpoint",
  "continuationCommand",
  "token",
] as const;

export function getContinuationToken(results: JsonList): string | null {
  return nav<string>(results[results.length - 1], CONTINUATION_TOKEN, true) ?? null;
}

export function getContinuations(
  results: JsonDict,
  continuationType: string,
  limit: number | null,
  requestFunc: RequestFunc,
  parseFunc: ParseFunc,
  ctokenPath = "",
  additionalParams?: string,
): Promise<JsonList> {
  return getContinuationsAsync(
    results,
    continuationType,
    limit,
    requestFunc,
    parseFunc,
    ctokenPath,
    additionalParams,
  );
}

async function getContinuationsAsync(
  results: JsonDict,
  continuationType: string,
  limit: number | null,
  requestFunc: RequestFunc,
  parseFunc: ParseFunc,
  ctokenPath: string,
  additionalParams?: string,
): Promise<JsonList> {
  const items: JsonList = [];
  let current = results;
  let isFirstIteration = true;
  while ("continuations" in current && (limit === null || items.length < limit)) {
    const params = (isFirstIteration && additionalParams) ? additionalParams : getContinuationParams(current, ctokenPath);
    isFirstIteration = false;
    const response = await requestFunc(params);
    if ("continuationContents" in response) {
      current = response["continuationContents"][continuationType];
    } else {
      break;
    }
    const contents = getContinuationContents(current, parseFunc);
    if (contents.length === 0) break;
    items.push(...contents);
  }
  return items;
}

export function getContinuationParams(results: JsonDict, ctokenPath = ""): string {
  const ctoken = nav<string>(results, [
    "continuations",
    0,
    "next" + ctokenPath + "ContinuationData",
    "continuation",
  ]);
  return getContinuationString(ctoken);
}

export function getReloadableContinuationParams(results: JsonDict): string {
  const ctoken = nav<string>(results, [
    "continuations",
    0,
    "reloadContinuationData",
    "continuation",
  ]);
  return getContinuationString(ctoken);
}

export function getContinuationString(ctoken: string): string {
  const encoded = encodeURIComponent(ctoken);
  return "&ctoken=" + encoded + "&continuation=" + encoded;
}

export function getContinuationContents(
  continuation: JsonDict,
  parseFunc: ParseFunc,
): JsonList {
  for (const term of ["contents", "items"]) {
    if (term in continuation) {
      return parseFunc(continuation[term]);
    }
  }
  return [];
}
