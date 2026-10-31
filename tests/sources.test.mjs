import test from "node:test";
import assert from "node:assert/strict";
import {SOURCES, SOURCE_CATEGORIES, findSources, parseFavoriteSourceIds, isOfficialSource} from "../src/sources.js";

test("source catalog has distinct ids and HTTPS official destinations", () => {
  assert.equal(SOURCES.length, 6);
  assert.equal(new Set(SOURCES.map(x => x.id)).size, SOURCES.length);
  assert.ok(SOURCES.every(isOfficialSource));
  assert.ok(SOURCES.every(source => source.label && source.xbox && source.price && source.description));
  assert.ok(SOURCES.every(source => !source.url.includes(".m3u") && !source.url.includes(".mp4")));
  assert.ok(SOURCES.some(source => source.id === "reel" && /Directory/.test(source.label)));
});

test("filters are stable, meaningful, and case insensitive", () => {
  assert.deepEqual(SOURCE_CATEGORIES.map(x=>x.id), ["all","movies","live","documentary","guides"]);
  assert.deepEqual(findSources({category:"movies"}).map(x=>x.id), ["tubi"]);
  assert.deepEqual(findSources({category:"live"}).map(x=>x.id), ["pluto","plex"]);
  assert.deepEqual(findSources({query:"NA sa"}).map(x=>x.id), []);
  assert.deepEqual(findSources({query:"NASA"}).map(x=>x.id), ["nasa"]);
  assert.deepEqual(findSources({query:"FREE"}).map(x=>x.id).includes("tubi"), true);
  assert.deepEqual(findSources({category:"live",favoritesOnly:true,favorites:["plex","tubi"]}).map(x=>x.id), ["plex"]);
});

test("favorites recover safely from corruption and ignore unknown ids", () => {
  assert.deepEqual(parseFavoriteSourceIds("malformed"), []);
  assert.deepEqual(parseFavoriteSourceIds('{"surprise":true}'), []);
  assert.deepEqual(parseFavoriteSourceIds('["tubi","unknown","tubi","pbs"]'), ["tubi","pbs"]);
  assert.deepEqual(parseFavoriteSourceIds("null"), []);
});

test("provider link cannot be confused with an in-app playable stream", () => {
  for (const source of SOURCES) {
    assert.doesNotMatch(source.label, /playing now|direct video|stream verified/i);
    assert.ok(source.verifiedFrom.startsWith("https://"));
  }
});
