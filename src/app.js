import { startArcade } from "./arcade.js";
import {SOURCES, SOURCE_CATEGORIES, findSources, parseFavoriteSourceIds} from "./sources.js";
import {FIELD_KEY,FIELD_GAME_URL,FIELD_STATES,FIELD_TARGETS,parseFieldReport,updateFieldEntry,fieldCounts,fieldMarkup} from "./field.js";

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

function read(key, fallback = "") {
  try { return window.localStorage.getItem("reel-theater:" + key) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { window.localStorage.setItem("reel-theater:" + key, String(value)); return true; }
  catch { return false; }
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
    '<button class="tile" data-view="arcade"><span class="icon">✧</span><h3>REEL Arcade</h3><p>Signal Breaker: a playable, offline-ready game.</p></button>' +
    '</section>' +
    '<div class="section-heading"><div><h2>Explore more</h2><p>Thoughtful shortcuts, not twelve layers of menus.</p></div></div>' +
    '<section class="card-grid">' +
    '<div class="feature-card"><div class="tag">Media discovery</div><h3>One-stop Source Guide</h3><p>Official free movies and live-TV destinations. No add-ons to install.</p><button class="action secondary" data-view="watch">Browse official services</button></div>' +
    '<div class="feature-card"><div class="tag">Xbox field testing</div><h3>The Shayne Test</h3><p>Check which services and games actually work on your Series X, then download an honest report.</p><button class="action secondary" data-view="field">Open Field Lab</button></div></section>';
}
function watch() {
  return '<div class="page-heading"><div class="eyebrow">THE WATCH ROOM</div><h1>Pick something. Press play.</h1><p>A working player, without digging through repositories. The sample is hosted by MDN; local-file playback never uploads your media.</p></div>' +
    '<div class="card-grid"><div class="feature-card"><div class="tag">CC0 demo · online</div><h3>Flower: Playback Sample</h3><p>A small Creative Commons Zero video used to verify your Xbox browser playback. Network required.</p><button class="action" data-action="demo">▷ Play sample</button></div>' +
    '<div class="feature-card"><div class="tag">Your device · private</div><h3>Open My Media</h3><p>Choose a supported video or audio file using the browser file picker. No upload, scanning, or saved file access.</p><button class="action secondary" data-action="file">▤ Choose a file</button></div></div>' +
    '<p class="fineprint">Commercial streaming services may require their own authorized app and DRM. Browser playback support is format and platform dependent. No unauthorized add-on sources are installed.</p>' + sourceSection();
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
  return '<div class="page-heading"><div class="eyebrow">REEL ARCADE · ORIGINAL MINI-GAME</div><h1>Signal Breaker</h1><p>An actual playable paddle-and-orbs game, built into REEL Theater. Not a placeholder linking to a broken add-on. Works offline once the app shell is cached.</p></div>' +
    '<div class="arcade-stage"><canvas id="signal-breaker" width="960" height="540" aria-label="Signal Breaker arcade game" role="img"></canvas><div class="arcade-tools"><div class="actions"><button id="start-game" class="action">✧ Start / Restart</button><button data-view="home" class="action secondary">⌂ Home</button></div><p>← → / A D / left stick to move · A or Space to launch · B or Escape to leave</p></div></div>' +
    '<div class="section-heading"><div><h2>More from our arcade</h2><p>Original game launcher. Xbox Edge compatibility is still unverified.</p></div></div>' +
    '<div class="feature-card"><div class="tag">Original game · Xbox Edge untested</div><h3>Break the Matrix</h3><p>Open the existing free browser FPS in a separate tab. Gameplay, controller input and performance must be checked on Shayne’s Xbox before marking it compatible.</p><a class="action secondary" href="' + FIELD_GAME_URL + '" target="_blank" rel="noopener noreferrer">Launch original game ↗</a><button class="action ghost" data-view="field">Record Xbox result</button></div>' +
    '<p class="fineprint">Signal Breaker is a bundled original mini-game. External games are not embedded, proxied, or claimed to be Xbox tested.</p>';
}
function settings() {
  const online = navigator.onLine;
  const gamepad = !!(navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean));
  const boot = Math.round(performance.now() - launchedAt);
  return '<div class="page-heading"><div class="eyebrow">SETTINGS & HEALTH</div><h1>Know what works.</h1><p>No hidden diagnostics, no account, no misleading green indicators. These observations are from this browser session only.</p></div>' +
    '<section class="status-grid"><div class="status-block"><h3>Controller input</h3><p>' + (gamepad ? 'Gamepad detected. Press A to select and B to return.' : 'No gamepad currently detected. Press a controller button, or use keyboard/mouse.') + '</p></div>' +
    '<div class="status-block"><h3>Network</h3><p>Browser reports ' + (online ? 'online' : 'offline') + '. This does not prove that an external stream is playable.</p></div>' +
    '<div class="status-block"><h3>Initial app startup</h3><p>' + boot + ' ms elapsed since page navigation to this settings view. Not a device-wide performance benchmark.</p></div>' +
    '<div class="status-block"><h3>Privacy and persistence</h3><p>Only demo progress and demo favorite use browser storage. Local media is opened only after your selection; it is never uploaded.</p></div></section>' +
    '<div class="section-heading"><div><h2>Controls & recovery</h2></div></div>' +
    '<div class="info-panel"><p><strong>Xbox:</strong> D-pad or left stick moves focus. A selects. B returns Home or closes the player. In the arcade, horizontal controls move the paddle.</p><p><strong>Keyboard:</strong> Arrow keys move focus. Enter selects. Escape goes Home. Arcade: A/D or arrows, Space to launch.</p><p><strong>Playback issues:</strong> If the online demo fails, check the source connection, codec support, and Edge behavior. Browser DRM, SMB/NAS, USB scanning, and background IPTV recording are not supplied in this pilot.</p><button class="action secondary" data-action="reset">Clear saved demo progress and favorite</button></div>';
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
  if (view === "field") {
    const observations = currentFieldReport().entries;
    document.querySelectorAll("[data-field-note]").forEach(el=>{el.value = observations[el.dataset.fieldNote]?.note || "";});
  }
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
  if (first) first.focus({preventScroll:true});
}
function showPlayer(title, url, isSample, resume = false) {
  closePlayer();
  samplePlaying = isSample;
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-note").textContent = isSample ?
    "CC0 demonstration stream hosted by MDN. Requires a network connection and supported browser codec." :
    "This local file stays on your device. Playback depends on browser access and codec support.";
  modal.hidden = false;
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
  player.pause();
  player.removeAttribute("src");
  player.load();
  modal.hidden = true;
  samplePlaying = false;
  if (localMediaUrl) { URL.revokeObjectURL(localMediaUrl); localMediaUrl = null; }
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
  if (event.target && event.target.id === "source-query") {
    sourceQuery = event.target.value.slice(0, 80);
    renderSourceList();
  }
});
document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.view) { setView(button.dataset.view); return; }
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
function spatialFocus(direction) {
  const elements = Array.from(document.querySelectorAll("#primary-nav button, main button:not(:disabled), main a[href], main input:not(:disabled), .topbar button"))
    .filter(el => el.getClientRects().length > 0);
  if (!elements.length) return;
  const current = document.activeElement;
  if (!elements.includes(current)) { elements[0].focus(); return; }
  const src = current.getBoundingClientRect();
  const sx = src.left + src.width / 2, sy = src.top + src.height / 2;
  const possible = elements.map(el => {
    if (el === current) return null;
    const r = el.getBoundingClientRect(), dx = r.left + r.width / 2 - sx, dy = r.top + r.height / 2 - sy;
    const primary = direction === "left" ? -dx : direction === "right" ? dx : direction === "up" ? -dy : dy;
    const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
    if (primary < 8 || secondary > primary * 3 + 140) return null;
    return {el, score:primary + secondary * 1.4};
  }).filter(Boolean).sort((a,b) => a.score - b.score);
  if (possible[0]) possible[0].el.focus();
}
document.addEventListener("keydown", event => {
  if (event.target && event.target.matches("input")) return;
  if (!modal.hidden) {
    if (event.key === "Escape") { event.preventDefault(); closePlayer(); }
    return;
  }
  if (view === "arcade" && ["ArrowLeft","ArrowRight"," ","a","d","A","D"].includes(event.key)) return;
  const directions = {ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  if (directions[event.key]) { event.preventDefault(); spatialFocus(directions[event.key]); }
  else if (event.key === "Escape" && view !== "home") { event.preventDefault(); setView("home"); }
});
function gamepadLoop(now) {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  const pad = pads[0];
  const connected = !!pad;
  if (connected !== controllerWasConnected) {
    document.getElementById("controller-status").textContent = connected ? "Controller connected" : "Keyboard / Remote";
    controllerWasConnected = connected;
  }
  if (pad) {
    let action = "";
    const pressed = i => !!(pad.buttons[i] && pad.buttons[i].pressed);
    if (pressed(1)) action = "back";
    else if (pressed(0)) action = "select";
    else if (view !== "arcade" && modal.hidden) {
      if (pressed(12) || (pad.axes[1] || 0) < -.6) action = "up";
      else if (pressed(13) || (pad.axes[1] || 0) > .6) action = "down";
      else if (pressed(14) || (pad.axes[0] || 0) < -.6) action = "left";
      else if (pressed(15) || (pad.axes[0] || 0) > .6) action = "right";
    }
    if (action && (action !== lastPadAction || now >= nextPadActionAt)) {
      if (action === "back") { if (!modal.hidden) closePlayer(); else if (view !== "home") setView("home"); }
      else if (action === "select" && modal.hidden) {
        if (view !== "arcade") {
          if (document.activeElement instanceof HTMLElement && document.activeElement.matches("button, a[href], input")) document.activeElement.click();
          else spatialFocus("right");
        }
      } else if (["up","down","left","right"].includes(action)) spatialFocus(action);
      nextPadActionAt = now + (action === "select" || action === "back" ? 400 : 185);
    }
    lastPadAction = action;
  } else lastPadAction = "";
  requestAnimationFrame(gamepadLoop);
}
const target = window.location.hash.slice(1);
if (views.includes(target)) view = target;
if (view === "live") sourceCategory = "live";
render();
requestAnimationFrame(gamepadLoop);
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
