import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  MAX_REDRAWS,IDLE_PAD_POLL_MS,HIDDEN_PAD_POLL_MS,
  pollMode,newRedrawLog,appendRedraw,redrawSummary
} from "../src/performance.js";

test("controller polling uses animation frames only when connected or actively testing",()=>{
  assert.deepEqual(pollMode({connected:false,capturing:false,hidden:false}),{kind:"timeout",delayMs:IDLE_PAD_POLL_MS});
  assert.deepEqual(pollMode({connected:true,capturing:false,hidden:false}),{kind:"frame",delayMs:0});
  assert.deepEqual(pollMode({connected:false,capturing:true,hidden:false}),{kind:"frame",delayMs:0});
  assert.deepEqual(pollMode({connected:true,capturing:true,hidden:true}),{kind:"timeout",delayMs:HIDDEN_PAD_POLL_MS});
  assert.ok(IDLE_PAD_POLL_MS>=200);
});

test("redraw timing samples are bounded, finite, and session-only",()=>{
  const initial=newRedrawLog();
  assert.deepEqual(initial,{samples:[]});
  assert.equal(redrawSummary(initial),null);
  assert.equal(appendRedraw(initial,{view:"watch",durationMs:-1}),initial);
  assert.equal(appendRedraw(initial,{view:"watch",durationMs:Infinity}),initial);
  assert.equal(appendRedraw(initial,{view:"watch",durationMs:10001}),initial);
  let log=initial;
  for(let i=0;i<80;i++)log=appendRedraw(log,{view:"quick",durationMs:i+.16});
  assert.equal(log.samples.length,MAX_REDRAWS);
  assert.equal(log.samples[0].ms,56.2);
  assert.equal(log.samples.at(-1).ms,79.2);
  assert.deepEqual(redrawSummary(log),{count:MAX_REDRAWS,lastMs:79.2,medianMs:67.2,p95Ms:78.2,worstMs:79.2});
});

test("redraw measurements are plain derived UI numbers, not a device fingerprint",()=>{
  let log=newRedrawLog();
  log=appendRedraw(log,{view:"private-secret-1234",durationMs:1.03});
  assert.deepEqual(log.samples[0],{view:"private-secret-",ms:1});
  assert.deepEqual(redrawSummary({samples:[{ms:4},{ms:10},{ms:40}]}),
    {count:3,lastMs:40,medianMs:10,p95Ms:40,worstMs:40});
});

test("app uses one scheduler, handles connection wake-up and stops duplicate same-page rebuilds",()=>{
  const app=readFileSync("src/app.js","utf8");
  const sw=readFileSync("sw.js","utf8");
  assert.match(app,/function queueGamepadTick/);
  assert.match(app,/window\.addEventListener\("gamepadconnected"/);
  assert.match(app,/window\.addEventListener\("gamepaddisconnected"/);
  assert.match(app,/document\.addEventListener\("visibilitychange"/);
  assert.match(app,/pollMode\(\{connected,capturing:deviceCapture,hidden:document\.hidden\}\)/);
  assert.match(app,/if\(target===view && modal\.hidden\)return;/);
  assert.match(app,/newRedrawLog\(\)/);
  assert.match(app,/appendRedraw\(redrawLog/);
  assert.match(app,/data-action="redraw-clear"/);
  assert.match(app,/device-redraw-result/);
  assert.match(sw,/src\/performance\.js/);
  assert.match(sw,/reel-theater-shell-v11/);
  assert.doesNotMatch(app,/console\.log\([^)]*navigator\.userAgent/);
});
