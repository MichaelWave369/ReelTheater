import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseJellyfinServer} from "../src/jellyfin.js";

test("private network Jellyfin addresses normalize to a saved origin",()=>{
  for(const [raw,expected] of [
    ["http://192.168.1.25:8096/","http://192.168.1.25:8096"],
    ["http://10.0.0.9","http://10.0.0.9:8096"],
    ["http://172.16.5.5:8097","http://172.16.5.5:8097"],
    ["http://172.31.255.253:8096","http://172.31.255.253:8096"],
    ["http://jellyfin.local:8096/","http://jellyfin.local:8096"],
    ["https://media.local/","https://media.local"],
    ["http://localhost:8096","http://localhost:8096"],
    ["http://127.0.0.1","http://127.0.0.1:8096"]
  ]){
    assert.deepEqual(parseJellyfinServer(raw),{ok:true,url:expected},raw);
  }
});

test("invalid, external, credential-bearing and path-based URLs never become launch targets",()=>{
  for(const raw of [
    "",42,"not-a-url","192.168.1.20:8096","javascript:alert(1)",
    "file:///etc/passwd","https://example.com","http://8.8.8.8:8096",
    "http://172.32.0.1:8096","http://192.169.1.2:8096",
    "http://169.254.1.3:8096","http://192.168.1.20.example.com",
    "http://user:pass@192.168.1.20:8096",
    "http://192.168.1.20:8096/web/index.html",
    "http://192.168.1.20:8096/?apikey=secret",
    "http://192.168.1.20:8096/#/home",
    "http://bad..local:8096","http://-bad.local:8096",
    "a".repeat(221)
  ]){
    const outcome=parseJellyfinServer(raw);
    assert.equal(outcome.ok,false,String(raw));
    assert.equal(typeof outcome.error,"string");
    assert.equal(Object.hasOwn(outcome,"url"),false);
  }
});

test("MikeyFlix stays a manual navigation with device-local address storage only",()=>{
  const app=readFileSync("src/app.js","utf8");
  const source=readFileSync("src/jellyfin.js","utf8");
  const sw=readFileSync("sw.js","utf8");
  const docs=readFileSync("docs/MIKEYFLIX_LAN_RUNG13.md","utf8");
  assert.match(app,/parseJellyfinServer/);
  assert.match(app,/id="jellyfin-url"/);
  assert.match(app,/id="jellyfin-open"/);
  assert.match(app,/data-action="jellyfin-save"/);
  assert.match(app,/data-action="jellyfin-clear"/);
  assert.match(app,/save\("jellyfin-url"/);
  assert.match(app,/target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|apikey|password\s*:/i);
  assert.match(sw,/src\/jellyfin\.js/);
  assert.doesNotMatch(sw,/192\.168|:8096|jellyfin\.local/);
  assert.match(docs,/not.*(proxy|embedded)/i);
});
