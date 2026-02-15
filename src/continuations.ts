import { nav } from "./navigation.js";
import type { JsonDict, JsonList, ParseFunc, RequestFunc, RequestFuncBody } from "./types.js";

const CONTINUATION_TOKEN = [
  "continuationItemRenderer",
  "continuationEndpoint",
  "continuationCommand",
  "token",
] as const;

const CONTINUATION_ITEMS = [
  "onResponseReceivedActions",
  0,
  "appendContinuationItemsAction",
  "continuationItems",
] as const;

export function getContinuationToken(results: JsonList): string | null {
  return nav<string>(results[results.length - 1], CONTINUATION_TOKEN, true) ?? null;
}

export async function getContinuations2025(
  results: JsonDict,
  limit: number | null,
  requestFunc: RequestFuncBody,
  parseFunc: ParseFunc,
): Promise<JsonList> {
  const items: JsonList = [];
  let continuationToken = getContinuationToken(results["contents"]);
  while (continuationToken && (limit === null || items.length < limit)) {
    const response = await requestFunc({ continuation: continuationToken });
    const continuationItems = nav<JsonList>(response, CONTINUATION_ITEMS, true);
    if (!continuationItems) break;

    const contents = parseFunc(continuationItems);
    if (contents.length === 0) break;
    items.push(...contents);
    continuationToken = getContinuationToken(continuationItems);
  }
  return items;
}

export async function getReloadableContinuations(
  results: JsonDict,
  continuationType: string,
  limit: number | null,
  requestFunc: RequestFunc,
  parseFunc: ParseFunc,
): Promise<JsonList> {
  const additionalParams = getReloadableContinuationParams(results);
  return getContinuations(results, continuationType, limit, requestFunc, parseFunc, "", additionalParams);
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
