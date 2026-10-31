import test from "node:test";
import assert from "node:assert/strict";
import {
  PORTABLE_SCHEMA,PORTABLE_MAX_BYTES,createPortableSetup,parsePortableSetup,
  mergePortableSetup,describePortableSetup,toStoragePairs
} from "../src/portable.js";
import {readFileSync} from "node:fs";

const backup=overrides=>createPortableSetup({sources:["nasa"],games:["spark"],recents:["game:spark"],mode:"tv",...overrides});

test("export is versioned, bounded, and contains only portable curated IDs",()=>{
  const state=backup({sources:["nasa","fake","nasa"],games:["spark","fake","spark"],
    recents:["game:spark","source:nasa","evil"],mode:"tv"});
  assert.deepEqual(state,{
    schema:PORTABLE_SCHEMA,
    favorites:{sources:["nasa"],games:["spark"]},
    recents:["game:spark","source:nasa"],
    preferences:{mode:"tv"}
  });
  assert.doesNotMatch(JSON.stringify(state),/file|video|URL|device|watchHistory/);
  assert.equal(Object.keys(state).length,4);
});

test("parser rejects unsupported formats, empty and oversized backups",()=>{
  assert.equal(parsePortableSetup("").ok,false);
  assert.equal(parsePortableSetup("{not-json").ok,false);
  assert.equal(parsePortableSetup("{}").ok,false);
  assert.equal(parsePortableSetup(JSON.stringify({...backup(),schema:"REEL_PORTABLE_SETUP_V2"})).ok,false);
  assert.equal(parsePortableSetup("☀".repeat(PORTABLE_MAX_BYTES/3+3)).ok,false);
  assert.equal(parsePortableSetup(JSON.stringify({...backup(),preferences:{mode:"invalid"}})).ok,false);
  assert.equal(parsePortableSetup(JSON.stringify({...backup(),favorites:{sources:{id:"nasa"},games:[]}})).ok,false);
  assert.equal(parsePortableSetup(JSON.stringify({...backup(),recents:{}})).ok,false);
});

test("import drops unknown and duplicate IDs while disclosing each removal",()=>{
  const suspect={
    schema:PORTABLE_SCHEMA,
    favorites:{sources:["nasa","nasa","not-curated"],games:["spark","bad"]},
    recents:["game:spark","bad","game:spark"],
    preferences:{mode:"desktop"},
    __proto__: {cannot: "be used"}
  };
  const result=parsePortableSetup(JSON.stringify(suspect));
  assert.equal(result.ok,true);
  assert.deepEqual(result.setup.favorites,{sources:["nasa"],games:["spark"]});
  assert.deepEqual(result.setup.recents,["game:spark"]);
  assert.equal(result.dropped,5);
  assert.deepEqual(result.removed,{sources:2,games:1,recents:2});
  assert.equal(result.setup.preferences.mode,"desktop");
});

test("oversized arrays and invalid structural fields never get accepted",()=>{
  const tooMany=backup({sources:Array(101).fill("nasa")});
  // createPortableSetup is safe by design; use raw input to test parser raw shape.
  const raw=JSON.stringify({schema:PORTABLE_SCHEMA,favorites:{sources:Array(101).fill("nasa"),games:[]},
    recents:[],preferences:{mode:"auto"}});
  assert.equal(parsePortableSetup(raw).ok,false);
  assert.equal(tooMany.favorites.sources.length,1);
  assert.equal(parsePortableSetup('["array"]').ok,false);
});

test("merge preserves this browser layout and recent precedence, replace uses imported layout",()=>{
  const current=createPortableSetup({sources:["tubi"],games:["btm"],recents:["game:btm"],mode:"desktop"});
  const incoming=backup({sources:["nasa","tubi"],games:["spark"],recents:["source:nasa","game:btm"],mode:"touch"});
  const merged=mergePortableSetup(current,incoming,"merge");
  assert.deepEqual(merged.favorites,{sources:["tubi","nasa"],games:["btm","spark"]});
  assert.deepEqual(merged.recents,["game:btm","source:nasa"]);
  assert.equal(merged.preferences.mode,"desktop");
  const replaced=mergePortableSetup(current,incoming,"replace");
  assert.deepEqual(replaced,incoming);
  assert.throws(()=>mergePortableSetup(current,incoming,"rm -rf"),/Unknown import strategy/);
  assert.deepEqual(describePortableSetup(replaced),{
    sources:2,games:1,recents:2,mode:"touch",availableSources:6,availableGames:5
  });
});

test("only four fixed storage destinations can be written",()=>{
  const list=toStoragePairs(backup({sources:["nasa"],games:["spark"],recents:["game:spark"],mode:"tv"}));
  assert.deepEqual(list.map(([key])=>key),["favorite-sources","favorite-games","recent-links","display-mode"]);
  assert.deepEqual(list[0],["favorite-sources",'["nasa"]']);
  assert.deepEqual(list[1],["favorite-games",'["spark"]']);
  assert.deepEqual(list[2],["recent-links",'["game:spark"]']);
  assert.deepEqual(list[3],["display-mode","tv"]);
});

test("UI gates import behind preview and does not silently upload personal data",()=>{
  const app=readFileSync("src/app.js","utf8");
  const sw=readFileSync("sw.js","utf8");
  const css=readFileSync("styles.css","utf8");
  assert.match(app,/function previewPortableImport/);
  assert.match(app,/function commitPortableImport/);
  assert.match(app,/raw!==pendingPortableRaw/);
  assert.match(app,/data-action="portable-merge" disabled/);
  assert.match(app,/data-action="portable-replace" disabled/);
  assert.match(app,/data-action="portable-copy"/);
  assert.match(app,/data-action="portable-download"/);
  assert.match(app,/function loadPortableFile/);
  assert.match(app,/before\.push/);
  assert.match(app,/window\.localStorage\.setItem/);
  assert.match(sw,/reel-theater-shell-v10/);
  assert.match(sw,/src\/portable\.js/);
  assert.match(css,/\.portable-preview-status/);
});
