import { startArcade } from "./arcade.js";
import {SOURCES, SOURCE_CATEGORIES, findSources, parseFavoriteSourceIds} from "./sources.js";
import {FIELD_KEY,FIELD_GAME_URL,FIELD_STATES,FIELD_TARGETS,parseFieldReport,updateFieldEntry,fieldCounts,fieldMarkup} from "./field.js";
import {UI_MODES,normalizeMode,resolveMode,platformGuide,isEditableTarget,remoteBackKey} from "./platform.js";
import {GAMES,GAME_CATEGORIES,filterGames,parseGameFavorites} from "./games.js";
import {createPlaybackSession,recordPlaybackEvent,safePlaybackSummary,playbackGuidance} from "./playback.js";
import {FOCUSABLE_SELECTOR,pickSpatialIndex,gamepadIntent,isArcadeControlKey} from "./remote.js";

const main = document.getElementById("main-content");
const modal = document.getElementById("player-modal");
const player = document.getElementById("media-player");
const filePicker = document.getElementById("local-file");
const toast = document.getElementById("toast");
const SAMPLE_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const REEL_URL = "https://github.com/MichaelWave369/ReelCommons";
const views = ["home", "watch", "live", "arcade", "library", "field", "settings"];
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
let installPrompt = null;
let currentMode = "desktop";
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
      '<a class="action secondary source-open" href="' + source.url + '" target="_blank" rel="noopener noreferrer" aria-label="Open ' + source.name + ' official site">Open official site ↗</a></article>';
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
      '<a class="action secondary game-open" href="'+game.url+'" target="_blank" rel="noopener noreferrer">'+(game.entry==="game"?'Open browser game ↗':'View project ↗')+'</a></article>';
  }).join("") : '<div class="source-empty"><strong>No matches here.</strong><p>Clear search or Favorites. We do not invent games to fill a grid.</p></div>';
}
function hero() {
  return '<section class="hero"><div class="hero-copy"><div class="eyebrow">✦ YOUR LIVING ROOM. REIMAGINED.</div><h1>Less waiting.<br><em>More watching.</em></h1><p>A home theater that gets out of your way. Watch a sample, play a real arcade game, or bring your own media. No accounts. No mystery repositories.</p><div class="actions"><button data-action="demo" class="action">▷ Watch demo video</button><button data-view="arcade" class="action secondary">✧ Open Arcade</button><button data-view="watch" class="action ghost">⌕ Discover free TV</button></div></div></section>';
}
function home() {
  const progress = safeProgress();
  return hero() +
    '<div class="section-heading"><div><h2>Jump right in</h2><p>No loading screens between you and the good stuff.</p></div></div>' +
    '<section class="tile-grid" aria-label="Quick actions">' +
    '<button class="tile" data-action="' + (progress > 0 ? 'resume' : 'demo') + '"><span class="icon">▶</span><h3>' + (progress > 0 ? 'Continue Watching' : 'Try the Player') + '</h3><p>' + (progress > 0 ? 'Resume demo at ' + timestamp(progress) : 'Real HTML5 video, not a fake play button.') + '</p></button>' +
    '<button class="tile" data-action="file"><span class="icon">▤</span><h3>My Media</h3><p>Open a video or audio file you choose.</p></button>' +
    '<button class="tile" data-view="arcade"><span class="icon">✧</span><h3>REEL Arcade</h3><p>Signal Breaker plus a curated library of original browser games.</p></button>' +
    '</section>' +
    '<div class="section-heading"><div><h2>Explore more</h2><p>Thoughtful shortcuts, not twelve layers of menus.</p></div></div>' +
    '<section class="card-grid">' +
    '<div class="feature-card"><div class="tag">Media discovery</div><h3>One-stop Source Guide</h3><p>Official free movies and live-TV destinations. No add-ons to install.</p><button class="action secondary" data-view="watch">Browse official services</button></div>' +
    '<div class="feature-card"><div class="tag">Xbox field testing</div><h3>The Shayne Test</h3><p>Check which services and games actually work on your Series X, then download an honest report.</p><button class="action secondary" data-view="field">Open Field Lab</button></div></section>';
}
function playbackHealthSection() {
  return '<section class="health-panel" aria-label="Playback diagnostics"><div class="section-heading"><div><h2>Playback Health</h2><p>Live media-element observations from this session, not an external-provider availability check.</p></div></div>' +
    '<div class="health-details"><div><span class="eyebrow">CURRENT ATTEMPT</span><h3 id="health-status">Not started</h3><p id="health-guidance">Choose the demo or a local file to see events.</p><p id="health-first-event">First playing event: not observed</p></div>' +
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
  const blob=new Blob([JSON.stringify({schema:"REEL_PLAYBACK_SESSION_V1",summary,disclaimer:"Local event signals only; not proof of audio/video rendering or provider support."},null,2)],{type:"application/json"});
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
    '<p class="fineprint">Commercial streaming services may require their own authorized app and DRM. Browser playback support is format and platform dependent. No unauthorized add-on sources are installed.</p>' + playbackHealthSection() + sourceSection();
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
    '<p class="fineprint">An Install button is shown only when the current browser actually offers an installation prompt. Fire TV Silk and Xbox Edge may support bookmarking without offering installation. Installing does not guarantee remote input or media codecs.</p></section>' +
    '<div class="section-heading"><div><h2>Environment & privacy</h2></div></div>' +
    '<section class="status-grid"><div class="status-block"><h3>Input</h3><p>'+(gamepad?'Gamepad reported by browser.':'No gamepad currently reported.')+' Keyboard arrows and Enter also work where the browser forwards them.</p></div>' +
    '<div class="status-block"><h3>Connection</h3><p>Browser reports '+(online?'online':'offline')+'. This is not a test of third-party streaming availability.</p></div>' +
    '<div class="status-block"><h3>Offline app shell</h3><p>'+(navigator.serviceWorker?.controller?'Service worker currently controls this page.':'Not currently controlled by a service worker; offline use is not yet confirmed.')+' External videos and providers are never cached.</p></div>' +
    '<div class="status-block"><h3>Local-only data</h3><p>Demo progress, source favorites, preferred layout and optional Field Lab notes use browser storage. No telemetry or automatic uploads.</p></div></section>' +
    '<div class="section-heading"><div><h2>Controls & recovery</h2></div></div>' +
    '<div class="info-panel"><p><strong>TV / Fire remote:</strong> D-pad or arrow keys navigate if delivered by the browser; center or Enter selects. Back or Escape returns Home. Some TV browsers use their own cursor instead of key navigation.</p><p><strong>Xbox gamepad:</strong> D-pad or left stick navigates; A selects; B returns Home or closes player. Arcade uses horizontal input.</p><p><strong>Touch:</strong> use bottom navigation, tap cards, scroll naturally, and use on-screen keyboard for search.</p><p><strong>Playback:</strong> Commercial DRM and SMB/USB library browsing still require authorized supported apps or future native/media-server integration.</p><button class="action secondary" data-action="reset">Clear saved demo progress and favorite</button></div>';
}

