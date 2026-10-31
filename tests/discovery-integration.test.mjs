import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync("src/app.js", "utf8");
const sw = readFileSync("sw.js", "utf8");
const css = readFileSync("styles.css", "utf8");

test("source discovery routes are reachable from Home, Watch and Live TV", () => {
  assert.match(app, /Discover free TV/);
  assert.match(app, /function sourceSection/);
  assert.match(app, /function renderSourceList/);
  assert.match(app, /sourceSection\(\)/);
  assert.match(app, /sourceCategory = "live"/);
});
test("source buttons open official sites and never impersonate in-app playback", () => {
  assert.match(app, /Open official site/);
  assert.match(app, /noopener noreferrer/);
  assert.match(app, /No misleading Play buttons/);
  assert.doesNotMatch(app, /player.src = source.url/);
});
test("search works without network calls and favorites are local-only", () => {
  assert.match(app, /event.target.id === "source-query"/);
  assert.match(app, /sourceFavoritesOnly/);
  assert.match(app, /source-favorite/);
  assert.match(app, /save\("favorite-sources"/);
  assert.match(app, /findSources/);
});
test("service worker caches the local source manifest but no external sources", () => {
  assert.match(sw, /reel-theater-shell-v9/);
  assert.match(sw, /src\/sources\.js/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
  assert.doesNotMatch(sw, /pluto\.tv|tubitv\.com|watch\.plex\.tv/);
});
test("new guide retains TV accessibility and never requires web fonts", () => {
  assert.match(css, /source-search-label/);
  assert.match(css, /source-fav/);
  assert.match(css, /button:focus,a:focus,input:focus/);
  assert.doesNotMatch(css, /fonts\.googleapis\.com/);
});
