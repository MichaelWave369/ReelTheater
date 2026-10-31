// Rung 11: bounded in-session JavaScript redraw observations.
// These measure synchronous main-screen rebuild time only. They do not measure
// actual paint, interaction-to-next-frame, media decode, or device launch speed.
export const MAX_REDRAWS=24;
export const IDLE_PAD_POLL_MS=280;
export const HIDDEN_PAD_POLL_MS=1000;

export function pollMode({connected=false,capturing=false,hidden=false}={}) {
  if(hidden)return {kind:"timeout",delayMs:HIDDEN_PAD_POLL_MS};
  if(connected||capturing)return {kind:"frame",delayMs:0};
  return {kind:"timeout",delayMs:IDLE_PAD_POLL_MS};
}

export function newRedrawLog() {
  return {samples:[]};
}
export function appendRedraw(log,{view="home",durationMs=0}={}) {
  if(typeof view!=="string"||!Number.isFinite(durationMs)||durationMs<0||durationMs>10000)return log;
  const label=view.slice(0,30).replace(/[^a-z-]/g,"")||"unknown";
  const safe={view:label,ms:Math.round(durationMs*10)/10};
  return {samples:[...(Array.isArray(log?.samples)?log.samples:[]),safe].slice(-MAX_REDRAWS)};
}
export function redrawSummary(log) {
  const samples=Array.isArray(log?.samples)?log.samples:[];
  const durations=samples.filter(x=>Number.isFinite(x?.ms)&&x.ms>=0&&x.ms<=10000)
    .map(x=>x.ms).sort((a,b)=>a-b);
  if(!durations.length)return null;
  const at=p=>durations[Math.min(durations.length-1,Math.ceil(p*durations.length)-1)];
  return {
    count:durations.length,
    lastMs:samples.at(-1)?.ms??null,
    medianMs:at(.5),
    p95Ms:at(.95),
    worstMs:durations.at(-1)
  };
}
