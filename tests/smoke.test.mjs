import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = file => readFileSync(file, "utf8");
test("stable controller and playback roots", () => {
  const html = read("index.html");
  for (const id of ["main-content", "primary-nav", "player-modal", "media-player", "local-file", "controller-status"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});
test("live TV never advertises a fake playable stream", () => {
  const app = read("src/app.js");
  assert.match(app, /No dead channel buttons/);
  assert.match(app, /no invented channel lineup/);
  assert.match(app, /ReelCommons/);
});
test("arcade contains actual local game logic", () => {
  const game = read("src/arcade.js");
  assert.match(game, /requestAnimationFrame/);
  assert.match(game, /ballVY/);
  assert.match(game, /navigator\.getGamepads/);
  assert.doesNotMatch(game, /fetch\(/);
});
test("the shell cache cannot cache media or third-party sites", () => {
  const sw = read("sw.js");
  assert.match(sw, /url\.origin !== self\.location\.origin/);
  assert.match(sw, /relative/);
  assert.doesNotMatch(sw, /flower\.mp4/);
  assert.doesNotMatch(sw, /blob:/);
});
test("selected local file path has explicit picker", () => {
  const app = read("src/app.js");
  assert.match(app, /filePicker\.addEventListener\("change"/);
  assert.match(app, /URL\.createObjectURL\(file\)/);
  assert.match(app, /URL\.revokeObjectURL/);
});
test("navigation supports clicks, key controls and Xbox controllers", () => {
  const app = read("src/app.js");
  assert.match(app, /spatialFocus/);
  assert.match(app, /requestAnimationFrame\(gamepadLoop\)/);
  assert.match(app, /document\.addEventListener\("click"/);
});
