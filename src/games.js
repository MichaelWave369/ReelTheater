// REEL Arcade: explicitly curated first-party destinations.
// A repository README advertising GitHub Pages is source documentation,
// NOT independent proof the live URL loads or plays on an Xbox/Fire TV.
export const GAMES = Object.freeze([
  Object.freeze({
    id:"btm",name:"Break the Matrix",kind:"Browser FPS",category:"action",
    description:"Retro 12-sector raycasting shooter with controller mappings and VR modes.",
    url:"https://michaelwave369.github.io/BTM/",
    repository:"https://github.com/MichaelWave369/BTM",
    entry:"game",platform:"Web browser · Xbox/Fire TV not tested",
    evidence:"Repository README documents public Pages game",
    fieldId:"btm"
  }),
  Object.freeze({
    id:"spark",name:"Spark: The Substrate",kind:"Fantasy RPG",category:"rpg",
    description:"Original fantasy adventure, with separately available VR entry.",
    url:"https://michaelwave369.github.io/SparkTheSubstrate/",
    repository:"https://github.com/MichaelWave369/SparkTheSubstrate",
    entry:"game",platform:"Web browser · Xbox/Fire TV not tested",
    evidence:"Repository README documents public Pages game",
    fieldId:"game-spark"
  }),
  Object.freeze({
    id:"piece",name:"Piece by Piece",kind:"City puzzle builder",category:"puzzle",
    description:"Build a city from architectural puzzles, then explore community creations.",
    url:"https://michaelwave369.github.io/PieceByPiece/",
    repository:"https://github.com/MichaelWave369/PieceByPiece",
    entry:"game",platform:"Web browser · Xbox/Fire TV not tested",
    evidence:"Repository README documents Pages URL subject to deployment",
    fieldId:"game-piece"
  }),
  Object.freeze({
    id:"phicade",name:"PhiCade",kind:"Open arcade gateway",category:"arcade",
    description:"The open game runtime and Xbox browser gateway project.",
    url:"https://michaelwave369.github.io/PhiCade/",
    repository:"https://github.com/MichaelWave369/PhiCade",
    entry:"game",platform:"Web gateway · Xbox/Fire TV not tested",
    evidence:"Xbox Edition documentation names public gateway URL",
    fieldId:"game-phicade"
  }),
  Object.freeze({
    id:"tweedle",name:"TweedleVerse Arcade",kind:"Comedy adventures",category:"arcade",
    description:"TweedlePD, TweedleGolf, and Adventures of Tweedsie. Review the project for its arcade entry.",
    url:"https://github.com/MichaelWave369/TweedleVerse",
    repository:"https://github.com/MichaelWave369/TweedleVerse",
    entry:"project",platform:"Project link · deployed arcade URL not checked",
    evidence:"Repository README documents arcade.html, but not a verified public host",
    fieldId:null
  })
]);
export const GAME_CATEGORIES = Object.freeze([
  Object.freeze({id:"all",label:"All"}),
  Object.freeze({id:"action",label:"Action"}),
  Object.freeze({id:"rpg",label:"RPG"}),
  Object.freeze({id:"puzzle",label:"Puzzles"}),
  Object.freeze({id:"arcade",label:"Arcade"})
]);
const IDS=new Set(GAMES.map(game=>game.id));

export function validGameFavoriteIds(ids){
  return Array.isArray(ids) ? [...new Set(ids.filter(id=>typeof id==="string" && IDS.has(id)))].slice(0,GAMES.length) : [];
}
export function parseGameFavorites(raw){
  if(typeof raw!=="string" || raw.length>2000) return [];
  try {return validGameFavoriteIds(JSON.parse(raw));} catch {return [];}
}
export function filterGames({query="",category="all",onlyFavorites=false,favorites=[]}={}){
  const search=String(query).trim().toLocaleLowerCase();
  const f=new Set(validGameFavoriteIds(favorites));
  return GAMES.filter(game=>
    (category==="all" || game.category===category) &&
    (!onlyFavorites || f.has(game.id)) &&
    (!search || (game.name+" "+game.kind+" "+game.description).toLocaleLowerCase().includes(search))
  );
}
export function isCuratedGame(game) {
  if(!game || !IDS.has(game.id)) return false;
  try {
    const page=new URL(game.url), repo=new URL(game.repository);
    return page.protocol==="https:" && repo.protocol==="https:" && !page.username && !repo.username &&
      (page.hostname==="michaelwave369.github.io" || (game.entry==="project" && page.hostname==="github.com")) &&
      repo.hostname==="github.com" && repo.pathname.startsWith("/MichaelWave369/");
  } catch {return false;}
}
