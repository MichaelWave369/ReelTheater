import { startArcade } from "./arcade.js";

const main = document.getElementById("main-content");
const modal = document.getElementById("player-modal");
const player = document.getElementById("media-player");
const filePicker = document.getElementById("local-file");
const toast = document.getElementById("toast");
const SAMPLE_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const REEL_URL = "https://github.com/MichaelWave369/ReelCommons";
const views = ["home", "watch", "live", "arcade", "library", "settings"];
const launchedAt = performance.now();
let view = "home";
let arcadeCleanup = null;
let localMediaUrl = null;
let samplePlaying = false;
let controllerWasConnected = false;
let lastPadAction = "";
let nextPadActionAt = 0;
let toastTimer;

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
function hero() {
  return '<section class="hero"><div class="hero-copy"><div class="eyebrow">✦ YOUR LIVING ROOM. REIMAGINED.</div><h1>Less waiting.<br><em>More watching.</em></h1><p>A home theater that gets out of your way. Watch a sample, play a real arcade game, or bring your own media. No accounts. No mystery repositories.</p><div class="actions"><button data-action="demo" class="action">▷ Watch demo video</button><button data-view="arcade" class="action secondary">✧ Open Arcade</button></div></div></section>';
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
    '<div class="feature-card"><div class="tag">Media discovery</div><h3>REEL Commons</h3><p>Discover legitimate free streaming sources through our separate REEL project.</p>' + reelLink("Explore the project ↗") + '</div>' +
    '<div class="feature-card"><div class="tag">Built for Xbox</div><h3>Controller-first</h3><p>Use the D-pad or left stick, A to select, B to go back. Keyboard and mouse also work.</p><button class="action secondary" data-view="settings">See controls</button></div></section>';
}
function watch() {
  return '<div class="page-heading"><div class="eyebrow">THE WATCH ROOM</div><h1>Pick something. Press play.</h1><p>A working player, without digging through repositories. The sample is hosted by MDN; local-file playback never uploads your media.</p></div>' +
    '<div class="card-grid"><div class="feature-card"><div class="tag">CC0 demo · online</div><h3>Flower: Playback Sample</h3><p>A small Creative Commons Zero video used to verify your Xbox browser playback. Network required.</p><button class="action" data-action="demo">▷ Play sample</button></div>' +
    '<div class="feature-card"><div class="tag">Your device · private</div><h3>Open My Media</h3><p>Choose a supported video or audio file using the browser file picker. No upload, scanning, or saved file access.</p><button class="action secondary" data-action="file">▤ Choose a file</button></div></div>' +
    '<p class="fineprint">Commercial streaming services may require their own authorized app and DRM. Browser playback support is format and platform dependent. No unauthorized add-on sources are installed.</p>';
}
function live() {
  return '<div class="page-heading"><div class="eyebrow">LIVE TV</div><h1>No dead channel buttons.</h1><p>This room is intentionally honest. There is no invented channel lineup and no unverified live feed behind the artwork.</p></div>' +
    '<div class="info-panel"><strong>REEL Commons is the source-discovery foundation.</strong><p>For now, this opens the existing REEL Commons project. A future rung can add verified official live-channel links, a clear availability monitor and authorized playlists. We will not pretend a site-directory link is a playable television stream.</p>' + reelLink("Open REEL Commons project ↗") + '</div>' +
    '<div class="section-heading"><div><h2>Next integration</h2><p>Verified channel manifests, clear source labels, and device-tested playback.</p></div></div>' +
    '<div class="status-grid"><div class="status-block"><h3>Channel catalog</h3><p>Planned: explicit, curated, licensed or authorized sources.</p></div><div class="status-block"><h3>EPG / DVR</h3><p>Planned native-capability work; not available in this browser pilot.</p></div></div>';
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
    '<p class="fineprint">This is an original in-browser mini-game. Break the Matrix and the rest of the game ecosystem are potential future arcade entries and must pass real Xbox controller tests first.</p>';
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
const pages = {home, watch, live, arcade, library, settings};
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
}
function setView(target) {
  if (!views.includes(target)) return;
  if (!modal.hidden) closePlayer();
  view = target;
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
document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.view) { setView(button.dataset.view); return; }
  const action = button.dataset.action;
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
  const elements = Array.from(document.querySelectorAll("#primary-nav button, main button:not(:disabled), main a[href], .topbar button"))
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
          if (document.activeElement instanceof HTMLElement && document.activeElement.matches("button, a[href]")) document.activeElement.click();
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
render();
requestAnimationFrame(gamepadLoop);
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
