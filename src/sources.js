// REEL Theater official-provider discovery catalog.
// Curated landing pages are NOT direct streams or proof of Xbox Edge compatibility.
// Never turn these links into automatic playback, proxying or third-party media scraping.
export const SOURCES = Object.freeze([
  Object.freeze({
    id: "tubi", name: "Tubi", category: "movies",
    description: "Free, ad-supported movies and television from the official service.",
    url: "https://tubitv.com/welcome",
    verifiedFrom: "https://tubitv.com/welcome",
    xbox: "Xbox app listed by provider", price: "Free · ads",
    label: "Official streaming service"
  }),
  Object.freeze({
    id: "pluto", name: "Pluto TV", category: "live",
    description: "Official free live channels and on-demand shows; availability varies by region.",
    url: "https://pluto.tv/",
    verifiedFrom: "https://pluto.tv/where-to-watch",
    xbox: "Xbox Edge not tested", price: "Free · ads",
    label: "Official streaming service"
  }),
  Object.freeze({
    id: "plex", name: "Plex Free", category: "live",
    description: "Free ad-supported live channels and movies from Plex.",
    url: "https://watch.plex.tv/",
    verifiedFrom: "https://support.plex.tv/articles/free-live-tv-streaming-overview/",
    xbox: "Xbox app listed by provider", price: "Free · ads",
    label: "Official streaming service"
  }),
  Object.freeze({
    id: "pbs", name: "PBS", category: "documentary",
    description: "Free episodes and documentaries from PBS; some content requires Passport.",
    url: "https://www.pbs.org/",
    verifiedFrom: "https://help.pbs.org/support/solutions/articles/12000090583-how-to-watch-pbs-without-cable",
    xbox: "Xbox Edge not tested", price: "Free episodes",
    label: "Official broadcaster"
  }),
  Object.freeze({
    id: "nasa", name: "NASA+", category: "documentary",
    description: "NASA's free, ad-free science documentaries, missions and coverage.",
    url: "https://www.nasa.gov/ways-to-watch/",
    verifiedFrom: "https://www.nasa.gov/ways-to-watch/",
    xbox: "Xbox Edge not tested", price: "Free · no ads",
    label: "Official public service"
  }),
  Object.freeze({
    id: "reel", name: "REEL Commons", category: "guides",
    description: "Our open-source directory of legitimate free streaming destinations.",
    url: "https://github.com/MichaelWave369/ReelCommons",
    verifiedFrom: "https://github.com/MichaelWave369/ReelCommons",
    xbox: "Opens project page", price: "Open source",
    label: "Directory · not a direct stream"
  })
]);

export const SOURCE_CATEGORIES = Object.freeze([
  {id: "all", label: "All sources"},
  {id: "movies", label: "Movies"},
  {id: "live", label: "Live TV"},
  {id: "documentary", label: "Documentaries"},
  {id: "guides", label: "Guides"}
]);

export function findSources({query = "", category = "all", favoritesOnly = false, favorites = []} = {}) {
  const q = String(query).trim().toLocaleLowerCase();
  const fav = new Set(favorites);
  return SOURCES.filter(source =>
    (category === "all" || source.category === category) &&
    (!favoritesOnly || fav.has(source.id)) &&
    (!q || (source.name + " " + source.description + " " + source.price).toLocaleLowerCase().includes(q))
  );
}

export function validSourceIds(value) {
  const allowed = new Set(SOURCES.map(source => source.id));
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === "string" && allowed.has(id)))].slice(0, SOURCES.length) : [];
}

export function parseFavoriteSourceIds(raw) {
  try { return validSourceIds(JSON.parse(raw || "[]")); } catch { return []; }
}

export function isOfficialSource(source) {
  if (!source || !/^[a-z0-9-]{1,32}$/.test(source.id) || !source.verifiedFrom) return false;
  try {
    const url = new URL(source.url);
    const evidence = new URL(source.verifiedFrom);
    return url.protocol === "https:" && evidence.protocol === "https:" &&
      !url.username && !url.password && !evidence.username && !evidence.password &&
      !["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch { return false; }
}
