// REEL Portable Setup V1: explicit local backup/import, no accounts or network.
// Only curated favorite IDs, curated click-history IDs, and display preference.
// Field Lab notes, media files/progress, personal URLs and diagnostics are excluded.
import {validSourceIds,SOURCES} from "./sources.js";
import {validGameFavoriteIds,GAMES} from "./games.js";
import {validRecents} from "./quicklaunch.js";
import {UI_MODES} from "./platform.js";

export const PORTABLE_SCHEMA="REEL_PORTABLE_SETUP_V1";
export const PORTABLE_MAX_BYTES=8192;
const MODE_IDS=new Set(UI_MODES.map(m=>m.id));

function isRecord(value) {
  return value!==null && typeof value==="object" && !Array.isArray(value);
}
function safeMode(value) {
  return MODE_IDS.has(value)?value:"auto";
}
function sourceIds(value) {
  return validSourceIds(value);
}
function gameIds(value) {
  return validGameFavoriteIds(value);
}
function recentIds(value) {
  return validRecents(value);
}

export function createPortableSetup({sources=[],games=[],recents=[],mode="auto"}={}) {
  return {
    schema:PORTABLE_SCHEMA,
    favorites:{sources:sourceIds(sources),games:gameIds(games)},
    recents:recentIds(recents),
    preferences:{mode:safeMode(mode)}
  };
}

// Bounded import parser. Unknown catalog IDs can be dropped on version migration
// but MUST be disclosed in the preview. Structural errors reject the entire input.
export function parsePortableSetup(raw) {
  if(typeof raw!=="string" || !raw.trim())return {ok:false,error:"Paste a REEL setup JSON backup first."};
  if(raw.length>PORTABLE_MAX_BYTES)return {ok:false,error:"This backup exceeds the 8 KB limit."};
  let parsed;
  try {parsed=JSON.parse(raw);}
  catch{return {ok:false,error:"That is not valid JSON."};}
  if(!isRecord(parsed)||parsed.schema!==PORTABLE_SCHEMA){
    return {ok:false,error:"Unsupported backup format. Expected REEL_PORTABLE_SETUP_V1."};
  }
  if(!isRecord(parsed.favorites)||!isRecord(parsed.preferences)||
     !Array.isArray(parsed.favorites.sources)||!Array.isArray(parsed.favorites.games)||
     !Array.isArray(parsed.recents)||!MODE_IDS.has(parsed.preferences.mode)){
    return {ok:false,error:"Missing or invalid favorites, recents, or layout fields."};
  }
  if([parsed.favorites.sources,parsed.favorites.games,parsed.recents].some(a=>a.length>100)){
    return {ok:false,error:"Too many entries in the backup."};
  }
  const setup=createPortableSetup({
    sources:parsed.favorites.sources,games:parsed.favorites.games,
    recents:parsed.recents,mode:parsed.preferences.mode
  });
  const removed={
    sources:parsed.favorites.sources.length-setup.favorites.sources.length,
    games:parsed.favorites.games.length-setup.favorites.games.length,
    recents:parsed.recents.length-setup.recents.length
  };
  const dropped=removed.sources+removed.games+removed.recents;
  return {ok:true,setup,dropped,removed};
}

export function mergePortableSetup(current,incoming,strategy="merge") {
  if(strategy!=="merge" && strategy!=="replace")throw Error("Unknown import strategy");
  const safeCurrent=createPortableSetup(current);
  const safeIncoming=createPortableSetup(incoming);
  if(strategy==="replace")return safeIncoming;
  // The current browser keeps its selected layout. Imported favorites are
  // appended, and current recently selected links take precedence.
  return createPortableSetup({
    sources:[...safeCurrent.favorites.sources,...safeIncoming.favorites.sources],
    games:[...safeCurrent.favorites.games,...safeIncoming.favorites.games],
    recents:[...safeCurrent.recents,...safeIncoming.recents],
    mode:safeCurrent.preferences.mode
  });
}

export function describePortableSetup(setup) {
  const data=createPortableSetup(setup);
  return {
    sources:data.favorites.sources.length,
    games:data.favorites.games.length,
    recents:data.recents.length,
    mode:data.preferences.mode,
    availableSources:SOURCES.length,
    availableGames:GAMES.length
  };
}

// Adapt only a verified V1 file to the current-storage object shape.
// Callers read/write these known localStorage keys; no arbitrary JSON keys
// are interpreted as storage destinations.
export function toStoragePairs(setup) {
  const data=createPortableSetup(setup);
  return [
    ["favorite-sources",JSON.stringify(data.favorites.sources)],
    ["favorite-games",JSON.stringify(data.favorites.games)],
    ["recent-links",JSON.stringify(data.recents)],
    ["display-mode",data.preferences.mode]
  ];
}
