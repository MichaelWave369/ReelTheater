import test from "node:test";
import assert from "node:assert/strict";
import {GAMES,GAME_CATEGORIES,filterGames,parseGameFavorites,validGameFavoriteIds,isCuratedGame} from "../src/games.js";
import {FIELD_TARGETS,fieldCounts,emptyFieldReport} from "../src/field.js";

test("original game library contains exactly documented first-party destinations",()=>{
  assert.equal(GAMES.length,5);
  assert.equal(new Set(GAMES.map(g=>g.id)).size, GAMES.length);
  assert.ok(GAMES.every(isCuratedGame));
  assert.deepEqual(GAME_CATEGORIES.map(c=>c.id),["all","action","rpg","puzzle","arcade"]);
  assert.ok(GAMES.every(game=>game.evidence && game.platform.includes("not tested") || game.entry==="project"));
  assert.deepEqual(GAMES.filter(game=>game.entry==="game").map(game=>game.id),["btm","spark","piece","phicade"]);
  assert.ok(GAMES.find(game=>game.id==="tweedle").url.startsWith("https://github.com/"));
});

test("game filter is fast, local, predictable, case-insensitive",()=>{
  assert.deepEqual(filterGames({category:"action"}).map(g=>g.id),["btm"]);
  assert.deepEqual(filterGames({category:"arcade"}).map(g=>g.id),["phicade","tweedle"]);
  assert.deepEqual(filterGames({query:"spark"}).map(g=>g.id),["spark"]);
  assert.deepEqual(filterGames({query:"PUZZLE"}).map(g=>g.id),["piece"]);
  assert.deepEqual(filterGames({onlyFavorites:true,favorites:["piece","tweedle"]}).map(g=>g.id),["piece","tweedle"]);
  assert.deepEqual(filterGames({category:"arcade",onlyFavorites:true,favorites:["piece"]}),[]);
});
test("favorite ids reject unknown, corrupt, duplicate, oversized state",()=>{
  assert.deepEqual(parseGameFavorites("broken"),[]);
  assert.deepEqual(parseGameFavorites('["btm","fake","btm","spark"]'),["btm","spark"]);
  assert.deepEqual(parseGameFavorites("{}"),[]);
  assert.deepEqual(parseGameFavorites("x".repeat(2001)),[]);
  assert.deepEqual(validGameFavoriteIds(["phicade",null,"phicade"]),["phicade"]);
});
test("new games are manual field-lab test targets, not globally verified",()=>{
  const entries=new Set(FIELD_TARGETS.map(t=>t.id));
  for(const id of ["btm","game-spark","game-piece","game-phicade"])assert.ok(entries.has(id));
  assert.equal(fieldCounts(emptyFieldReport()).total,12);
  assert.equal(fieldCounts(emptyFieldReport()).tested,0);
});
