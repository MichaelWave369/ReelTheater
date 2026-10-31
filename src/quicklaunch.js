// REEL Quick Launch: a unified, static, first-party-curated shortcut index.
// Opening a link is a user gesture; a recent click is NOT proof of page load,
// stream availability, playback, or console compatibility.
import {SOURCES,validSourceIds} from "./sources.js";
import {GAMES,validGameFavoriteIds} from "./games.js";

export const QUICK_FILTERS=Object.freeze([
  Object.freeze({id:"all",label:"All"}),
  Object.freeze({id:"favorites",label:"Favorites"}),
  Object.freeze({id:"recent",label:"Recent"}),
  Object.freeze({id:"game",label:"Games"}),
  Object.freeze({id:"source",label:"Watch & Live"})
]);

export const QUICK_ITEMS=Object.freeze([
  ...SOURCES.map(source=>Object.freeze({
    key:"source:"+source.id,kind:"source",id:source.id,name:source.name,
    group:source.category==="live"?"Live TV":"Watch",
    description:source.description,url:source.url,cta:"Open official destination",category:source.category
  })),
  ...GAMES.map(game=>Object.freeze({
    key:"game:"+game.id,kind:"game",id:game.id,name:game.name,
    group:game.entry==="project"?"Game project":"Game",
    description:game.description,url:game.url,
    cta:game.entry==="project"?"View project":"Open browser game",category:game.category
  }))
]);
const BY_KEY=new Map(QUICK_ITEMS.map(item=>[item.key,item]));
const MAX_RECENTS=9;

export function quickItem(key) {
  return typeof key==="string"?BY_KEY.get(key)||null:null;
}
export function favoriteKeys({sources=[],games=[]}={}) {
  return [
    ...validSourceIds(sources).map(id=>"source:"+id),
    ...validGameFavoriteIds(games).map(id=>"game:"+id)
  ];
}
export function validRecents(value) {
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter(key=>typeof key==="string"&&BY_KEY.has(key)))].slice(0,MAX_RECENTS);
}
export function parseRecents(raw) {
  if(typeof raw!=="string"||raw.length>2048)return [];
  try{return validRecents(JSON.parse(raw));}
  catch{return [];}
}
export function recordRecent(list,key) {
  if(!BY_KEY.has(key))return validRecents(list);
  return [key,...validRecents(list).filter(existing=>existing!==key)].slice(0,MAX_RECENTS);
}
export function quickResults({query="",filter="all",favorites=[],recent=[]}={}) {
  const q=String(query).toLocaleLowerCase().trim().slice(0,100);
  const selected=QUICK_FILTERS.some(item=>item.id===filter)?filter:"all";
  const fav=new Set(Array.isArray(favorites)?favorites.filter(key=>typeof key==="string"&&BY_KEY.has(key)):[]);
  const latest=validRecents(recent);
  const history=new Set(latest);
  const rank=new Map(latest.map((key,index)=>[key,index]));
  return QUICK_ITEMS.filter(item=>
    (selected==="all"||selected==="favorites"&&fav.has(item.key)||
     selected==="recent"&&history.has(item.key)||
     selected==="game"&&item.kind==="game"||
     selected==="source"&&item.kind==="source") &&
    (!q || (item.name+" "+item.group+" "+item.description+" "+item.category).toLocaleLowerCase().includes(q))
  ).sort((a,b)=>{
    if(selected==="recent")return (rank.get(a.key)??99)-(rank.get(b.key)??99);
    // At first launch, favorites surface first. Recent choices come next.
    const af=fav.has(a.key),bf=fav.has(b.key);
    if(af!==bf)return af?-1:1;
    const ar=rank.get(a.key)??99,br=rank.get(b.key)??99;
    return ar-br;
  });
}
export function quickHomeItems({favorites=[],recent=[]}={}) {
  const keys=[...(Array.isArray(favorites)?favorites:[]),...validRecents(recent)].filter((key,i,items)=>items.indexOf(key)===i && BY_KEY.has(key));
  return keys.slice(0,6).map(key=>BY_KEY.get(key));
}
