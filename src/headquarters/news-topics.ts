export const newsTopics = {
  us: {
    label: "US politics",
    query:
      "(Congress OR election OR politics OR WhiteHouse) (from:AP OR from:Reuters OR from:FoxNews OR from:MSNBC OR from:politico)",
    feeds: [
      ["NPR Politics", "https://feeds.npr.org/1014/rss.xml"],
      [
        "Fox News Politics",
        "https://moxie.foxnews.com/google-publisher/politics.xml",
      ],
      [
        "BBC US & Canada",
        "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
      ],
    ],
  },
  whitehouse: {
    label: "White House",
    query:
      '(from:WhiteHouse OR from:POTUS OR from:PressSec) OR (("White House" OR president) (from:AP OR from:Reuters OR from:FoxNews OR from:MSNBC))',
    feeds: [
      ["NPR Politics", "https://feeds.npr.org/1014/rss.xml"],
      [
        "Fox News Politics",
        "https://moxie.foxnews.com/google-publisher/politics.xml",
      ],
    ],
    filter: "white house|president|trump|administration",
  },
  middleeast: {
    label: "Middle East",
    query:
      "(Gaza OR Israel OR Palestine OR Iran OR Lebanon OR Syria OR Yemen) (from:AJEnglish OR from:Reuters OR from:AP OR from:TimesofIsrael OR from:AlArabiya_Eng)",
    feeds: [
      ["Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"],
      [
        "BBC Middle East",
        "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
      ],
      ["The Times of Israel", "https://www.timesofisrael.com/feed/"],
    ],
    filter:
      "gaza|israel|palestin|iran|leban|syria|yemen|middle east|saudi|qatar|iraq",
  },
  africa: {
    label: "Africa",
    query:
      "(Africa OR Sudan OR Congo OR Ethiopia OR Somalia OR Sahel) (from:BBCAfrica OR from:africanews OR from:AJEnglish OR from:Reuters OR from:AP)",
    feeds: [
      ["BBC Africa", "https://feeds.bbci.co.uk/news/world/africa/rss.xml"],
      [
        "AllAfrica",
        "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf",
      ],
      ["Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"],
    ],
    filter:
      "africa|sudan|congo|ethiop|somali|sahel|kenya|nigeria|egypt|libya|mali|senegal|uganda|rwanda|zambia|zimbabwe|tunisia|algeria|morocco",
  },
  history: {
    label: "History & war",
    query:
      '("military history" OR "world war" OR "on this day") (from:I_W_M OR from:USNatArchives OR from:HistoryExtra OR from:smithsonian)',
    feeds: [
      [
        "Smithsonian History",
        "https://www.smithsonianmag.com/rss/history_philosophy/",
      ],
    ],
  },
} as const;
export type NewsTopic = keyof typeof newsTopics;
export type BriefItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  kind: string;
};
export function interleaveSources(groups: BriefItem[][]) {
  const result: BriefItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++)
    for (const group of groups) {
      const item = group[i];
      if (item && !seen.has(item.url)) {
        seen.add(item.url);
        result.push(item);
      }
    }
  return result.slice(0, 18);
}