const pages = {home, watch, live, arcade, library, field:()=>fieldMarkup(currentFieldReport()), settings};
function render() {
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
  const gameSearch = document.getElementById("game-query");
  if (gameSearch) { gameSearch.value=gameQuery; renderGameCards(); }
  if (view === "field") {
    const observations = currentFieldReport().entries;
    document.querySelectorAll("[data-field-note]").forEach(el=>{el.value = observations[el.dataset.fieldNote]?.note || "";});
  }
  applyMode();
  updateConnection();
  renderPlaybackHealth();
}
function setView(target) {
  if (!views.includes(target)) return;
  if (!modal.hidden) closePlayer();
  view = target;
  if (target === "live") sourceCategory = "live";
  else if (target === "watch") sourceCategory = "all";
  if (window.location.hash !== "#" + target) window.location.hash = target;
  render();
  const first = main.querySelector("button, a[href]");
  if (first) focusAndReveal(first);
}
function showPlayer(title, url, isSample, resume = false) {
  closePlayer();
  playerOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  samplePlaying = isSample;
  playbackSession = createPlaybackSession({kind:isSample?"demo":"local",started:performance.now()});
  renderPlaybackHealth();
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-note").textContent = isSample ?
    "CC0 demonstration stream hosted by MDN. Requires a network connection and supported browser codec." :
    "This local file stays on your device. Playback depends on browser access and codec support.";
  modal.hidden = false;
  if (appShell) appShell.inert = true;
  player.src = url;
  player.load();
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
  showPlayer(file.name, selectedUrl, false);
  localMediaUrl = selectedUrl;
  filePicker.value = "";
});
document.getElementById("close-player").addEventListener("click", closePlayer);
document.addEventListener("change", event => {
  const element = event.target;
  if (!element || !(element instanceof HTMLElement)) return;
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
document.addEventListener("input", event => {
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
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.view) { setView(button.dataset.view); return; }
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

function gamepadLoop(now) {
  const pads=navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  const pad=pads[0];
  const connected=Boolean(pad);
  if(connected!==controllerWasConnected) {
    document.getElementById("controller-status").textContent=connected?"Controller connected":"Keyboard / Remote";
    controllerWasConnected=connected;
    if(normalizeMode(read("display-mode","auto"))==="auto")applyMode();
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
  requestAnimationFrame(gamepadLoop);
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
requestAnimationFrame(gamepadLoop);
if ("serviceWorker" in navigator && (window.location.protocol === "https:" || ["localhost","127.0.0.1"].includes(window.location.hostname))) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
