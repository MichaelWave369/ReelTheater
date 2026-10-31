import { startArcade } from "./arcade.js";
import {SOURCES, SOURCE_CATEGORIES, findSources, parseFavoriteSourceIds} from "./sources.js";
import {FIELD_KEY,FIELD_GAME_URL,FIELD_STATES,FIELD_TARGETS,parseFieldReport,updateFieldEntry,fieldCounts,fieldMarkup} from "./field.js";
import {UI_MODES,normalizeMode,resolveMode,platformGuide,isEditableTarget,remoteBackKey} from "./platform.js";
import {GAMES,GAME_CATEGORIES,filterGames,parseGameFavorites} from "./games.js";
import {createPlaybackSession,recordPlaybackEvent,recordVideoFrameCallback,setVideoFrameObservation,firstVideoFrameLabel,safePlaybackSummary,playbackGuidance} from "./playback.js";
import {inspectMediaSupport} from "./media-support.js";
import {FOCUSABLE_SELECTOR,pickSpatialIndex,gamepadIntent,isArcadeControlKey} from "./remote.js";
import {makeDeviceLog,appendDeviceInput,inputLabel,gamepadLabel,frameStats,safeDeviceReport} from "./device.js";
import {QUICK_ITEMS,QUICK_FILTERS,quickItem,favoriteKeys,parseRecents,recordRecent,quickResults,quickHomeItems} from "./quicklaunch.js";
import {createPortableSetup,parsePortableSetup,mergePortableSetup,describePortableSetup,toStoragePairs,PORTABLE_MAX_BYTES} from "./portable.js";
import {pollMode,newRedrawLog,appendRedraw,redrawSummary} from "./performance.js";

const main = document.getElementById("main-content");
const modal = document.getElementById("player-modal");
const player = document.getElementById("media-player");
const filePicker = document.getElementById("local-file");
const toast = document.getElementById("toast");
const SAMPLE_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const REEL_URL = "https://github.com/MichaelWave369/ReelCommons";
const views = ["home", "quick", "watch", "live", "arcade", "library", "field", "device", "settings"];
const launchedAt = performance.now();
let view = "home";
let arcadeCleanup = null;
let localMediaUrl = null;
let samplePlaying = false;
let controllerWasConnected = false;
let lastPadAction = "";
let nextPadActionAt = 0;
let toastTimer;
let sourceCategory = "all";
let sourceQuery = "";
let sourceFavoritesOnly = false;
let gameQuery = "";
let gameCategory = "all";
let gameFavoritesOnly = false;
let playbackSession = createPlaybackSession();
let videoFrameHandle = null;
let videoFrameToken = 0;
let installPrompt = null;
let currentMode = "desktop";
let quickQuery = "";
let quickFilter = "all";
let pendingPortableImport = null;
let pendingPortableRaw = "";
let deviceLog = makeDeviceLog();
let deviceCapture = false;
let lastDevicePadLabel = "";
let deviceBackNeedsRelease = false;
let frameSampleToken = 0;
let frameSampling = false;
let redrawLog = newRedrawLog();
let nextPadTick = null;
let padTickKind = null;
let playerOpener = null;
const appShell = document.querySelector(".app-shell");

