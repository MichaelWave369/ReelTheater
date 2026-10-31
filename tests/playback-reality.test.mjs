import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  createPlaybackSession,recordPlaybackEvent,recordVideoFrameCallback,
  setVideoFrameObservation,firstVideoFrameLabel,safePlaybackSummary,playbackGuidance
} from "../src/playback.js";
import {FORMAT_HINTS,normalizeMediaHint,inspectMediaSupport} from "../src/media-support.js";

test("playing events and frame callbacks are distinct signals",()=>{
  let s=createPlaybackSession({kind:"demo",started:100});
  s=setVideoFrameObservation(s,"pending");
  s=recordPlaybackEvent(s,"playing",{now:300});
  assert.equal(s.firstPlayingMs,200);
  assert.equal(s.firstVideoFrameMs,null);
  assert.equal(s.videoFrameObservation,"pending");
  assert.match(firstVideoFrameLabel(s),/awaiting a frame/);
  assert.match(playbackGuidance(s),/Confirm visible video and audio/);
  s=recordVideoFrameCallback(s,{now:440,hasVideo:true});
  assert.equal(s.firstPlayingMs,200);
  assert.equal(s.firstVideoFrameMs,340);
  assert.equal(s.videoFrameObservation,"observed");
  assert.match(firstVideoFrameLabel(s),/340 ms/);
  assert.match(playbackGuidance(s),/Confirm actual picture and sound/);
  const summary=safePlaybackSummary(s);
  assert.equal(summary.firstVideoFrameMs,340);
  assert.equal(summary.videoFrameObservation,"observed");
  assert.equal(summary.events.length,1); // frame callback is not an HTMLMediaElement event
});
test("an actual decode or network error takes priority over a frame callback",()=>{
  let s=createPlaybackSession({kind:"demo",started:100});
  s=setVideoFrameObservation(s,"pending");
  s=recordPlaybackEvent(s,"error",{now:200,errorCode:4});
  s=recordVideoFrameCallback(s,{now:220,hasVideo:true});
  assert.equal(s.videoFrameObservation,"observed");
  assert.equal(s.firstVideoFrameMs,120);
  assert.equal(s.error,"Media format/source not supported");
  assert.match(playbackGuidance(s),/Try a supported MP4\/H\.264/);
  s=recordPlaybackEvent(s,"error",{now:230,errorCode:2});
  assert.match(playbackGuidance(s),/Check connectivity/);
});

test("callbacks do not falsify frame data when no video exists or state is inapplicable",()=>{
  const base=createPlaybackSession({kind:"local",started:0});
  assert.equal(base.videoFrameObservation,"not-checked");
  assert.strictEqual(recordVideoFrameCallback(base,{now:10}),base);
  const noPixels=setVideoFrameObservation(base,"pending");
  assert.strictEqual(recordVideoFrameCallback(noPixels,{now:20,hasVideo:false}),noPixels);
  const audio=setVideoFrameObservation(base,"not-applicable");
  assert.match(firstVideoFrameLabel(audio),/not applicable to audio/);
  assert.strictEqual(recordVideoFrameCallback(audio,{now:20}),audio);
  assert.match(firstVideoFrameLabel(setVideoFrameObservation(base,"unavailable")) ,/API unavailable/);
  assert.strictEqual(setVideoFrameObservation(base,"nonsense"),base);
});
test("private report excludes video identifiers and keeps only bounded timing and state",()=>{
  let s=createPlaybackSession({kind:"local",started:100});
  s=setVideoFrameObservation(s,"pending");
  s=recordVideoFrameCallback(s,{now:150,hasVideo:true});
  s={...s,filename:"classified.mp4",url:"file:///classified",dimensions:[1920,1080],
    userAgent:"private-browser",mediaKey:"token"};
  const summary=safePlaybackSummary(s);
  assert.equal(summary.kind,"local");
  assert.equal(summary.firstVideoFrameMs,50);
  assert.equal(summary.videoFrameObservation,"observed");
  assert.doesNotMatch(JSON.stringify(summary),/classified|private-browser|1920|1080|token|file:\/\//);
  assert.equal(safePlaybackSummary(createPlaybackSession()).firstVideoFrameMs,null);
});
test("format checks expose only static names and normalized browser responses",()=>{
  assert.deepEqual(FORMAT_HINTS.map(x=>x.id),["mp4-h264","mp4-hevc","webm-vp8","webm-vp9","mp4-av1","mp3","aac"]);
  assert.equal(normalizeMediaHint("probably"),"probably");
  assert.equal(normalizeMediaHint("maybe"),"maybe");
  for(const weird of ["","no","unsupported",undefined,42,{},null])assert.equal(normalizeMediaHint(weird),"not reported");
  const calls=[];
  const inspected=inspectMediaSupport({canPlayType(type){calls.push(type);return type.includes("avc1")?"probably":"maybe";}},
    {mediaSource:true,frameCallback:true});
  assert.equal(calls.length,FORMAT_HINTS.length);
  assert.equal(inspected.formats[0].hint,"probably");
  assert.equal(inspected.formats[1].hint,"maybe");
  assert.equal(inspected.mediaSourceAPI,true);
  assert.equal(inspected.videoFrameCallbackAPI,true);
  assert.match(inspected.note,/not verify file decoding/);
  assert.equal(Object.keys(inspected).length,5);
});
test("missing or throwing browser APIs never generate false codec support",()=>{
  for(const v of [null,{}, {canPlayType(){throw Error("blocked")}}]){
    const inspected=inspectMediaSupport(v);
    assert.equal(inspected.formats.length,7);
    assert.ok(inspected.formats.every(row=>row.hint==="not reported"));
    assert.equal(inspected.mediaSourceAPI,false);
    assert.equal(inspected.videoFrameCallbackAPI,false);
  }
});
test("browser wiring cancels stale video callbacks and exports no private filename",()=>{
  const app=readFileSync("src/app.js","utf8");
  const html=readFileSync("index.html","utf8");
  const sw=readFileSync("sw.js","utf8");
  assert.match(app,/function startVideoFrameWatch/);
  assert.match(app,/function stopVideoFrameWatch/);
  assert.match(app,/player\.cancelVideoFrameCallback/);
  assert.match(app,/token!==videoFrameToken/);
  assert.match(app,/recordVideoFrameCallback\(playbackSession/);
  assert.match(app,/player\.videoWidth>0 && player\.videoHeight>0/);
  assert.match(app,/file\.type\.startsWith\("audio\/"\)/);
  assert.match(app,/data-action="inspect-formats"/);
  assert.match(app,/inspectMediaSupport\(player/);
  assert.match(app,/REEL_PLAYBACK_SESSION_V2/);
  assert.match(html,/player-health-frame/);
  assert.match(sw,/reel-theater-shell-v12/);
  assert.match(sw,/src\/media-support\.js/);
});
