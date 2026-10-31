import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 QUICK_ITEMS,QUICK_FILTERS,quickItem,favoriteKeys,validRecents,parseRecents,
 recordRecent,quickResults,quickHomeItems
} from "../src/quicklaunch.js";
import {SOURCES} from "../src/sources.js";
import {GAMES} from "../src/games.js";

test("one static, unique allowlist unifies existing game/source catalogs",()=>{
 assert.equal(QUICK_ITEMS.length,SOURCES.length+GAMES.length);
 assert.equal(new Set(QUICK_ITEMS.map(item=>item.key)).size,QUICK_ITEMS.length);
 assert.equal(QUICK_ITEMS.length,11);
 assert.deepEqual(QUICK_FILTERS.map(f=>f.id),["all","favorites","recent","game","source"]);
 assert.equal(quickItem("game:btm")?.name,"Break the Matrix");
 assert.equal(quickItem("source:nasa")?.name,"NASA+");
 assert.equal(quickItem("game:made-up"),null);
 assert.equal(quickItem({malicious:true}),null);
 assert.ok(QUICK_ITEMS.every(item=>item.url.startsWith("https://")));
});

test("one favorite list draws from existing local favorite keys, not a new account",()=>{
 const favorite=favoriteKeys({sources:["nasa","tubi","INVALID"],games:["spark","btm","UNKNOWN"]});
 assert.deepEqual(favorite,["source:nasa","source:tubi","game:spark","game:btm"]);
 assert.deepEqual(favoriteKeys({sources:[],games:[]}),[]);
});

test("recent link history is validated, deduplicated, capped, and contains no URLs",()=>{
 assert.deepEqual(parseRecents("not JSON"),[]);
 assert.deepEqual(parseRecents("{}"),[]);
 assert.deepEqual(parseRecents('["source:nasa","bad","game:spark","source:nasa"]'),["source:nasa","game:spark"]);
 assert.deepEqual(parseRecents("a".repeat(3000)),[]);
 assert.deepEqual(validRecents(["game:btm",null,"game:btm",9]),["game:btm"]);
 let history=[];
 for(const item of QUICK_ITEMS)history=recordRecent(history,item.key);
 assert.equal(history.length,9);
 history=recordRecent(history,"source:nasa");
 assert.equal(history[0],"source:nasa");
 assert.equal(new Set(history).size,history.length);
 assert.deepEqual(recordRecent(history,"source:tampered"),history);
 assert.ok(history.every(key=>!key.includes("http")));
});

test("quick filters and search match exactly intended curated destinations",()=>{
 assert.equal(quickResults({filter:"all"}).length,11);
 assert.equal(quickResults({filter:"game"}).length,GAMES.length);
 assert.equal(quickResults({filter:"source"}).length,SOURCES.length);
 assert.deepEqual(quickResults({filter:"favorites",favorites:["game:spark","source:nasa"]}).map(i=>i.key),["source:nasa","game:spark"]);
 assert.deepEqual(quickResults({filter:"recent",recent:["game:spark","source:nasa"]}).map(i=>i.key),["game:spark","source:nasa"]);
 assert.deepEqual(quickResults({query:"NASA"}).map(i=>i.key),["source:nasa"]);
 assert.deepEqual(quickResults({query:"PUZZLE"}).map(i=>i.key),["game:piece"]);
 assert.equal(quickResults({query:"___no_results"}).length,0);
 assert.equal(quickResults({filter:"favorites",favorites:[]}).length,0);
 assert.equal(quickResults({filter:"recent",recent:[]}).length,0);
 assert.equal(quickResults({filter:"all",favorites:null}).length,11);
});

test("home shortcuts favor favorite keys, followed by recent clicked links",()=>{
 const home=quickHomeItems({favorites:["game:btm","source:nasa"],recent:["game:spark","source:nasa","game:piece"]});
 assert.deepEqual(home.map(x=>x.key),["game:btm","source:nasa","game:spark","game:piece"]);
 assert.deepEqual(quickHomeItems({favorites:[],recent:[]}),[]);
 assert.deepEqual(quickHomeItems({favorites:["bad"],recent:["bad"]}),[]);
});

test("all quick links require deliberate click; no provider scraping, telemetry or passwords",()=>{
 const app=readFileSync("src/app.js","utf8");
 const sw=readFileSync("sw.js","utf8");
 const html=readFileSync("index.html","utf8");
 assert.match(app,/data-quick-link/);
 assert.match(app,/link\.href===item\.url/);
 assert.match(app,/recordRecent/);
 assert.match(app,/data-action="clear-quick-recents"/);
 assert.match(app,/save\("recent-links","\[\]"\)/);
 assert.match(app,/data-quick-favorite/);
 assert.match(app,/renderQuickResults/);
 assert.match(html,/data-view="quick"/);
 assert.match(sw,/src\/quicklaunch\.js/);
 assert.match(sw,/reel-theater-shell-v12/);
 assert.doesNotMatch(sw,/https:\/\/(tubi|pluto|michaelwave369\.github\.io)/);
});
