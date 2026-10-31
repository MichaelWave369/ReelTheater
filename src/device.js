// REEL Device Readiness Lab: voluntary input observations and frame pacing.
// Zero hardware identifiers, raw typed text, raw axis positions or telemetry.
export const DEVICE_KEYS=Object.freeze({
  ArrowUp:"Up",ArrowDown:"Down",ArrowLeft:"Left",ArrowRight:"Right",
  Enter:"Select / Enter",Escape:"Back / Escape",Backspace:"Back / Backspace",
  BrowserBack:"Browser Back",GoBack:"Browser Back",Back:"Back",
  " ":"Space"
});
export const INPUT_LIMIT=20;
export const FRAME_LIMIT=90;

export function inputLabel(key) {
  return Object.hasOwn(DEVICE_KEYS,String(key)) ? DEVICE_KEYS[key] : null;
}
export function makeDeviceLog() {
  return {inputs:[],frame:null};
}
export function appendDeviceInput(log,kind,label) {
  const types=new Set(["keyboard","gamepad","touch","pointer"]);
  const safeType=types.has(kind)?kind:null;
  // Events come only from fixed semantic labels; never record arbitrary typed values.
  const allowed=new Set(Object.values(DEVICE_KEYS).concat(["A / Select","B / Back","D-pad Up","D-pad Down","D-pad Left","D-pad Right","Left stick Up","Left stick Down","Left stick Left","Left stick Right","Tap / touch","Pointer click"]));
  if (!safeType || !allowed.has(label)) return log;
  return {...log,inputs:[...log.inputs,{type:safeType,action:label}].slice(-INPUT_LIMIT)};
}
export function gamepadLabel(intent,pad) {
  const buttons=pad?.buttons || [];
  const pressed=i=>Boolean(buttons[i]?.pressed);
  if(pressed(0))return "A / Select";
  if(pressed(1))return "B / Back";
  for(const [index,direction] of [[12,"Up"],[13,"Down"],[14,"Left"],[15,"Right"]])if(pressed(index))return "D-pad "+direction;
  if(["up","down","left","right"].includes(intent))return "Left stick "+intent[0].toUpperCase()+intent.slice(1);
  return null;
}
export function frameStats(intervals) {
  if(!Array.isArray(intervals))return null;
  const values=intervals.filter(n=>Number.isFinite(n) && n>0 && n<10000).slice(0,FRAME_LIMIT).sort((a,b)=>a-b);
  if(values.length<10)return null;
  const at=p=>values[Math.min(values.length-1,Math.ceil(p*values.length)-1)];
  return {
    samples:values.length,
    medianMs:Math.round(at(.5)*10)/10,
    p95Ms:Math.round(at(.95)*10)/10,
    longestMs:Math.round(values[values.length-1]*10)/10
  };
}
export function safeDeviceReport(log,{mode="unknown",gamepadDetected=false,touchAvailable=false,offline=false,serviceWorker=false}={}) {
  const kinds=new Set(["tv","touch","desktop"]);
  const sanitized=makeDeviceLog();
  for(const entry of Array.isArray(log?.inputs)?log.inputs.slice(-INPUT_LIMIT):[]) {
    if(!entry||typeof entry!=="object")continue;
    Object.assign(sanitized,appendDeviceInput(sanitized,entry.type,entry.action));
  }
  const stats=log?.frame;
  if(stats && Number.isInteger(stats.samples) && stats.samples>=10 && stats.samples<=FRAME_LIMIT
      && ["medianMs","p95Ms","longestMs"].every(k=>Number.isFinite(stats[k]) && stats[k]>=0 && stats[k]<=10000)) {
    sanitized.frame={samples:stats.samples,medianMs:stats.medianMs,p95Ms:stats.p95Ms,longestMs:stats.longestMs};
  }
  return {
    schema:"REEL_DEVICE_READINESS_V1",
    context:{layout:kinds.has(mode)?mode:"unknown",gamepadDetected:Boolean(gamepadDetected),
      touchAvailable:Boolean(touchAvailable),offline:Boolean(offline),serviceWorker:Boolean(serviceWorker)},
    input: sanitized.inputs,
    frame: sanitized.frame,
    warning:"Local, self-operated browser observations only. No physical-device certification, audio/video playback proof, or provider availability claim."
  };
}
