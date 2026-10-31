import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FOCUSABLE_SELECTOR,rectCenter,pickSpatialIndex,gamepadIntent,isArcadeControlKey} from "../src/remote.js";

const rect=(left,top,width=80,height=48)=>({left,top,width,height});
const pad=({buttons=[],axes=[0,0]}={})=>({
  buttons:Array.from({length:16},(_,i)=>({pressed:buttons.includes(i)})),
  axes
});

test("directional focus chooses the nearest intended neighbor",()=>{
  const positions=[rect(0,0),rect(160,0),rect(0,120),rect(160,120)];
  assert.deepEqual(rectCenter(positions[0]),{x:40,y:24});
  assert.equal(pickSpatialIndex(positions,0,"right"),1);
  assert.equal(pickSpatialIndex(positions,0,"down"),2);
  assert.equal(pickSpatialIndex(positions,3,"up"),1);
  assert.equal(pickSpatialIndex(positions,3,"left"),2);
  assert.equal(pickSpatialIndex(positions,0,"left"),-1);
  assert.equal(pickSpatialIndex(positions,-1,"down"),0);
  assert.equal(pickSpatialIndex(positions,0,"bogus"),-1);
});
test("remote navigation ignores impossible or heavily off-axis choices",()=>{
  assert.equal(rectCenter({left:0,top:0,width:NaN,height:10}),null);
  assert.equal(pickSpatialIndex([rect(0,0),rect(0,1000)],0,"right"),-1);
  assert.equal(pickSpatialIndex([rect(0,0),rect(150,2000)],0,"right"),-1);
  assert.equal(pickSpatialIndex([],0,"down"),-1);
});
test("Xbox A/B and D-pad/stick select focus only when not inside game",()=>{
  assert.equal(gamepadIntent(pad({buttons:[0]})),"select");
  assert.equal(gamepadIntent(pad({buttons:[1]})),"back");
  assert.equal(gamepadIntent(pad({buttons:[1]}),{gameFocused:true}),"exit-game");
  assert.equal(gamepadIntent(pad({buttons:[0]}),{gameFocused:true}),"");
  assert.equal(gamepadIntent(pad({buttons:[14]}),{gameFocused:true}),"");
  assert.equal(gamepadIntent(pad({buttons:[12]})),"up");
  assert.equal(gamepadIntent(pad({buttons:[13]})),"down");
  assert.equal(gamepadIntent(pad({buttons:[14]})),"left");
  assert.equal(gamepadIntent(pad({buttons:[15]})),"right");
  assert.equal(gamepadIntent(pad({axes:[-0.72,0]})),"left");
  assert.equal(gamepadIntent(pad({axes:[0,0.71]})),"down");
  assert.equal(gamepadIntent(pad({axes:[0.2,0.2]})),"");
  assert.equal(gamepadIntent(null),"");
});
test("arrow keys belong to the game only when its canvas owns focus",()=>{
  assert.equal(isArcadeControlKey("ArrowLeft"),true);
  assert.equal(isArcadeControlKey("Enter"),true);
  assert.equal(isArcadeControlKey("Escape"),false);
  assert.match(FOCUSABLE_SELECTOR,/canvas\[tabindex\]/);
  assert.match(FOCUSABLE_SELECTOR,/main a\[href\]/);
});
test("UI registers modal focus and restores opener with no background interception",()=>{
  const app=readFileSync("src/app.js","utf8");
  const markup=readFileSync("index.html","utf8");
  assert.match(app,/appShell\.inert = true/);
  assert.match(app,/appShell\.inert=false/);
  assert.match(app,/playerOpener = document\.activeElement/);
  assert.match(app,/playerOpener\?\.isConnected/);
  assert.match(app,/function trapModalTab/);
  assert.match(app,/function modalFocusables/);
  assert.match(app,/event\.key==="Tab"/);
  assert.match(markup,/role="dialog"/);
  assert.match(markup,/video id="media-player" tabindex="0"/);
});
test("controller gameplay must be entered explicitly and exited without double B activation",()=>{
  const app=readFileSync("src/app.js","utf8");
  const game=readFileSync("src/arcade.js","utf8");
  assert.match(app,/arcadeControlsActive/);
  assert.match(app,/exitArcadeControls/);
  assert.match(app,/lastPadAction=action==="exit-game"\?"back":action/);
  assert.match(app,/const repeatable=\["up","down","left","right"\]/);
  assert.match(app,/focusAndReveal/);
  assert.match(app,/scrollIntoView/);
  assert.match(game,/isPlayingWithControls/);
  assert.match(game,/if \(pad && isPlayingWithControls\(\)\)/);
  assert.match(game,/canvas\.focus\(\{preventScroll:true\}\)/);
  assert.match(app,/id="arcade-control-status"/);
  assert.match(app,/canvas id="signal-breaker"[^>]*tabindex="0"/);
});
test("offline cache only includes the new first-party remote module",()=>{
  const sw=readFileSync("sw.js","utf8");
  assert.match(sw,/reel-theater-shell-v6/);
  assert.match(sw,/src\/remote\.js/);
  assert.match(sw,/url\.origin !== self\.location\.origin/);
  assert.doesNotMatch(sw,/tubitv\.com|flower\.mp4|michaelwave369\.github\.io/);
});
