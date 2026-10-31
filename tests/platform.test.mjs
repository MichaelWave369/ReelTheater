import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {UI_MODES,normalizeMode,resolveMode,platformGuide,isEditableTarget,remoteBackKey} from "../src/platform.js";

test("manual presentation is safe and takes priority over heuristics",()=>{
  assert.deepEqual(UI_MODES.map(item=>item.id),["auto","tv","touch","desktop"]);
  assert.equal(normalizeMode("bad"),"auto");
  assert.equal(resolveMode("tv",{width:350}),"tv");
  assert.equal(resolveMode("touch",{width:1920,gamepad:true}),"touch");
  assert.equal(resolveMode("desktop",{coarse:true}),"desktop");
});
test("auto layout selects TV, phone, tablet or desktop conservatively",()=>{
  assert.equal(resolveMode("auto",{width:1920,gamepad:true}),"tv");
  assert.equal(resolveMode("auto",{width:1920,tvBrowser:true}),"tv");
  assert.equal(resolveMode("auto",{width:1200,coarse:true,touchPoints:0}),"touch");
  assert.equal(resolveMode("auto",{width:800}),"touch");
  assert.equal(resolveMode("auto",{width:1200}),"desktop");
  assert.equal(resolveMode("auto",{width:1440,coarse:true,touchPoints:0}),"tv");
});
test("setup guidance does not promise native Xbox or Fire installs",()=>{
  const fire=platformGuide({userAgent:"Mozilla/5.0 (Linux; U; Android 9; en-us; AFTMM) Silk/100"});
  const xbox=platformGuide({userAgent:"Mozilla/5.0 (Xbox; Xbox One) Edge/99"});
  const phone=platformGuide({userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 18)"});
  const ipad=platformGuide({userAgent:"Mozilla/5.0 (Macintosh)",platform:"MacIntel",maxTouchPoints:5});
  const android=platformGuide({userAgent:"Mozilla/5.0 (Linux; Android 15)"});
  const desktop=platformGuide({userAgent:"Mozilla/5.0 (Windows NT 10.0)"});
  assert.equal(fire.id,"fire");
  assert.match(fire.guidance,/bookmark/);
  assert.equal(xbox.id,"xbox");
  assert.match(xbox.guidance,/not promised/);
  assert.equal(phone.id,"ios");
  assert.equal(ipad.id,"ios");
  assert.equal(android.id,"android");
  assert.equal(desktop.id,"desktop");
  assert.equal(platformGuide({userAgent:"Mozilla/5.0 (Android 15; Tablet) Silk/100"}).id,"android");
});
test("key handling lets text fields retain Backspace",()=>{
  assert.equal(remoteBackKey("Backspace"),true);
  assert.equal(remoteBackKey("Escape"),true);
  assert.equal(remoteBackKey("BrowserBack"),true);
  assert.equal(remoteBackKey("Enter"),false);
  assert.equal(isEditableTarget(null),false);
  assert.equal(isEditableTarget({matches:query=>query.includes("input")}),true);
});
test("app wires install prompt only to user gesture and listens for remote keys",()=>{
  const app=readFileSync("src/app.js","utf8");
  const html=readFileSync("index.html","utf8");
  const css=readFileSync("styles.css","utf8");
  assert.match(app,/beforeinstallprompt/);
  assert.match(app,/prompt\.prompt\(\)/);
  assert.match(app,/data-action="install-pwa"/);
  assert.match(app,/platformGuide/);
  assert.match(app,/applyMode/);
  assert.match(app,/isEditableTarget\(event\.target\)/);
  assert.match(app,/remoteBackKey\(event\.key\)/);
  assert.match(css,/html\[data-ui-mode="tv"\]/);
  assert.match(css,/html\[data-ui-mode="touch"\]/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(html,/id="connection-status"/);
  assert.match(html,/rel="manifest"/);
});
