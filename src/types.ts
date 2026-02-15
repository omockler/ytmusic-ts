export type JsonDict = Record<string, any>;
export type JsonList = JsonDict[];

export type RequestFunc = (endpoint: string) => Promise<JsonDict>;
export type RequestFuncBody = (body: JsonDict) => Promise<JsonDict>;
export type ParseFunc = (items: JsonList) => JsonList;
export type ParseFuncDict = (item: JsonDict) => JsonDict;
