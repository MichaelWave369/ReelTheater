import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  FIELD_TARGETS, FIELD_STATES, FIELD_GAME_URL, FIELD_KEY,
  emptyFieldReport, sanitizeFieldReport, parseFieldReport,
  updateFieldEntry, fieldCounts, fieldMarkup
} from "../src/field.js";

test("field targets include own game and every curated official source", () => {
  assert.equal(FIELD_TARGETS.length, 12);
  assert.equal(new Set(FIELD_TARGETS.map(x=>x.id)).size, FIELD_TARGETS.length);
  assert.ok(FIELD_TARGETS.some(t=>t.id==="btm" && t.url===FIELD_GAME_URL));
  assert.ok(FIELD_GAME_URL.startsWith("https://michaelwave369.github.io/BTM/"));
  assert.equal(FIELD_STATES.length, 4);
  assert.ok(FIELD_KEY.startsWith("reel-theater:"));
});

test("a new report never pretends device testing has happened", () => {
  const empty = emptyFieldReport();
  assert.deepEqual(empty.entries, {});
  assert.deepEqual(fieldCounts(empty), {total:12,tested:0,worked:0,failed:0,opened:0});
  assert.match(fieldMarkup(empty), /private, self-reported observations/);
  assert.match(fieldMarkup(empty), /Opened, unverified playback/);
});

test("status, time and bounded note updates are locally recorded and counted", () => {
  let report = emptyFieldReport();
  report = updateFieldEntry(report,"source-plex",{status:"opened",note:"Page loaded",at:"2026-10-31T15:00:00.000Z"});
  report = updateFieldEntry(report,"signal",{status:"worked",note:"Controller moved and scored",at:"2026-10-31T15:01:00.000Z"});
  report = updateFieldEntry(report,"btm",{status:"failed",note:"No input",at:"2026-10-31T15:02:00.000Z"});
  assert.equal(fieldCounts(report).tested,3);
  assert.equal(fieldCounts(report).opened,1);
  assert.equal(fieldCounts(report).worked,1);
  assert.equal(fieldCounts(report).failed,1);
  assert.equal(report.entries["source-plex"].status,"opened");
  const long = updateFieldEntry(report,"demo",{status:"failed",note:"x".repeat(700)});
  assert.equal(long.entries.demo.note.length,240);
  assert.equal(report.entries.demo,undefined);
});

test("tampered or malformed reports cannot create new targets or statuses", () => {
  const input = {
    schema:"REEL_XBOX_FIELD_REPORT_V1",entries:{
      "source-tubi":{status:"worked",note:"<img src=x onerror=alert(1)>",at:"bad"},
      injected:{status:"worked",note:"evil",at:"bad"},
      btm:{status:"INSTANT_XBOX_VERIFIED",note:"Not valid"},
      demo:{status:"failed",note:42}
    }
  };
  const clean=sanitizeFieldReport(input);
  assert.deepEqual(Object.keys(clean.entries).sort(),["demo","source-tubi"]);
  assert.equal(clean.entries["source-tubi"].at,"");
  assert.equal(clean.entries.demo.note,"");
  assert.deepEqual(parseFieldReport('{"schema":"wrong"}'),emptyFieldReport());
  assert.deepEqual(parseFieldReport('invalid'),emptyFieldReport());
  assert.deepEqual(parseFieldReport("x".repeat(17000)),emptyFieldReport());
  const html=fieldMarkup(clean);
  assert.doesNotMatch(html, /onerror|img src/);
  assert.equal(updateFieldEntry(clean,"unknown",{status:"worked"}).entries.unknown,undefined);
});

test("field launcher has controller routes, JSON export and local-only storage", () => {
  const app=readFileSync("src/app.js","utf8");
  const sw=readFileSync("sw.js","utf8");
  const html=readFileSync("index.html","utf8");
  assert.match(html,/data-view="field"/);
  assert.match(app,/FIELD_KEY/);
  assert.match(app,/new Blob\(/);
  assert.match(app,/download = "reel-theater-xbox-field-report.json"/);
  assert.match(app,/HTMLSelectElement/);
  assert.match(app,/select.dispatchEvent\(new Event\("change"/);
  assert.match(app,/FIELD_GAME_URL/);
  assert.match(sw,/reel-theater-shell-v9/);
  assert.match(sw,/src\/field\.js/);
  assert.doesNotMatch(sw,/BTM\/|michaelwave369\.github\.io/);
});
