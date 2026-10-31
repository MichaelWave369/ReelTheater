import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createIcon} from "../scripts/generate-icons.mjs";

test("PWA manifest has relative GitHub Pages-safe paths and install icons",()=>{
  const m=JSON.parse(readFileSync("manifest.webmanifest","utf8"));
  assert.equal(m.name,"REEL Theater");
  assert.equal(m.start_url,"./#home");
  assert.equal(m.scope,"./");
  assert.equal(m.display,"standalone");
  assert.ok(m.icons.some(icon=>icon.sizes==="192x192" && icon.type==="image/png"));
  assert.ok(m.icons.some(icon=>icon.sizes==="512x512" && icon.purpose.includes("maskable")));
  assert.ok(m.icons.every(icon=>icon.src.startsWith("./")));
});
test("generated icons are valid-sized PNG resources without remote dependencies",()=>{
  for(const size of [192,512]) {
    const png=createIcon(size);
    assert.deepEqual(Array.from(png.subarray(0,8)),[137,80,78,71,13,10,26,10]);
    assert.equal(png.toString("ascii",12,16),"IHDR");
    assert.equal(png.readUInt32BE(16),size);
    assert.equal(png.readUInt32BE(20),size);
    assert.ok(png.length>100 && png.length<150000,"Expected compressed local icon");
  }
});
test("offline cache is strictly scoped to local application shell resources",()=>{
  const sw=readFileSync("sw.js","utf8");
  assert.match(sw,/reel-theater-shell-v6/);
  for(const name of ["manifest.webmanifest","src/platform.js","icons/icon-192.png","icons/icon-512.png"])assert.ok(sw.includes(name));
  assert.match(sw,/url\.origin !== self\.location\.origin/);
  assert.doesNotMatch(sw,/flower\.mp4|watch\.plex\.tv|pluto\.tv|tubitv\.com/);
});
test("build produces web manifest, two icons and all JS without extra frameworks",()=>{
  const build=readFileSync("scripts/build.mjs","utf8");
  assert.match(build,/manifest\.webmanifest/);
  assert.match(build,/createIcon\(size\)/);
  assert.match(build,/cpSync\("src"/);
  assert.doesNotMatch(build,/npm install|curl|fetch\(/);
});
