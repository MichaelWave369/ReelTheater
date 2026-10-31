// Presentation-only capability hints. Never interpret a user agent as platform certification.
export const UI_MODES = Object.freeze([
  Object.freeze({id:"auto",label:"Automatic"}),
  Object.freeze({id:"tv",label:"TV / remote"}),
  Object.freeze({id:"touch",label:"Phone / tablet"}),
  Object.freeze({id:"desktop",label:"Desktop"})
]);

export function normalizeMode(value) {
  return UI_MODES.some(mode=>mode.id===value) ? value : "auto";
}

export function resolveMode(preference, {width=1200,coarse=false,touchPoints=0,gamepad=false}={}) {
  const selected=normalizeMode(preference);
  if (selected!=="auto") return selected;
  if (gamepad && width >= 850) return "tv";
  if (width <= 800) return "touch";
  if (coarse && width >= 1300 && touchPoints===0) return "tv";
  if (coarse || (touchPoints>0 && width <= 1250)) return "touch";
  return "desktop";
}

export function platformGuide({userAgent="",platform="",maxTouchPoints=0}={}) {
  const ua=String(userAgent), os=String(platform);
  if (/Silk\/|AFT[A-Z0-9]*|Fire TV/i.test(ua)) return {
    id:"fire",title:"Fire TV / Fire Stick (Silk)",
    guidance:"Open REEL Theater in Silk, then use Silk's menu to bookmark the site. D-pad moves focus where Silk forwards arrow keys; center/Select activates. The remote may also move a browser cursor. Native app installation is not promised."
  };
  if (/Xbox/i.test(ua)) return {
    id:"xbox",title:"Xbox Series X / Edge",
    guidance:"Open REEL Theater in Xbox Edge and save it as a favorite. Use D-pad or left stick and A/B where available. An installable Xbox app is not promised; actual controller and playback results need device tests."
  };
  if (/iPhone|iPad|iPod/i.test(ua) || (os==="MacIntel" && maxTouchPoints>1)) return {
    id:"ios",title:"iPhone / iPad",
    guidance:"In Safari, use the Share menu, Add to Home Screen, and Open as Web App where offered. This depends on your installed iOS/iPadOS version and browser."
  };
  if (/Android/i.test(ua)) return {
    id:"android",title:"Android phone / tablet",
    guidance:"In Chrome or a compatible browser, open the browser menu and choose Install app or Add to Home screen if available. Some browsers create a shortcut rather than an installed WebAPK."
  };
  return {
    id:"desktop",title:"Desktop / laptop",
    guidance:"Use the browser's Install app or Create shortcut menu if present, or bookmark the page. Keyboard arrows and Enter work. Installation is optional, not required to use the website."
  };
}

export function isEditableTarget(target) {
  if (!target || typeof target.matches !== "function") return false;
  return target.matches("input, textarea, select, [contenteditable], [role='textbox']");
}
export function remoteBackKey(key) {
  return ["Escape","Backspace","BrowserBack","GoBack"].includes(key);
}