function read(key, fallback = "") {
  try { return window.localStorage.getItem("reel-theater:" + key) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { window.localStorage.setItem("reel-theater:" + key, String(value)); return true; }
  catch { return false; }
}
function presentationHints() {
  return {
    width: window.innerWidth || 1024,
    coarse: Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches),
    touchPoints: navigator.maxTouchPoints || 0,
    gamepad: controllerWasConnected,
    tvBrowser: /AFT[A-Z0-9]*|Fire TV|Xbox/i.test(navigator.userAgent || "")
  };
}
function applyMode() {
  const selected=normalizeMode(read("display-mode","auto"));
  currentMode=resolveMode(selected,presentationHints());
  document.documentElement.dataset.uiMode=currentMode;
  document.documentElement.dataset.uiPreference=selected;
  const label=document.getElementById("effective-display");
  if (label) label.textContent="Active layout: "+currentMode.toUpperCase();
  return currentMode;
}
function updateConnection() {
  const el=document.getElementById("connection-status");
  if (el) el.textContent=navigator.onLine ? "Online · live sources require internet" : "Offline · saved shell only";
}
function safeProgress() {
  const position = Number(read("demo-position", "0"));
  return Number.isFinite(position) && position >= 0 ? Math.min(position, 3600) : 0;
}
function timestamp(seconds) {
  const s = Math.floor(seconds);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
function notify(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}
function reelLink(text) {
  return '<a href="' + REEL_URL + '" target="_blank" rel="noopener noreferrer" class="action secondary">' + text + '</a>';
}
function currentFieldReport() {
  try { return parseFieldReport(window.localStorage.getItem(FIELD_KEY)); }
  catch { return parseFieldReport(""); }
}
function storeFieldReport(report) {
  try {
    window.localStorage.setItem(FIELD_KEY, JSON.stringify(report));
    return true;
  } catch { notify("Browser storage unavailable. Download your field report before leaving."); return false; }
}
function updateFieldSummary(report) {
  const counts = fieldCounts(report);
  const progress = document.getElementById("field-progress");
  const detail = document.getElementById("field-summary-detail");
  if (progress) progress.textContent = counts.tested + " / " + counts.total + " checked";
  if (detail) detail.textContent = counts.worked + " worked · " + counts.failed + " failed · " + counts.opened + " opened only";
}
function exportFieldReport() {
  const report = currentFieldReport();
  const blob = new Blob([JSON.stringify({...report, exportedAt:new Date().toISOString(), provenance:"Unverified manual local observations; not a compatibility certificate."}, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "reel-theater-xbox-field-report.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  notify("Download requested. If Xbox Edge blocked it, use screenshots or repeat on desktop.");
}
function sourceFavorites() {
  return parseFavoriteSourceIds(read("favorite-sources", "[]"));
}
function sourceSection() {
  return '<section class="source-discovery" aria-label="Official streaming service directory">' +
    '<div class="section-heading"><div><h2>Official services, one place</h2><p>Direct destinations only. No repository installation. No misleading Play buttons.</p></div><span class="source-verification">Official links curated Oct 31, 2026</span></div>' +
    '<div class="source-controls"><label class="source-search-label" for="source-query">Find a service <input id="source-query" type="search" placeholder="Try movies, NASA, Plex..." autocomplete="off" aria-label="Find a streaming service"></label>' +
    '<div class="source-filters" aria-label="Filter source category">' +
    SOURCE_CATEGORIES.map(category => '<button type="button" class="source-chip' + (sourceCategory === category.id ? ' selected' : '') + '" data-source-category="' + category.id + '" aria-pressed="' + (sourceCategory === category.id) + '">' + category.label + '</button>').join("") +
    '<button class="source-chip' + (sourceFavoritesOnly ? ' selected' : '') + '" data-source-favorites-only="true" aria-pressed="' + sourceFavoritesOnly + '">♥ Favorites</button></div></div>' +
    '<p id="source-count" class="source-count" aria-live="polite"></p><div id="source-results" class="source-grid" aria-label="Official service results"></div>' +
    '<p class="fineprint">An official destination is not a playable stream in REEL Theater. Xbox app availability does not establish browser compatibility. No site is contacted until you deliberately open it. Third-party catalogs, regions, logins, advertisements and availability can change.</p></section>';
}
function renderSourceList() {
  const container = document.getElementById("source-results");
  if (!container) return;
  const favoriteIds = sourceFavorites();
  const results = findSources({query:sourceQuery, category:sourceCategory, favoritesOnly:sourceFavoritesOnly, favorites:favoriteIds});
  const count = document.getElementById("source-count");
  if (count) count.textContent = results.length + ' of ' + SOURCES.length + ' official destinations shown';
  container.innerHTML = results.length ? results.map(source => {
    const saved = favoriteIds.includes(source.id);
    const myResult = currentFieldReport().entries["source-"+source.id];
    return '<article class="source-card"><div class="source-card-top"><span class="source-icon" aria-hidden="true">' + source.name.slice(0,1) + '</span>' +
      '<div class="source-name"><h3>' + source.name + '</h3><span>' + source.label + '</span></div>' +
      '<button class="source-fav" data-source-favorite="' + source.id + '" aria-pressed="' + saved + '" aria-label="' + (saved ? "Remove " : "Save ") + source.name + (saved ? " from favorites" : " to favorites") + '">' + (saved ? "♥" : "♡") + '</button></div>' +
      '<p>' + source.description + '</p><div class="source-meta"><span>' + source.price + '</span><span>' + source.xbox + '</span></div>' +
      '<span class="source-self-report">My device: ' + (myResult && myResult.status !== 'untested' ? FIELD_STATES.find(state=>state.id===myResult.status).label : 'Not tested') + '</span>' +
      '<a class="action secondary source-open" href="' + source.url + '" data-quick-link="source:' + source.id + '" target="_blank" rel="noopener noreferrer" aria-label="Open ' + source.name + ' official site">Open official site ↗</a></article>';
  }).join("") : '<div class="source-empty"><strong>No matching services.</strong><p>Try another category or clear Favorites. No hidden repositories are being searched.</p></div>';
}
function gameFavorites() {
  return parseGameFavorites(read("favorite-games","[]"));
}
function gameSection() {
  return '<section class="game-catalog" aria-label="Original browser-game catalog">' +
    '<div class="section-heading"><div><h2>Original Game Library</h2><p>Direct first-party links. No emulator repository maze, no phantom arcade cabinets.</p></div></div>' +
    '<div class="source-controls"><label class="source-search-label" for="game-query">Find a game<input id="game-query" type="search" placeholder="Try Spark, puzzle, arcade..." autocomplete="off"></label>' +
    '<div class="source-filters" aria-label="Game genres">' +
    GAME_CATEGORIES.map(cat=>'<button type="button" class="source-chip'+(gameCategory===cat.id?' selected':'')+'" aria-pressed="'+(gameCategory===cat.id)+'" data-game-category="'+cat.id+'">'+cat.label+'</button>').join("") +
    '<button type="button" class="source-chip'+(gameFavoritesOnly?' selected':'')+'" data-game-only-favorites="true" aria-pressed="'+gameFavoritesOnly+'">♥ Favorites</button></div></div>' +
    '<p id="game-count" class="source-count" aria-live="polite"></p><div id="game-results" class="game-grid"></div>' +
    '<p class="fineprint">These are independent browser projects, not games embedded in this app. Their repositories document browser entry points, but Xbox, Silk, mobile and live availability remain unverified here. Each external game owns its own saved progress.</p></section>';
}
function renderGameCards() {
  const root=document.getElementById("game-results");
  if (!root) return;
  const favorites=gameFavorites();
  const list=filterGames({query:gameQuery,category:gameCategory,onlyFavorites:gameFavoritesOnly,favorites});
  const statuses=currentFieldReport().entries;
  const count=document.getElementById("game-count");
  if (count) count.textContent=list.length+" of "+GAMES.length+" projects shown";
  root.innerHTML=list.length ? list.map(game=>{
    const favorite=favorites.includes(game.id);
    const status=game.fieldId && statuses[game.fieldId]?.status;
    const ownStatus=status && status!=="untested" ? FIELD_STATES.find(s=>s.id===status)?.label : "Not tested";
    return '<article class="game-card"><div class="game-top"><div><span class="eyebrow">'+game.kind+'</span><h3>'+game.name+'</h3></div>' +
      '<button class="source-fav" data-game-favorite="'+game.id+'" aria-pressed="'+favorite+'" aria-label="'+(favorite?'Remove ':'Save ')+game.name+(favorite?' from favorites':' to favorites')+'">'+(favorite?'♥':'♡')+'</button></div>' +
      '<p>'+game.description+'</p><div class="source-meta"><span>'+game.platform+'</span><span>'+game.evidence+'</span></div>' +
      '<p class="source-self-report">My device: '+ownStatus+'</p>' +
      '<a class="action secondary game-open" href="'+game.url+'" data-quick-link="game:'+game.id+'" target="_blank" rel="noopener noreferrer">'+(game.entry==="game"?'Open browser game ↗':'View project ↗')+'</a></article>';
  }).join("") : '<div class="source-empty"><strong>No matches here.</strong><p>Clear search or Favorites. We do not invent games to fill a grid.</p></div>';
}
function recentQuickLinks() {
  return parseRecents(read("recent-links","[]"));
}
function favoritesQuickLinks() {
  return favoriteKeys({sources:sourceFavorites(),games:gameFavorites()});
}
function quickCard(item,{favorite=false,recent=false,compact=false}={}) {
  const label=item.kind==="source"?"Source":"Original game";
  return '<article class="quick-card'+(compact?' compact':'')+'">' +
    '<div class="quick-card-header"><span class="quick-kind">'+label+' · '+item.group+'</span>' +
    (compact?'':'<button class="source-fav" data-quick-favorite="'+item.key+'" aria-label="'+(favorite?'Remove ':'Save ')+item.name+(favorite?' from favorites':' to favorites')+'" aria-pressed="'+favorite+'">'+(favorite?'♥':'♡')+'</button>')+'</div>' +
    '<h3>'+item.name+'</h3>' +
    (compact?'':'<p>'+item.description+'</p>') +
    (recent?'<span class="quick-recent-label">Previously selected on this browser</span>':'') +
    '<a class="action secondary quick-open" href="'+item.url+'" data-quick-link="'+item.key+'" rel="noopener noreferrer" target="_blank">'+item.cta+' ↗</a>' +
    '</article>';
}
function quickHome() {
  const favorites=favoritesQuickLinks(),recent=recentQuickLinks();
  const selected=quickHomeItems({favorites,recent});
  return '<section class="quick-home" aria-label="Your quick-launch shortcuts">' +
    '<div class="section-heading"><div><h2>One-click shortcuts</h2><p>Favorite games and official services together, with your recent selections.</p></div><button class="action secondary" data-view="quick">See all shortcuts</button></div>' +
    (selected.length?'<div class="quick-grid compact-grid">'+selected.map(item=>quickCard(item,{favorite:favorites.includes(item.key),recent:recent.includes(item.key),compact:true})).join("")+'</div>':
      '<div class="quick-empty"><p>Nothing saved yet. Favorite a game or official streaming service and it appears here.</p>' +
      '<button class="action" data-view="quick">Browse all shortcuts</button></div>') +
    '<p class="fineprint">Recently selected links do not mean a game loaded or a stream played. Shortcuts are private to this browser.</p></section>';
}
function quickPage() {
  return '<div class="page-heading"><div class="eyebrow">RUNG 9 · QUICK LAUNCH</div><h1>Everything, fewer clicks.</h1>' +
    '<p>Find your games and official streaming destinations in one place. No accounts, no third-party add-ons, and no links we invented.</p></div>' +
    '<section class="quick-launch" aria-label="Unified quick-launch directory">' +
    '<div class="source-controls"><label class="source-search-label" for="quick-query">Search all shortcuts<input id="quick-query" type="search" placeholder="Search games, movies, live TV..." autocomplete="off"></label>' +
    '<div class="source-filters" aria-label="Quick launch filters">'+QUICK_FILTERS.map(f=>'<button class="source-chip'+(quickFilter===f.id?' selected':'')+'" data-quick-filter="'+f.id+'" aria-pressed="'+(quickFilter===f.id)+'">'+f.label+'</button>').join("")+'</div></div>' +
    '<p class="source-count" id="quick-count" aria-live="polite"></p><div id="quick-results" class="quick-grid"></div>' +
    '<div class="quick-privacy"><p>Recents are recorded only when you select an external link on this browser. This is a click history, not proof of page load, playable media or Xbox/Fire TV compatibility.</p>' +
    '<button class="action ghost" data-action="clear-quick-recents">Clear recent selections</button></div></section>';
}
function renderQuickResults() {
  const root=document.getElementById("quick-results");
  if(!root)return;
  const favorites=favoritesQuickLinks(),recent=recentQuickLinks();
  const results=quickResults({query:quickQuery,filter:quickFilter,favorites,recent});
  const count=document.getElementById("quick-count");
  if(count) count.textContent=results.length+" of "+QUICK_ITEMS.length+" curated shortcuts";
  root.innerHTML=results.length?
    results.map(item=>quickCard(item,{favorite:favorites.includes(item.key),recent:recent.includes(item.key)})).join(""):
    '<div class="source-empty"><strong>Nothing matches.</strong><p>Clear the search or choose All. Favorite or recent links appear only when you select them.</p></div>';
}
function hero() {
  return '<section class="hero"><div class="hero-copy"><div class="eyebrow">✦ YOUR LIVING ROOM. REIMAGINED.</div><h1>Less waiting.<br><em>More watching.</em></h1><p>A home theater that gets out of your way. Watch a sample, play a real arcade game, or bring your own media. No accounts. No mystery repositories.</p><div class="actions"><button data-action="demo" class="action">▷ Watch demo video</button><button data-view="arcade" class="action secondary">✧ Open Arcade</button><button data-view="watch" class="action ghost">⌕ Discover free TV</button></div></div></section>';
}
function home() {
  const progress = safeProgress();
  return hero() + quickHome() +
    '<div class="section-heading"><div><h2>Jump right in</h2><p>No loading screens between you and the good stuff.</p></div></div>' +
    '<section class="tile-grid" aria-label="Quick actions">' +
    '<button class="tile" data-action="' + (progress > 0 ? 'resume' : 'demo') + '"><span class="icon">▶</span><h3>' + (progress > 0 ? 'Continue Watching' : 'Try the Player') + '</h3><p>' + (progress > 0 ? 'Resume demo at ' + timestamp(progress) : 'Real HTML5 video, not a fake play button.') + '</p></button>' +
    '<button class="tile" data-action="file"><span class="icon">▤</span><h3>My Media</h3><p>Open a video or audio file you choose.</p></button>' +
    '<button class="tile" data-view="arcade"><span class="icon">✧</span><h3>REEL Arcade</h3><p>Signal Breaker plus a curated library of original browser games.</p></button>' +
    '</section>' +
    '<div class="section-heading"><div><h2>Explore more</h2><p>Thoughtful shortcuts, not twelve layers of menus.</p></div></div>' +
    '<section class="card-grid">' +
    '<div class="feature-card"><div class="tag">Media discovery</div><h3>One-stop Source Guide</h3><p>Official free movies and live-TV destinations. No add-ons to install.</p><button class="action secondary" data-view="watch">Browse official services</button></div>' +
    '<div class="feature-card"><div class="tag">Manual field testing</div><h3>The Shayne Test</h3><p>Record what really works with games and video on this browser.</p><button class="action secondary" data-view="field">Open Field Lab</button></div>' +
    '<div class="feature-card"><div class="tag">Device readiness</div><h3>Input &amp; Frame Lab</h3><p>Observe remote, gamepad and touch actions, then measure local UI pacing.</p><button class="action secondary" data-view="device">Open Device Lab</button></div></section>';
}
function mediaSupportSection() {
  return '<section class="media-support-panel" aria-label="Browser media format hints">' +
    '<div class="section-heading"><div><h2>What formats does this browser report?</h2>' +
    '<p>A format hint is not a playback test. This probes the local video element only when you press Check.</p></div></div>' +
    '<button class="action secondary" data-action="inspect-formats">Check browser format hints</button>' +
    '<div id="media-support-results" class="media-support-results" aria-live="polite"><p>No checks run yet. Codec support may change across browsers and devices.</p></div>' +
    '<p class="fineprint">The answers are generated inside your browser. No external codec database, account, fingerprint upload, provider login, DRM test or network request is involved. "Probably" and "maybe" do not guarantee a file or stream plays.</p></section>';
}
function renderMediaSupport() {
  const result=inspectMediaSupport(player,{
    mediaSource:typeof window.MediaSource!=="undefined",
    frameCallback:typeof player.requestVideoFrameCallback==="function"
  });
  const container=document.getElementById("media-support-results");
  if(!container)return;
  container.replaceChildren();
  const list=document.createElement("ul");
  list.className="media-support-list";
  for(const row of result.formats){
    const item=document.createElement("li");
    const label=document.createElement("span");
    label.textContent=row.name;
    const value=document.createElement("strong");
    value.textContent=row.hint;
    item.append(label,value);
    list.appendChild(item);
  }
  container.appendChild(list);
  const api=document.createElement("p");
  api.className="media-support-api";
  api.textContent="MediaSource API: "+(result.mediaSourceAPI?"present":"not reported")+
    " · Video-frame callback API: "+(result.videoFrameCallbackAPI?"present":"not reported");
  container.appendChild(api);
}
function playbackHealthSection() {
  return '<section class="health-panel" aria-label="Playback diagnostics"><div class="section-heading"><div><h2>Playback Health</h2><p>Live media-element observations from this session, not an external-provider availability check.</p></div></div>' +
    '<div class="health-details"><div><span class="eyebrow">CURRENT ATTEMPT</span><h3 id="health-status">Not started</h3><p id="health-guidance">Choose the demo or a local file to see events.</p><p id="health-first-event">First playing event: not observed</p><p id="health-first-frame">First video frame callback: not checked</p></div>' +
    '<div><strong>Recent events</strong><ol id="health-events" class="health-events"><li>No playback attempts yet.</li></ol></div></div>' +
    '<button class="action secondary" data-action="export-health">Download privacy-safe diagnostics</button>' +
    '<p class="fineprint">This report contains only event names, elapsed milliseconds, a generic error category and demo/local indicator. It never includes the selected local filename or media URL. A playing event does not independently verify picture or sound.</p></section>';
}
function renderPlaybackHealth() {
  const summary=safePlaybackSummary(playbackSession);
  for (const id of ["health-status","player-health-status"]) {
    const node=document.getElementById(id);
    if (node) node.textContent=summary.status;
  }
  for (const id of ["health-guidance","player-health-guidance"]) {
    const node=document.getElementById(id);
    if (node) node.textContent=playbackGuidance(playbackSession);
  }
  const first=document.getElementById("health-first-event");
  if (first) first.textContent=summary.firstPlayingMs===null ?
    "First playing event: not observed" : "First playing event: "+summary.firstPlayingMs+" ms after start (not first visible frame)";
  for(const id of ["health-first-frame","player-health-frame"]){
    const node=document.getElementById(id);
    if(node)node.textContent=firstVideoFrameLabel(playbackSession);
  }
  for (const id of ["health-events","player-health-events"]) {
    const node=document.getElementById(id);
    if (!node) continue;
    node.replaceChildren();
    if (!summary.events.length) {
      const item=document.createElement("li");
      item.textContent="No media events observed yet";
      node.appendChild(item);
    } else for (const row of summary.events.slice().reverse()) {
      const item=document.createElement("li");
      item.textContent=row.event+" · "+row.elapsedMs+" ms";
      node.appendChild(item);
    }
  }
}
function exportPlaybackHealth() {
  const summary=safePlaybackSummary(playbackSession);
  const blob=new Blob([JSON.stringify({schema:"REEL_PLAYBACK_SESSION_V2",summary,disclaimer:"Local media-element events and optional video-frame callback only. Neither guarantees visible picture, audible sound, supported DRM or provider playback."},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="reel-playback-health.json";
  document.body.appendChild(a);
  a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  notify("Diagnostics download requested. Some TV browsers may block downloads.");
}
function watch() {
  return '<div class="page-heading"><div class="eyebrow">THE WATCH ROOM</div><h1>Pick something. Press play.</h1><p>A working player, without digging through repositories. The sample is hosted by MDN; local-file playback never uploads your media.</p></div>' +
    '<div class="card-grid"><div class="feature-card"><div class="tag">CC0 demo · online</div><h3>Flower: Playback Sample</h3><p>A small Creative Commons Zero video used to verify your Xbox browser playback. Network required.</p><button class="action" data-action="demo">▷ Play sample</button></div>' +
    '<div class="feature-card"><div class="tag">Your device · private</div><h3>Open My Media</h3><p>Choose a supported video or audio file using the browser file picker. No upload, scanning, or saved file access.</p><button class="action secondary" data-action="file">▤ Choose a file</button></div></div>' +
    '<p class="fineprint">Commercial streaming services may require their own authorized app and DRM. Browser playback support is format and platform dependent. No unauthorized add-on sources are installed.</p>' + playbackHealthSection() + mediaSupportSection() + sourceSection();
}
function live() {
  return '<div class="page-heading"><div class="eyebrow">LIVE TV</div><h1>No dead channel buttons.</h1><p>This room is intentionally honest. There is no invented channel lineup and no unverified live feed behind the artwork.</p></div>' +
    '<div class="info-panel"><strong>REEL Commons is the source-discovery foundation.</strong><p>For now, this opens the existing REEL Commons project. A future rung can add verified official live-channel links, a clear availability monitor and authorized playlists. We will not pretend a site-directory link is a playable television stream.</p>' + reelLink("Open REEL Commons project ↗") + '</div>' +
    '<div class="section-heading"><div><h2>Next integration</h2><p>Verified channel manifests, clear source labels, and device-tested playback.</p></div></div>' +
    '<div class="status-grid"><div class="status-block"><h3>Provider shortcuts</h3><p>Official destinations are available below. Their streams open in the provider’s own website or app.</p></div><div class="status-block"><h3>EPG / DVR</h3><p>Planned native-capability work; not available in this browser pilot.</p></div></div>' + sourceSection();
}
function library() {
  const isFav = read("favorite-demo") === "yes";
  return '<div class="page-heading"><div class="eyebrow">YOUR LIBRARY</div><h1>Your stuff. Your space.</h1><p>Nothing gets uploaded. In this browser pilot, open media with the file picker and save a demo favorite locally.</p></div>' +
    '<section class="card-grid"><div class="feature-card"><div class="tag">Personal media</div><h3>Open Local File</h3><p>Xbox browser file access is restricted. On a computer, this can play a file you select. For NAS and USB library access on Xbox, a native app or media server integration is a future milestone.</p><button class="action" data-action="file">Choose media</button></div>' +
    '<div class="feature-card"><div class="tag">Saved to this browser</div><h3>Flower Demo</h3><p>' + (isFav ? "Added to your favorites." : "Not in your favorites yet.") + '</p><button class="action secondary" data-action="favorite">' + (isFav ? "♥ Remove favorite" : "♡ Add favorite") + '</button><button class="action ghost" data-action="demo">▷ Play</button></div></section>';
}
function arcade() {
  return '<div class="page-heading"><div class="eyebrow">REEL ARCADE · ORIGINAL GAMES</div><h1>Play first. Configure never.</h1><p>Signal Breaker is bundled and playable from the offline shell. Our other browser games open in their own websites, without installing a Kodi add-on.</p></div>' +
    '<div class="arcade-stage"><canvas id="signal-breaker" width="960" height="540" tabindex="0" aria-label="Signal Breaker game controls. Enter or A to launch; left and right to play; B or Escape to return to menus."></canvas><div class="arcade-tools"><div class="actions"><button id="start-game" class="action">✧ Start / Restart</button><button data-view="home" class="action secondary">⌂ Home</button></div><p id="arcade-control-status" aria-live="polite">Select Start to play. Focus the game canvas for controls; B or Escape returns to the menu.</p></div></div>' +
    gameSection();
}

function devicePage() {
  return '<div class="page-heading"><div class="eyebrow">RUNG 8 · DEVICE READINESS</div><h1>What does this browser actually see?</h1>' +
    '<p>Run an input test on this specific device, then optionally sample visible-tab frame pacing. No accounts, no hardware serials, no external stream probes.</p></div>' +
    '<section class="device-status-grid" aria-label="Browser capability hints">' +
    '<div class="device-stat"><span class="eyebrow">PRESENTATION</span><strong id="device-layout">Checking</strong><span>Chosen display mode, not a device certification</span></div>' +
    '<div class="device-stat"><span class="eyebrow">GAMEPAD</span><strong id="device-pad">Checking</strong><span>Connection as reported by Gamepad API</span></div>' +
    '<div class="device-stat"><span class="eyebrow">INPUT</span><strong id="device-touch">Checking</strong><span>Touch capability hint</span></div>' +
    '<div class="device-stat"><span class="eyebrow">OFFLINE SHELL</span><strong id="device-shell">Checking</strong><span>Current service worker control, not a download test</span></div></section>' +
    '<section class="device-workbench" aria-label="Input observation workbench"><div class="section-heading"><div><h2>Test remote, gamepad or touch</h2>' +
    '<p>Start, then press arrow keys or D-pad, A/Select, B/Back, or tap the target. Only named navigation actions are recorded. Keys you type elsewhere are never captured.</p></div></div>' +
    '<div class="actions"><button data-action="device-start" class="action">Start input test</button><button data-action="device-stop" class="action secondary" disabled>Stop test</button></div>' +
    '<div id="device-capture-target" class="device-capture-target" tabindex="0" role="group" aria-label="Input test target. Escape or gamepad B to stop.">Tap here or focus after Start<span id="device-capture-status">Not recording</span></div>' +
    '<p class="fineprint">Keyboard Escape or controller B stops recording after showing that action. If a TV browser does not forward remote keys, there will be no false success.</p>' +
    '<div class="device-input-history"><strong>Recent recognized actions <span id="device-input-count">0</span></strong><ol id="device-input-events" aria-live="polite"><li>No input observed yet</li></ol></div></section>' +
    '<section class="device-workbench" aria-label="JavaScript UI redraw timings"><div class="section-heading"><div><h2>Screen redraw diagnostics</h2>' +
    '<p>Shows this browser’s recent synchronous REEL screen rebuild times only. Does not include layout, paint, TV remote delay, media startup, or end-to-end interaction latency.</p></div></div>' +
    '<p id="device-redraw-result" class="device-frame-result" aria-live="polite">No screen redraw timing observed.</p>' +
    '<button class="action ghost" data-action="redraw-clear">Clear timing samples</button>' +
    '<p class="fineprint">In-session only, maximum 24 readings. Nothing is transmitted or added to the Device Lab export.</p></section>' +
    '<section class="device-workbench" aria-label="Local display pacing"><div class="section-heading"><div><h2>Visible-tab frame pacing</h2>' +
    '<p>Sample 60 consecutive animation intervals. This is UI scheduling on this page, not gaming FPS, video decode speed, first-frame latency, or a universal device benchmark.</p></div></div>' +
    '<div class="actions"><button data-action="device-frame" class="action secondary">Run frame sample</button></div>' +
    '<p id="device-frame-result" class="device-frame-result" aria-live="polite">No sample taken.</p></section>' +
    '<section class="device-workbench"><div class="section-heading"><div><h2>Share only what you choose</h2><p>Export a small unsigned JSON report, without raw keystrokes, file names, video URLs, gamepad identifiers, exact hardware details or browser fingerprint.</p></div></div>' +
    '<button class="action" data-action="device-export">Download local device report</button>' +
    '<p class="fineprint">These observations live in memory only and disappear on reload. A downloaded file is editable and cannot independently establish hardware compatibility or media playback.</p>' +
    '<button data-view="field" class="action ghost">Open manual provider and game test log</button></section>';
}
function updateDeviceLab() {
  if(view!=="device")return;
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  set("device-layout",currentMode.toUpperCase());
  set("device-pad",controllerWasConnected?"Detected":"None reported");
  set("device-touch",(navigator.maxTouchPoints||0)>0?"Hint present":"Not reported");
  set("device-shell",navigator.serviceWorker?.controller?"Controlling page":"Unconfirmed");
  updateRedrawDisplay();
  const target=document.getElementById("device-capture-target");
  const on=document.querySelector('[data-action="device-start"]');
  const off=document.querySelector('[data-action="device-stop"]');
  if(target)target.classList.toggle("recording",deviceCapture);
  if(on)on.disabled=deviceCapture;
  if(off)off.disabled=!deviceCapture;
  set("device-capture-status",deviceCapture?"Recording navigation actions. Escape or B stops.":"Not recording");
  set("device-input-count",String(deviceLog.inputs.length));
  const list=document.getElementById("device-input-events");
  if(list){
    list.replaceChildren();
    for(const entry of deviceLog.inputs.slice().reverse()){
      const li=document.createElement("li");
      li.textContent=entry.type+": "+entry.action;
      list.appendChild(li);
    }
    if(!deviceLog.inputs.length){const li=document.createElement("li");li.textContent="No recognized input yet";list.appendChild(li);}
  }
  const button=document.querySelector('[data-action="device-frame"]');
  if(button){button.disabled=frameSampling;button.textContent=frameSampling?"Sampling visible frames...":"Run frame sample";}
  if(!frameSampling && deviceLog.frame){
    const f=deviceLog.frame;
    set("device-frame-result",f.samples+" intervals · median "+f.medianMs+" ms · p95 "+f.p95Ms+" ms · longest "+f.longestMs+" ms. Not video/game FPS.");
  }
}
function updateRedrawDisplay() {
  const node=document.getElementById("device-redraw-result");
  if(!node)return;
  const summary=redrawSummary(redrawLog);
  node.textContent=summary ?
    summary.count+" screen rebuilds · latest "+summary.lastMs+" ms · median "+summary.medianMs+
    " ms · p95 "+summary.p95Ms+" ms · worst "+summary.worstMs+" ms. JavaScript DOM work, not paint." :
    "No screen redraw timing observed.";
}
function stopDeviceCapture() {
  deviceCapture=false;
  lastDevicePadLabel="";
  updateDeviceLab();
  const button=document.querySelector('[data-action="device-start"]');
  if(button)focusAndReveal(button);
}
function markDeviceInput(kind,label) {
  if(!deviceCapture || view!=="device")return;
  deviceLog=appendDeviceInput(deviceLog,kind,label);
  updateDeviceLab();
}
function startDeviceCapture() {
  deviceBackNeedsRelease=false;
  deviceLog={...deviceLog,inputs:[]};
  deviceCapture=true;
  lastDevicePadLabel="";
  updateDeviceLab();
  focusAndReveal(document.getElementById("device-capture-target"));
}
function cancelFrameSample() {
  frameSampleToken++;
  frameSampling=false;
}
function startDeviceFrameSample() {
  if(frameSampling || view!=="device")return;
  if(document.hidden){notify("Open the tab visibly before measuring frame pacing.");return;}
  frameSampling=true;
  deviceLog={...deviceLog,frame:null};
  const token=++frameSampleToken, samples=[];
  let prev=null;
  updateDeviceLab();
  const step=now=>{
    if(token!==frameSampleToken || view!=="device" || document.hidden){
      if(token===frameSampleToken){frameSampling=false;updateDeviceLab();notify("Frame sample interrupted; no result recorded.");}
      return;
    }
    if(prev!==null)samples.push(now-prev);
    prev=now;
    if(samples.length<60){requestAnimationFrame(step);return;}
    deviceLog={...deviceLog,frame:frameStats(samples)};
    frameSampling=false;
    updateDeviceLab();
  };
  requestAnimationFrame(step);
}
function exportDeviceLab() {
  const report=safeDeviceReport(deviceLog,{
    mode:currentMode,gamepadDetected:controllerWasConnected,touchAvailable:(navigator.maxTouchPoints||0)>0,
    offline:!navigator.onLine,serviceWorker:Boolean(navigator.serviceWorker?.controller)
  });
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="reel-device-readiness.json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  notify("Device report download requested. Some TV browsers block downloads.");
}
function currentPortableSetup() {
  return createPortableSetup({
    sources:sourceFavorites(),
    games:gameFavorites(),
    recents:recentQuickLinks(),
    mode:normalizeMode(read("display-mode","auto"))
  });
}
function portableSetupSection() {
  return '<div class="section-heading"><div><h2>Move your setup</h2>' +
    '<p>Bring your favorites and shortcuts to another browser without an account or cloud sync.</p></div></div>' +
    '<section class="setup-card portable-setup" aria-label="Export and import REEL setup">' +
    '<div class="eyebrow">EXPLICIT, LOCAL-ONLY BACKUP</div>' +
    '<h3>1. Export from this browser</h3>' +
    '<p>Includes official-source favorites, original-game favorites, the last nine selected shortcuts, and display preference. Excludes Field Lab notes, personal media, watch progress and device diagnostics.</p>' +
    '<div class="actions"><button class="action secondary" data-action="portable-show">Show JSON</button>' +
    '<button class="action secondary" data-action="portable-download">Download backup</button>' +
    '<button class="action ghost" data-action="portable-copy">Copy JSON</button></div>' +
    '<label class="portable-label" for="portable-export-text">Backup JSON<textarea id="portable-export-text" rows="5" readonly spellcheck="false" placeholder="Your export appears here after you choose Show, Download or Copy."></textarea></label>' +
    '<h3>2. Preview a backup from another device</h3>' +
    '<p>Paste a REEL V1 setup JSON file or choose a small local JSON file. Nothing is uploaded or applied until you preview and confirm.</p>' +
    '<label class="portable-label" for="portable-file">Open a local backup file<input id="portable-file" type="file" accept=".json,application/json"></label>' +
    '<label class="portable-label" for="portable-import-text">Import JSON<textarea id="portable-import-text" rows="6" spellcheck="false" autocomplete="off" placeholder="Paste REEL_PORTABLE_SETUP_V1 JSON here, then preview."></textarea></label>' +
    '<button class="action" data-action="portable-preview">Preview incoming setup</button>' +
    '<div id="portable-preview-status" class="portable-preview-status" aria-live="polite">No backup previewed.</div>' +
    '<div class="actions"><button class="action secondary" data-action="portable-merge" disabled>Merge with this browser</button>' +
    '<button class="action" data-action="portable-replace" disabled>Replace saved shortcuts &amp; layout</button></div>' +
    '<p class="fineprint">Merge keeps this browser layout, adds imported favorites and fills recent selections after existing recents. Replace changes only these four known settings keys. Everything else stays untouched. Imported backups are editable and not authenticated. Some TV browsers block file access or downloads; paste/copy remains available.</p></section>';
}
function showPortableExport() {
  const json=JSON.stringify(currentPortableSetup(),null,2);
  const text=document.getElementById("portable-export-text");
  if(text)text.value=json;
  return json;
}
function downloadPortableExport() {
  const json=showPortableExport();
  const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download="reel-theater-setup.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  notify("Backup download requested. Copy JSON if your TV browser blocks downloads.");
}
function copyPortableExport() {
  const json=showPortableExport();
  if(navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json).then(()=>notify("Backup JSON copied locally."))
      .catch(()=>{
        const area=document.getElementById("portable-export-text");
        if(area){area.focus();area.select();}
        notify("Clipboard blocked. Select the JSON and copy manually.");
      });
    return;
  }
  const area=document.getElementById("portable-export-text");
  if(area){area.focus();area.select();}
  notify("Clipboard unavailable. Select and copy the displayed JSON.");
}
function clearPortablePreview(message="Edited. Preview the backup again before applying.") {
  pendingPortableRaw="";
  pendingPortableImport=null;
  const status=document.getElementById("portable-preview-status");
  if(status)status.textContent=message;
  document.querySelectorAll('[data-action="portable-merge"],[data-action="portable-replace"]').forEach(button=>button.disabled=true);
}
function previewPortableImport() {
  const raw=document.getElementById("portable-import-text")?.value||"";
  const parsed=parsePortableSetup(raw);
  if(!parsed.ok){clearPortablePreview(parsed.error);return;}
  pendingPortableRaw=raw;
  pendingPortableImport=parsed.setup;
  const incoming=describePortableSetup(parsed.setup);
  const current=describePortableSetup(currentPortableSetup());
  const status=document.getElementById("portable-preview-status");
  if(status)status.textContent="Incoming: "+incoming.sources+" service favorites, "+incoming.games+" game favorites, "+
    incoming.recents+" recent shortcuts, layout "+incoming.mode+". Current browser: "+current.sources+" service favorites, "+
    current.games+" game favorites, "+current.recents+" recent shortcuts, layout "+current.mode+"."+
    (parsed.dropped ? " "+parsed.dropped+" duplicate or unknown entries were excluded." : " All entries recognized.")+
    " Choose Merge or Replace; nothing has changed yet.";
  document.querySelectorAll('[data-action="portable-merge"],[data-action="portable-replace"]').forEach(button=>button.disabled=false);
}
function commitPortableImport(strategy) {
  const raw=document.getElementById("portable-import-text")?.value||"";
  if(!pendingPortableImport||!pendingPortableRaw||raw!==pendingPortableRaw){
    clearPortablePreview("Import changed or was not previewed. Preview again.");
    return;
  }
  const current=currentPortableSetup();
  const next=mergePortableSetup(current,pendingPortableImport,strategy);
  const pairs=toStoragePairs(next);
  const before=[];
  try {
    for(const [key] of pairs) before.push([key,window.localStorage.getItem("reel-theater:"+key)]);
    for(const [key,value] of pairs) window.localStorage.setItem("reel-theater:"+key,value);
  } catch {
    // Roll back partial imports when browser storage is inaccessible or full.
    try {
      for(const [key,value] of before){
        if(value===null)window.localStorage.removeItem("reel-theater:"+key);
        else window.localStorage.setItem("reel-theater:"+key,value);
      }
    } catch {}
    clearPortablePreview("Import not completed: this browser blocked local storage. Saved settings may require review.");
    return;
  }
  clearPortablePreview(strategy==="merge"?"Setup merged locally.":"Setup replaced locally.");
  render();
  notify(strategy==="merge"?"Favorites and recent shortcuts merged.":"Portable settings replaced on this browser.");
}
async function loadPortableFile(input) {
  const file=input.files?.[0];
  if(!file)return;
  if(file.size>PORTABLE_MAX_BYTES){
    clearPortablePreview("Selected file exceeds the 8 KB limit.");
    input.value="";
    return;
  }
  try {
    const text=await file.text();
    const area=document.getElementById("portable-import-text");
    if(area){area.value=text;clearPortablePreview("File loaded locally. Preview before applying.");}
  } catch {
    clearPortablePreview("This browser could not read the selected local file.");
  }
  input.value="";
}
function settings() {
  const online=navigator.onLine;
  const gamepad=Boolean(navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean));
  const guide=platformGuide({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints||0});
  const currentPreference=normalizeMode(read("display-mode","auto"));
  return '<div class="page-heading"><div class="eyebrow">EVERY SCREEN · SETTINGS</div><h1>Make it yours.</h1><p>One web app, different ways to use it. Pick a remote-friendly TV layout or a touch layout, or let REEL choose based on available input hints.</p></div>' +
    '<section class="setup-card"><div><div class="eyebrow">PRESENTATION</div><h2>Choose your layout</h2><p>Changes apply immediately, only on this browser. No account or server preferences.</p></div>' +
    '<label class="layout-choice" for="layout-mode">Interface mode<select id="layout-mode">' + UI_MODES.map(item=>'<option value="'+item.id+'"'+(currentPreference===item.id?" selected":"")+'>'+item.label+'</option>').join("") + '</select></label>' +
    '<p class="layout-effective" id="effective-display">Active layout: '+currentMode.toUpperCase()+'</p></section>' +
    '<div class="section-heading"><div><h2>Open or install</h2><p>A home-screen shortcut is optional. REEL works as a normal website too.</p></div></div>' +
    '<section class="setup-card"><div class="eyebrow">DEVICE GUIDANCE · NOT A COMPATIBILITY CERTIFICATE</div><h3>'+guide.title+'</h3><p>'+guide.guidance+'</p>' +
    '<div class="actions"><button id="install-pwa" data-action="install-pwa" class="action"'+(installPrompt?"":' hidden')+'>Install REEL Theater</button><button class="action secondary" data-view="field">Open device test lab</button></div>' +
    '<p class="fineprint">An Install button is shown only when the current browser actually offers an installation prompt. Fire TV Silk and Xbox Edge may support bookmarking without offering installation. Installing does not guarantee remote input or media codecs.</p></section>' + portableSetupSection() +
    '<div class="section-heading"><div><h2>Environment & privacy</h2></div></div>' +
    '<section class="status-grid"><div class="status-block"><h3>Input</h3><p>'+(gamepad?'Gamepad reported by browser.':'No gamepad currently reported.')+' Keyboard arrows and Enter also work where the browser forwards them.</p></div>' +
    '<div class="status-block"><h3>Connection</h3><p>Browser reports '+(online?'online':'offline')+'. This is not a test of third-party streaming availability.</p></div>' +
    '<div class="status-block"><h3>Offline app shell</h3><p>'+(navigator.serviceWorker?.controller?'Service worker currently controls this page.':'Not currently controlled by a service worker; offline use is not yet confirmed.')+' External videos and providers are never cached.</p></div>' +
    '<div class="status-block"><h3>Local-only data</h3><p>Demo progress, source favorites, preferred layout and optional Field Lab notes use browser storage. No telemetry or automatic uploads.</p></div></section>' +
    '<div class="section-heading"><div><h2>Controls & recovery</h2></div></div>' +
    '<div class="info-panel"><p><strong>TV / Fire remote:</strong> D-pad or arrow keys navigate if delivered by the browser; center or Enter selects. Back or Escape returns Home. Some TV browsers use their own cursor instead of key navigation.</p><p><strong>Xbox gamepad:</strong> D-pad or left stick navigates; A selects; B returns Home or closes player. Arcade uses horizontal input.</p><p><strong>Touch:</strong> use bottom navigation, tap cards, scroll naturally, and use on-screen keyboard for search.</p><p><strong>Playback:</strong> Commercial DRM and SMB/USB library browsing still require authorized supported apps or future native/media-server integration.</p><button class="action secondary" data-action="reset">Clear saved demo progress and favorite</button></div>';
}

const pages = {home, quick:quickPage, watch, live, arcade, library, field:()=>fieldMarkup(currentFieldReport()), device:devicePage, settings};
function render() {
  const redrawStarted=performance.now();
  if (arcadeCleanup) { arcadeCleanup(); arcadeCleanup = null; }
  main.innerHTML = pages[view]();
  document.querySelectorAll("#primary-nav [data-view]").forEach(el => {
    const selected = el.dataset.view === view;
    el.classList.toggle("active", selected);
    if (selected) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  if (view === "arcade") arcadeCleanup = startArcade(document.getElementById("signal-breaker"), document.getElementById("start-game"));
  const search = document.getElementById("source-query");
  if (search) { search.value = sourceQuery; renderSourceList(); }
  const quickSearch = document.getElementById("quick-query");
  if(quickSearch){quickSearch.value=quickQuery;renderQuickResults();}
  const gameSearch = document.getElementById("game-query");
  if (gameSearch) { gameSearch.value=gameQuery; renderGameCards(); }
  if (view === "field") {
    const observations = currentFieldReport().entries;
    document.querySelectorAll("[data-field-note]").forEach(el=>{el.value = observations[el.dataset.fieldNote]?.note || "";});
  }
  applyMode();
  updateConnection();
  renderPlaybackHealth();
  updateDeviceLab();
  redrawLog=appendRedraw(redrawLog,{view,durationMs:performance.now()-redrawStarted});
  updateRedrawDisplay();
}
function setView(target) {
  if (!views.includes(target)) return;
  // Selecting the active tab should not destroy its input fields or restart the arcade.
  if(target===view && modal.hidden)return;
  if (!modal.hidden) closePlayer();
  if(view==="device" && target!=="device"){stopDeviceCapture();cancelFrameSample();}
  view = target;
  if (target === "live") sourceCategory = "live";
  else if (target === "watch") sourceCategory = "all";
  if (window.location.hash !== "#" + target) window.location.hash = target;
  render();
  const first = main.querySelector("button, a[href]");
  if (first) focusAndReveal(first);
}
function stopVideoFrameWatch() {
  videoFrameToken++;
  if(videoFrameHandle!==null && typeof player.cancelVideoFrameCallback==="function"){
    try{player.cancelVideoFrameCallback(videoFrameHandle);}catch{}
  }
  videoFrameHandle=null;
}
function startVideoFrameWatch() {
  if(playbackSession.videoFrameObservation!=="pending")return;
  const token=videoFrameToken;
  const onFrame=now=>{
    if(token!==videoFrameToken || modal.hidden || playbackSession.videoFrameObservation!=="pending")return;
    videoFrameHandle=null;
    if(player.videoWidth>0 && player.videoHeight>0){
      playbackSession=recordVideoFrameCallback(playbackSession,{now,hasVideo:true});
      renderPlaybackHealth();
    }else{
      // A callback without valid video dimensions is not evidence of a video frame.
      try{videoFrameHandle=player.requestVideoFrameCallback(onFrame);}
      catch{playbackSession=setVideoFrameObservation(playbackSession,"unavailable");renderPlaybackHealth();}
    }
  };
  try{videoFrameHandle=player.requestVideoFrameCallback(onFrame);}
  catch{playbackSession=setVideoFrameObservation(playbackSession,"unavailable");renderPlaybackHealth();}
}
function showPlayer(title, url, isSample, resume = false, audioOnly = false) {
  closePlayer();
  playerOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  samplePlaying = isSample;
  playbackSession = createPlaybackSession({kind:isSample?"demo":"local",started:performance.now()});
  playbackSession=setVideoFrameObservation(playbackSession,audioOnly?"not-applicable":
    typeof player.requestVideoFrameCallback==="function"?"pending":"unavailable");
  renderPlaybackHealth();
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-note").textContent = isSample ?
    "CC0 demonstration stream hosted by MDN. Requires a network connection and supported browser codec." :
    "This local file stays on your device. Playback depends on browser access and codec support.";
  modal.hidden = false;
  if (appShell) appShell.inert = true;
  player.src = url;
  player.load();
  startVideoFrameWatch();
  if (isSample && resume && safeProgress() > 0) {
    player.addEventListener("loadedmetadata", function seekOnce() {
      player.removeEventListener("loadedmetadata", seekOnce);
      if (player.duration && safeProgress() < player.duration - 2) player.currentTime = safeProgress();
    });
  }
  player.play().catch(() => { notify("Press Play in the video controls to begin."); });
  document.getElementById("close-player").focus();
}
function closePlayer() {
  stopVideoFrameWatch();
  const wasOpen=!modal.hidden;
  modal.hidden=true;
  if (appShell) appShell.inert=false;
  player.pause();
  player.removeAttribute("src");
  player.load();
  samplePlaying=false;
  if (localMediaUrl) { URL.revokeObjectURL(localMediaUrl); localMediaUrl=null; }
  if (wasOpen) {
    const target=playerOpener?.isConnected && !playerOpener.closest("[inert]") ? playerOpener : document.querySelector("#primary-nav .active");
    playerOpener=null;
    if (target) focusAndReveal(target);
  }
}

for (const name of ["loadstart","loadedmetadata","canplay","playing","waiting","stalled","error","ended","pause","seeking","seeked"]) {
  player.addEventListener(name,()=>{
    if (modal.hidden) return;
    playbackSession=recordPlaybackEvent(playbackSession,name,{
      now:performance.now(),errorCode:name==="error"?player.error?.code:null
    });
    renderPlaybackHealth();
  });
}
player.addEventListener("timeupdate", () => {
  if (!samplePlaying || !Number.isFinite(player.currentTime)) return;
  const sec = Math.floor(player.currentTime);
  if (sec !== safeProgress()) save("demo-position", sec);
});
player.addEventListener("ended", () => {
  if (samplePlaying) save("demo-position", "0");
});
player.addEventListener("error", () => {
  if (!modal.hidden) notify("Playback failed. Check source access, network and supported formats.");
});
filePicker.addEventListener("change", () => {
  const file = filePicker.files && filePicker.files[0];
  if (!file) return;
  const selectedUrl = URL.createObjectURL(file);
  showPlayer(file.name, selectedUrl, false, false, file.type.startsWith("audio/"));
  localMediaUrl = selectedUrl;
  filePicker.value = "";
});
document.getElementById("close-player").addEventListener("click", closePlayer);
document.addEventListener("change", event => {
  const element = event.target;
  if (!element || !(element instanceof HTMLElement)) return;
  if(element.id==="portable-file"){loadPortableFile(element);return;}
  if (element.id === "layout-mode") {
    const mode=normalizeMode(element.value);
    save("display-mode",mode);
    applyMode();
    return;
  }
  const id = element.dataset.fieldStatus || element.dataset.fieldNote;
  if (!id || !FIELD_TARGETS.some(target=>target.id===id)) return;
  const old = currentFieldReport();
  const patch = element.dataset.fieldStatus ? {status:element.value,at:new Date().toISOString()} : {note:element.value,at:new Date().toISOString()};
  const updated = updateFieldEntry(old,id,patch);
  storeFieldReport(updated);
  updateFieldSummary(updated);
  const indicator = Array.from(document.querySelectorAll("[data-field-indicator]")).find(el=>el.dataset.fieldIndicator===id);
  if (indicator) indicator.textContent = FIELD_STATES.find(state=>state.id===(updated.entries[id]?.status || "untested")).label;
});
document.addEventListener("pointerdown",event=>{
  if(view!=="device" || !deviceCapture || !event.target?.closest?.("#device-capture-target"))return;
  markDeviceInput(event.pointerType==="touch"?"touch":"pointer",event.pointerType==="touch"?"Tap / touch":"Pointer click");
});
document.addEventListener("input", event => {
  if(event.target?.id==="portable-import-text"){clearPortablePreview();return;}
  if(event.target?.id==="quick-query"){quickQuery=event.target.value.slice(0,100);renderQuickResults();return;}
  if (event.target && event.target.id === "game-query") {
    gameQuery=event.target.value.slice(0,80);
    renderGameCards();
    return;
  }
  if (event.target && event.target.id === "source-query") {
    sourceQuery = event.target.value.slice(0, 80);
    renderSourceList();
  }
});
document.addEventListener("click", event => {
  const link=event.target?.closest?.("a[data-quick-link]");
  if(link && !event.defaultPrevented){
    const item=quickItem(link.dataset.quickLink);
    // Only record the intended, unmodified curated destination, never user content.
    if(item && link.href===item.url)save("recent-links",JSON.stringify(recordRecent(recentQuickLinks(),item.key)));
  }
  const button = event.target.closest("button");
  if (!button) return;
  if(button.dataset.action==="redraw-clear"){
    redrawLog=newRedrawLog();updateRedrawDisplay();notify("Local redraw timings cleared.");return;
  }
  if(button.dataset.action==="portable-show"){showPortableExport();return;}
  if(button.dataset.action==="portable-download"){downloadPortableExport();return;}
  if(button.dataset.action==="portable-copy"){copyPortableExport();return;}
  if(button.dataset.action==="portable-preview"){previewPortableImport();return;}
  if(button.dataset.action==="portable-merge"){commitPortableImport("merge");return;}
  if(button.dataset.action==="portable-replace"){commitPortableImport("replace");return;}
  if (button.dataset.view) { setView(button.dataset.view); return; }
  if(button.dataset.quickFilter){
    quickFilter=button.dataset.quickFilter;
    document.querySelectorAll("[data-quick-filter]").forEach(el=>{
      const active=el.dataset.quickFilter===quickFilter;
      el.classList.toggle("selected",active);
      el.setAttribute("aria-pressed",String(active));
    });
    renderQuickResults();return;
  }
  if(button.dataset.quickFavorite){
    const item=quickItem(button.dataset.quickFavorite);
    if(!item)return;
    if(item.kind==="source"){
      const ids=sourceFavorites();
      save("favorite-sources",JSON.stringify(ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id]));
    }else{
      const ids=gameFavorites();
      save("favorite-games",JSON.stringify(ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id]));
    }
    renderQuickResults();
    const next=Array.from(document.querySelectorAll("[data-quick-favorite]")).find(el=>el.dataset.quickFavorite===item.key);
    if(next)focusAndReveal(next);
    else document.querySelector('[data-quick-filter="favorites"]')?.focus();
    return;
  }
  if(button.dataset.action==="clear-quick-recents"){
    save("recent-links","[]");
    renderQuickResults();
    notify("Recent selections cleared on this browser.");
    return;
  }
  const deviceAction=button.dataset.action;
  if(deviceAction==="device-start"){startDeviceCapture();return;}
  if(deviceAction==="device-stop"){stopDeviceCapture();return;}
  if(deviceAction==="device-frame"){startDeviceFrameSample();return;}
  if(deviceAction==="device-export"){exportDeviceLab();return;}
  if (button.dataset.gameCategory) {
    gameCategory=button.dataset.gameCategory;
    document.querySelectorAll("[data-game-category]").forEach(el=>{
      const active=el.dataset.gameCategory===gameCategory;
      el.classList.toggle("selected",active);
      el.setAttribute("aria-pressed",String(active));
    });
    renderGameCards();
    return;
  }
  if (button.dataset.gameOnlyFavorites) {
    gameFavoritesOnly=!gameFavoritesOnly;
    button.classList.toggle("selected",gameFavoritesOnly);
    button.setAttribute("aria-pressed",String(gameFavoritesOnly));
    renderGameCards();
    return;
  }
  if (button.dataset.gameFavorite) {
    const id=button.dataset.gameFavorite;
    if (!GAMES.some(game=>game.id===id)) return;
    const favorites=gameFavorites();
    const updated=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];
    save("favorite-games",JSON.stringify(updated));
    renderGameCards();
    const next=document.querySelector('[data-game-favorite="'+id+'"]');
    if (next) next.focus(); else document.querySelector("[data-game-only-favorites]")?.focus();
    return;
  }
  if (button.dataset.fieldLaunch === "demo") { showPlayer("Flower · CC0 playback demo", SAMPLE_URL, true); return; }
  if (button.dataset.fieldLaunch === "signal") { setView("arcade"); return; }
  if (button.dataset.sourceCategory) {
    sourceCategory = button.dataset.sourceCategory;
    document.querySelectorAll("[data-source-category]").forEach(el => {
      const active = el.dataset.sourceCategory === sourceCategory;
      el.classList.toggle("selected", active);
      el.setAttribute("aria-pressed", String(active));
    });
    renderSourceList();
    return;
  }
  if (button.dataset.sourceFavoritesOnly) {
    sourceFavoritesOnly = !sourceFavoritesOnly;
    button.classList.toggle("selected", sourceFavoritesOnly);
    button.setAttribute("aria-pressed", String(sourceFavoritesOnly));
    renderSourceList();
    return;
  }
  if (button.dataset.sourceFavorite) {
    const id = button.dataset.sourceFavorite;
    const existing = sourceFavorites();
    const updated = existing.includes(id) ? existing.filter(item => item !== id) : [...existing, id];
    save("favorite-sources", JSON.stringify(updated));
    renderSourceList();
    const next = Array.from(document.querySelectorAll("[data-source-favorite]")).find(el => el.dataset.sourceFavorite === id);
    if (next) next.focus();
    else document.querySelector("[data-source-favorites-only]")?.focus();
    return;
  }
  const action = button.dataset.action;
  if (action === "install-pwa" && installPrompt) {
    const prompt=installPrompt;
    installPrompt=null;
    // Must happen directly in the user activation handler.
    prompt.prompt();
    Promise.resolve(prompt.userChoice).then(result=>{
      if (result?.outcome !== "accepted") notify("Install dismissed. REEL still works in your browser.");
    }).catch(()=>notify("Browser installation did not complete."));
    button.hidden=true;
    return;
  }
  if (action === "inspect-formats") { renderMediaSupport(); return; }
  if (action === "export-health") { exportPlaybackHealth(); return; }
  if (action === "export-field") { exportFieldReport(); return; }
  if (action === "demo" || action === "resume") showPlayer("Flower · CC0 playback demo", SAMPLE_URL, true, action === "resume");
  if (action === "file") filePicker.click();
  if (action === "favorite") { save("favorite-demo", read("favorite-demo") === "yes" ? "no" : "yes"); render(); }
  if (action === "help") notify("Xbox: D-pad / left stick to navigate, A to select, B to close or go Home. Arcade: left/right and A to launch.");
  if (action === "reset") { save("demo-position", "0"); save("favorite-demo", "no"); render(); notify("Saved demo data cleared."); }
});
window.addEventListener("hashchange", () => {
  const target = window.location.hash.slice(1);
  if (views.includes(target) && target !== view) setView(target);
});
function focusAndReveal(element) {
  if (!element || typeof element.focus!=="function") return;
  element.focus({preventScroll:true});
  if (typeof element.scrollIntoView==="function") element.scrollIntoView({block:"nearest",inline:"nearest"});
}
function arcadeControlsActive() {
  return view==="arcade" && document.activeElement===document.getElementById("signal-breaker");
}
function exitArcadeControls() {
  if (!arcadeControlsActive()) return;
  const start=document.getElementById("start-game");
  if (start) focusAndReveal(start);
  const hint=document.getElementById("arcade-control-status");
  if (hint) hint.textContent="Game controls released. Use the remote to browse games, or press Start to return.";
}
function visibleControls(root,selector) {
  return Array.from(root.querySelectorAll(selector)).filter(el=>el.getClientRects().length>0 && !el.closest("[hidden]"));
}
function spatialFocus(direction,root=document,selector=FOCUSABLE_SELECTOR) {
  const elements=visibleControls(root,selector);
  if(!elements.length)return;
  const current=elements.indexOf(document.activeElement);
  const targetIndex=pickSpatialIndex(elements.map(el=>el.getBoundingClientRect()),current,direction);
  if(targetIndex>=0)focusAndReveal(elements[targetIndex]);
}
function modalFocusables() {
  return visibleControls(modal,"button:not(:disabled),video[controls]");
}
function trapModalTab(event) {
  const controls=modalFocusables();
  if(!controls.length) {event.preventDefault();return;}
  const index=controls.indexOf(document.activeElement);
  if(index<0){event.preventDefault();focusAndReveal(controls[0]);return;}
  if(event.shiftKey && index===0){event.preventDefault();focusAndReveal(controls[controls.length-1]);}
  else if(!event.shiftKey && index===controls.length-1){event.preventDefault();focusAndReveal(controls[0]);}
}

document.addEventListener("keydown", event => {
  if(view==="device" && deviceCapture && modal.hidden) {
    const action=inputLabel(event.key);
    if(action){
      event.preventDefault();
      markDeviceInput("keyboard",action);
      if(event.key==="Escape" || ["Backspace","BrowserBack","GoBack","Back"].includes(event.key))stopDeviceCapture();
      return;
    }
  }
  if (!modal.hidden) {
    if (event.key==="Tab") {trapModalTab(event);return;}
    if (remoteBackKey(event.key)) {event.preventDefault();closePlayer();return;}
    if (event.key==="MediaPlayPause") {
      event.preventDefault();
      if (player.paused) player.play().catch(()=>notify("Playback unavailable."));
      else player.pause();
    }
    return;
  }
  if (arcadeControlsActive()) {
    if (remoteBackKey(event.key)) {event.preventDefault();exitArcadeControls();return;}
    if (isArcadeControlKey(event.key)) return; // Signal Breaker owns the game keys.
  }
  if (isEditableTarget(event.target)) return;
  const directions={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  if(directions[event.key]) {event.preventDefault();spatialFocus(directions[event.key]);}
  else if(remoteBackKey(event.key) && view!=="home") {event.preventDefault();setView("home");}
});

function queueGamepadTick({connected=false,urgent=false}={}) {
  if(nextPadTick!==null){
    if(!urgent)return;
    if(padTickKind==="frame")cancelAnimationFrame(nextPadTick);
    else clearTimeout(nextPadTick);
    nextPadTick=null;
    padTickKind=null;
  }
  const policy=pollMode({connected,capturing:deviceCapture,hidden:document.hidden});
  if(urgent || policy.kind==="frame"){
    padTickKind="frame";
    nextPadTick=requestAnimationFrame(now=>{
      nextPadTick=null;padTickKind=null;
      gamepadLoop(now);
    });
  }else{
    padTickKind="timeout";
    nextPadTick=setTimeout(()=>{
      nextPadTick=null;padTickKind=null;
      queueGamepadTick({connected:true});
    },policy.delayMs);
  }
}
function gamepadLoop(now) {
  const pads=navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  const pad=pads[0];
  const connected=Boolean(pad);
  if(connected!==controllerWasConnected) {
    document.getElementById("controller-status").textContent=connected?"Controller connected":"Keyboard / Remote";
    controllerWasConnected=connected;
    if(normalizeMode(read("display-mode","auto"))==="auto")applyMode();
    updateDeviceLab();
  }
  if(view==="device" && deviceCapture && modal.hidden){
    const intent=gamepadIntent(pad);
    const label=gamepadLabel(intent,pad);
    if(label && label!==lastDevicePadLabel){
      markDeviceInput("gamepad",label);
      if(label==="B / Back"){deviceBackNeedsRelease=true;stopDeviceCapture();}
    }
    lastDevicePadLabel=label||"";
    lastPadAction=""; // Re-arm menu controller after explicit capture stop.
    queueGamepadTick({connected});
    return;
  }
  if(deviceBackNeedsRelease){
    if(pad?.buttons?.[1]?.pressed){queueGamepadTick({connected});return;}
    deviceBackNeedsRelease=false;
  }
  if(pad) {
    const action=gamepadIntent(pad,{gameFocused:arcadeControlsActive() && modal.hidden});
    const repeatable=["up","down","left","right"].includes(action);
    if(action && (action!==lastPadAction || (repeatable && now>=nextPadActionAt))) {
      if(action==="exit-game") exitArcadeControls();
      else if(action==="back"){
        if(!modal.hidden)closePlayer();
        else if(view!=="home")setView("home");
      } else if(action==="select"){
        if(!modal.hidden){
          if(document.activeElement instanceof HTMLElement && modal.contains(document.activeElement) && document.activeElement.matches("button"))document.activeElement.click();
          else if(player.paused)player.play().catch(()=>notify("Playback unavailable."));
          else player.pause();
        } else if(document.activeElement instanceof HTMLSelectElement && document.activeElement.dataset.fieldStatus){
          const select=document.activeElement;
          select.selectedIndex=(select.selectedIndex+1)%select.options.length;
          select.dispatchEvent(new Event("change",{bubbles:true}));
        } else if(document.activeElement instanceof HTMLElement && document.activeElement.matches("button,a[href],input,textarea,select")){
          document.activeElement.click();
        } else spatialFocus("right");
      } else if(["up","down","left","right"].includes(action)){
        if(!modal.hidden)spatialFocus(action,modal,"button:not(:disabled),video[controls]");
        else spatialFocus(action);
      }
      nextPadActionAt=now+(["select","back","exit-game"].includes(action)?400:185);
    }
    // B must be released before it can exit the parent view after leaving a game.
    lastPadAction=action==="exit-game"?"back":action;
  }else lastPadAction="";
  queueGamepadTick({connected});
}

const target = window.location.hash.slice(1);
if (views.includes(target)) view = target;
if (view === "live") sourceCategory = "live";
render();
window.addEventListener("resize",()=>{
  if (normalizeMode(read("display-mode","auto"))==="auto") applyMode();
});
window.addEventListener("online",updateConnection);
window.addEventListener("offline",updateConnection);
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  installPrompt=event;
  const button=document.getElementById("install-pwa");
  if (button) button.hidden=false;
});
window.addEventListener("appinstalled",()=>{
  installPrompt=null;
  const button=document.getElementById("install-pwa");
  if (button) button.hidden=true;
});
// Poll slowly when no controller is available; wake promptly on browser events.
window.addEventListener("gamepadconnected",()=>queueGamepadTick({urgent:true}));
window.addEventListener("gamepaddisconnected",()=>queueGamepadTick({urgent:true}));
document.addEventListener("visibilitychange",()=>queueGamepadTick({urgent:true}));
queueGamepadTick({urgent:true});
if ("serviceWorker" in navigator && (window.location.protocol === "https:" || ["localhost","127.0.0.1"].includes(window.location.hostname))) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
