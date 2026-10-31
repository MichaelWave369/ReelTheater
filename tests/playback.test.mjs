import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPlaybackSession,mediaErrorText,recordPlaybackEvent,safePlaybackSummary,playbackGuidance,MAX_EVENTS} from "../src/playback.js";

test("media events are in-session and cannot declare visual/audio success",()=>{
  let session=createPlaybackSession({kind:"demo",started:1000});
  session=recordPlaybackEvent(session,"loadstart",{now:1005});
  session=recordPlaybackEvent(session,"loadedmetadata",{now:1070});
  session=recordPlaybackEvent(session,"playing",{now:1324});
  assert.equal(session.firstPlayingMs,324);
  assert.equal(session.status,"Browser signaled playback");
  assert.match(playbackGuidance(session),/Confirm visible video and audio/);
  assert.equal(safePlaybackSummary(session).events.length,3);
});
test("network and codec errors give actionable, honest guidance",()=>{
  let session=createPlaybackSession({kind:"local",started:100});
  session=recordPlaybackEvent(session,"error",{now:220,errorCode:3});
  assert.equal(session.error,"Decode failed or codec unsupported");
  assert.match(playbackGuidance(session),/supported MP4/);
  session=recordPlaybackEvent(session,"error",{now:250,errorCode:2});
  assert.match(playbackGuidance(session),/connectivity/);
  assert.equal(mediaErrorText(4),"Media format/source not supported");
  assert.equal(mediaErrorText(99),"Unknown media error");
});
test("unexpected media events are ignored and history is bounded",()=>{
  let s=createPlaybackSession({started:5});
  assert.strictEqual(recordPlaybackEvent(s,"fetching-secrets",{now:7}),s);
  for(let i=0;i<30;i++)s=recordPlaybackEvent(s,"waiting",{now:5+i});
  assert.equal(s.events.length,MAX_EVENTS);
  assert.equal(s.events[0].elapsedMs,30-MAX_EVENTS);
  assert.equal(s.firstPlayingMs,null);
});
test("export strips local names, provider links, user agent and source URLs",()=>{
  let s=createPlaybackSession({kind:"local",started:1});
  s={...s,filename:"private-home-video.mp4",url:"file:///private/movie",userAgent:"secret"};
  s=recordPlaybackEvent(s,"stalled",{now:30});
  const safe=safePlaybackSummary(s);
  assert.equal(safe.kind,"local");
  assert.equal(safe.filename,undefined);
  assert.equal(safe.url,undefined);
  assert.equal(safe.userAgent,undefined);
  assert.doesNotMatch(JSON.stringify(safe),/private-home-video|secret/);
});
test("UI shows player status without pretending to test external services",()=>{
  const app=readFileSync("src/app.js","utf8");
  const html=readFileSync("index.html","utf8");
  const sw=readFileSync("sw.js","utf8");
  assert.match(app,/renderPlaybackHealth/);
  assert.match(app,/playbackHealthSection/);
  assert.match(app,/recordPlaybackEvent/);
  assert.match(app,/safePlaybackSummary/);
  assert.match(app,/download="reel-playback-health.json"|download="reel-playback-health.json"|download = "reel-playback-health.json"|download="reel-playback-health.json"|download="reel-playback-health.json"|download="reel-playback-health.json"/);
  assert.match(html,/player-health-events/);
  assert.match(sw,/src\/playback\.js/);
  assert.doesNotMatch(sw,/flower\.mp4|michaelwave369\.github\.io/);
});
