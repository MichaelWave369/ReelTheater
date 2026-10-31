import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DEVICE_KEYS,INPUT_LIMIT,makeDeviceLog,appendDeviceInput,inputLabel,gamepadLabel,frameStats,safeDeviceReport} from "../src/device.js";

test("only navigation keys are recognized; never collect arbitrary typed characters",()=>{
  assert.equal(inputLabel("ArrowLeft"),"Left");
  assert.equal(inputLabel("Enter"),"Select / Enter");
  assert.equal(inputLabel("Escape"),"Back / Escape");
  assert.equal(inputLabel("Backspace"),"Back / Backspace");
  assert.equal(inputLabel("x"),null);
  assert.equal(inputLabel("s3cr3t"),null);
  assert.equal(inputLabel(""),null);
  assert.ok(Object.isFrozen(DEVICE_KEYS));
});

test("input session is bounded and semantic, rejecting raw device details",()=>{
  let log=makeDeviceLog();
  log=appendDeviceInput(log,"keyboard","Left");
  log=appendDeviceInput(log,"touch","Tap / touch");
  log=appendDeviceInput(log,"pointer","Pointer click");
  assert.equal(log.inputs.length,3);
  const previous=log;
  log=appendDeviceInput(log,"keyboard","typed-password");
  log=appendDeviceInput(log,"hardware-id","Left");
  assert.deepEqual(log,previous);
  for(let n=0;n<100;n++)log=appendDeviceInput(log,"gamepad","A / Select");
  assert.equal(log.inputs.length,INPUT_LIMIT);
  assert.deepEqual(log.inputs.at(-1),{type:"gamepad",action:"A / Select"});
});

test("gamepad actions reveal standard mappings without storing identifiers or axes",()=>{
  const pad=pressed=>({buttons:Array.from({length:16},(_,i)=>({pressed:pressed.includes(i)})),axes:[-.99,.99],id:"do not export"});
  assert.equal(gamepadLabel("select",pad([0])),"A / Select");
  assert.equal(gamepadLabel("back",pad([1])),"B / Back");
  assert.equal(gamepadLabel("up",pad([12])),"D-pad Up");
  assert.equal(gamepadLabel("left",pad([])),"Left stick Left");
  assert.equal(gamepadLabel("",pad([])),null);
});

test("visible frame samples compute bounded distribution; never claim video FPS",()=>{
  assert.equal(frameStats([]),null);
  assert.equal(frameStats([1,2,3]),null);
  const stats=frameStats([...Array(59).fill(16.7),42]);
  assert.deepEqual(stats,{samples:60,medianMs:16.7,p95Ms:16.7,longestMs:42});
  assert.equal(frameStats(Array(20).fill(-9)),null);
  assert.equal(frameStats(Array(20).fill(Infinity)),null);
  assert.equal(frameStats(Array(15).fill(1e6)),null);
});

test("explicit device report omits platform identifiers, raw text, and arbitrary fields",()=>{
  const log={inputs:[{type:"keyboard",action:"Left"},{type:"keyboard",action:"a-passphrase"},
    {type:"touch",action:"Tap / touch"}],
    frame:{samples:60,medianMs:16.6,p95Ms:18.1,longestMs:21.2},
    userAgent:"private",gamepadId:"private",rawAxes:[-1,0],filename:"private.mp4"};
  const report=safeDeviceReport(log,{mode:"tv",gamepadDetected:true,touchAvailable:true,offline:false,serviceWorker:true,secret:"private"});
  const data=JSON.stringify(report);
  assert.equal(report.schema,"REEL_DEVICE_READINESS_V1");
  assert.equal(report.input.length,2);
  assert.deepEqual(report.frame,{samples:60,medianMs:16.6,p95Ms:18.1,longestMs:21.2});
  assert.equal(report.context.layout,"tv");
  assert.doesNotMatch(data,/private|a-passphrase|gamepadId|userAgent|filename|rawAxes/);
  assert.match(data,/self-operated browser observations/);
  assert.equal(safeDeviceReport({inputs:[],frame:{samples:9,medianMs:1,p95Ms:1,longestMs:1}},{mode:"unknown"}).frame,null);
});

test("Device Lab uses explicit actions, observable input and no hidden persistence",()=>{
 const app=readFileSync("src/app.js","utf8");
 const html=readFileSync("index.html","utf8");
 const sw=readFileSync("sw.js","utf8");
 assert.match(html,/data-view="device"/);
 assert.match(app,/function devicePage/);
 assert.match(app,/function startDeviceCapture/);
 assert.match(app,/function startDeviceFrameSample/);
 assert.match(app,/function exportDeviceLab/);
 assert.match(app,/markDeviceInput\("keyboard"/);
 assert.match(app,/markDeviceInput\(event.pointerType/);
 assert.match(app,/deviceBackNeedsRelease/);
 assert.match(app,/sampleFrameToken|frameSampleToken/);
 assert.match(app,/data-action="device-export"/);
 assert.doesNotMatch(app,/save\("device-|localStorage\.setItem\(.*device/);
 assert.match(sw,/reel-theater-shell-v10/);
 assert.match(sw,/src\/device\.js/);
});
