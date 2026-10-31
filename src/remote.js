// Deterministic, testable directional navigation for TV/remote controls.
// Geometry inputs are plain objects so it works without a DOM or third-party library.
export const FOCUSABLE_SELECTOR =
  "#primary-nav button, main button:not(:disabled), main a[href], main input:not(:disabled), main select:not(:disabled), main textarea:not(:disabled), .topbar button";

export function rectCenter(rect) {
  if (!rect || ![rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)) return null;
  return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
}

export function pickSpatialIndex(rectangles, currentIndex, direction) {
  if (!["up","down","left","right"].includes(direction) || !Array.isArray(rectangles) || !rectangles.length) return -1;
  if (currentIndex<0 || currentIndex>=rectangles.length) return 0;
  const current=rectCenter(rectangles[currentIndex]);
  if (!current) return 0;
  let best=-1, score=Infinity;
  rectangles.forEach((rect,i)=>{
    if (i===currentIndex) return;
    const candidate=rectCenter(rect);
    if(!candidate)return;
    const dx=candidate.x-current.x,dy=candidate.y-current.y;
    const primary=direction==="left"?-dx:direction==="right"?dx:direction==="up"?-dy:dy;
    if(primary<8)return;
    const offAxis=direction==="left"||direction==="right"?Math.abs(dy):Math.abs(dx);
    if(offAxis>primary*3+140)return;
    const candidateScore=primary+offAxis*1.4;
    if(candidateScore<score){score=candidateScore;best=i;}
  });
  return best;
}

export function gamepadIntent(pad,{gameFocused=false}={}) {
  if(!pad) return "";
  const pressed=i=>Boolean(pad.buttons?.[i]?.pressed);
  if(pressed(1))return gameFocused?"exit-game":"back"; // Xbox B
  if(gameFocused)return ""; // The game owns A, D-pad and the left stick
  if(pressed(0))return "select"; // Xbox A
  if(pressed(12)||(pad.axes?.[1]??0)<-0.6)return "up";
  if(pressed(13)||(pad.axes?.[1]??0)>0.6)return "down";
  if(pressed(14)||(pad.axes?.[0]??0)<-0.6)return "left";
  if(pressed(15)||(pad.axes?.[0]??0)>0.6)return "right";
  return "";
}

export function isArcadeControlKey(key) {
  return ["ArrowLeft","ArrowRight","a","A","d","D"," ","Enter"].includes(key);
}
