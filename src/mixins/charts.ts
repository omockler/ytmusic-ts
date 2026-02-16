import type { YTMusic } from "../ytmusic.js";
import type { JsonDict, JsonList } from "../types.js";
import {
  nav,
  SINGLE_COLUMN_TAB,
  SECTION_LIST,
  MUSIC_SHELF,
  TITLE,
  CAROUSEL_CONTENTS,
  FRAMEWORK_MUTATIONS,
  MTRIR,
  MRLIR,
} from "../navigation.js";
import { parseContentList } from "../parsers/browsing.js";
import { parseChartPlaylist, parseChartArtist } from "../parsers/explore.js";

export async function getCharts(ytmusic: YTMusic, country = "ZZ"): Promise<JsonDict> {
  const body: JsonDict = { browseId: "FEmusic_charts" };
  if (country) {
    body["formData"] = { selectedValues: [country] };
  }

  const response = await ytmusic.sendRequest("browse", body);
  const results = nav<JsonList>(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);
  const charts: JsonDict = { countries: {} };

  const menu = nav(results[0], [
    ...MUSIC_SHELF,
    "subheaders",
    0,
    "musicSideAlignedItemRenderer",
    "startItems",
    0,
    "musicSortFilterButtonRenderer",
  ]);
  charts["countries"]["selected"] = nav(menu, TITLE);
  charts["countries"]["options"] = nav<JsonList>(response, FRAMEWORK_MUTATIONS)
    .map((m) => nav<string>(m, ["payload", "musicFormBooleanChoice", "opaqueToken"], true))
    .filter((token): token is string => token != null);

  type ChartCategory = [string, (data: JsonDict) => JsonDict, string];

  let chartsCategories: ChartCategory[] = [
    ["videos", parseChartPlaylist, MTRIR],
    ...(country === "US" ? [["genres", parseChartPlaylist, MTRIR] as ChartCategory] : []),
    ["artists", parseChartArtist, MRLIR],
  ];

  // Use result length to determine if the daily/weekly chart categories are present
  if (results.length - 1 > chartsCategories.length) {
    chartsCategories = [
      ["daily", parseChartPlaylist, MTRIR],
      ["weekly", parseChartPlaylist, MTRIR],
      ...chartsCategories.slice(1),
    ];
  }

  for (let i = 0; i < chartsCategories.length; i++) {
    const [name, parseFunc, key] = chartsCategories[i];
    charts[name] = parseContentList(
      nav<JsonList>(results[1 + i], CAROUSEL_CONTENTS),
      parseFunc,
      key,
    );
  }

  return charts;
}
