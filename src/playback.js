// Session-only first-party media diagnostics. No network probing or telemetry.
// "playing" is a media element event, not proof of visible pixels or audio.
const ERRORS=Object.freeze({
  1:"Playback cancelled or aborted",
  2:"Network error while loading media",
  3:"Decode failed or codec unsupported",
  4:"Media format/source not supported"
});
const EVENTS=new Set(["loadstart","loadedmetadata","canplay","playing","waiting","stalled","error","ended","pause","seeking","seeked"]);
export const MAX_EVENTS=12;

export function createPlaybackSession({kind="demo",started=0}={}) {
  return {kind:kind==="local"?"local":"demo",started:Number.isFinite(started)?started:0,status:"Not started",
    events:[],firstPlayingMs:null,firstVideoFrameMs:null,videoFrameObservation:"not-checked",error:null};
}
export const VIDEO_FRAME_STATES=Object.freeze(["not-checked","pending","unavailable","not-applicable","observed"]);
export function setVideoFrameObservation(session,status) {
  if(!VIDEO_FRAME_STATES.includes(status))return session;
  return {...session,videoFrameObservation:status,
    firstVideoFrameMs:status==="observed"?session.firstVideoFrameMs:null};
}
// requestVideoFrameCallback reports frames submitted for composition by the browser.
// It does NOT independently prove that a viewer saw pixels or heard sound.
export function recordVideoFrameCallback(session,{now=0,hasVideo=true}={}) {
  if(session?.videoFrameObservation!=="pending"||!hasVideo)return session;
  const started=Number.isFinite(session.started)?session.started:0;
  const elapsed=Number.isFinite(now)?Math.max(0,Math.round(now-started)):0;
  return {...session,firstVideoFrameMs:elapsed,videoFrameObservation:"observed"};
}
export function firstVideoFrameLabel(session) {
  switch(session?.videoFrameObservation){
    case "pending":return "First video frame callback: awaiting a frame";
    case "observed":return "First video frame callback: "+session.firstVideoFrameMs+" ms after load request (not proof of visible picture)";
    case "unavailable":return "Frame callback API unavailable in this browser";
    case "not-applicable":return "Video frame measurement: not applicable to audio";
    default:return "First video frame callback: not checked";
  }
}
export function mediaErrorText(code) {
  return ERRORS[code] || "Unknown media error";
}
export function recordPlaybackEvent(session,event,{now=0,errorCode=null}={}) {
  if (!EVENTS.has(event)) return session;
  const time=Number.isFinite(now) ? Math.max(0,Math.round(now-session.started)) : 0;
  const next={...session,events:[...session.events,{event,elapsedMs:time}].slice(-MAX_EVENTS)};
  const labels={
    loadstart:"Loading requested",loadedmetadata:"Metadata received",canplay:"Browser reports it can begin",
    playing:"Browser signaled playback",waiting:"Buffering / waiting for data",
    stalled:"Loading stalled",error:"Playback error",ended:"Playback ended",
    pause:"Playback paused",seeking:"Seeking",seeked:"Seek complete"
  };
  next.status=labels[event];
  if (event==="playing" && next.firstPlayingMs===null) next.firstPlayingMs=time;
  if (event==="error") next.error=mediaErrorText(errorCode);
  return next;
}
export function safePlaybackSummary(session) {
  // No source URL, file name, hostname, user-agent or storage identifiers.
  return {
    kind:session?.kind==="local"?"local":"demo",
    status:String(session?.status||"Not started"),
    firstPlayingMs:Number.isFinite(session?.firstPlayingMs)?Math.max(0,session.firstPlayingMs):null,
    firstVideoFrameMs:Number.isFinite(session?.firstVideoFrameMs)?Math.max(0,session.firstVideoFrameMs):null,
    videoFrameObservation:VIDEO_FRAME_STATES.includes(session?.videoFrameObservation)?session.videoFrameObservation:"not-checked",
    error:session?.error?String(session.error):null,
    events:Array.isArray(session?.events)?session.events.slice(-MAX_EVENTS).map(row=>({
      event:String(row.event),elapsedMs:Math.max(0,Number(row.elapsedMs)||0)
    })):[]
  };
}
export function playbackGuidance(session) {
  if(session?.error){
    if(session.error.includes("Network")) return "Check connectivity and the demo host. This does not test other providers.";
    if(session.error.includes("Decode")||session.error.includes("format")) return "Try a supported MP4/H.264 or WebM format. Browser codec support varies.";
    return "Try another file or reload the sample. Browser and provider restrictions may apply.";
  }
  if(session?.status==="Buffering / waiting for data" || session?.status==="Loading stalled") return "Data is delayed. Check connectivity or the file; third-party buffering cannot be eliminated here.";
  if(session?.status==="Browser signaled playback") return session.videoFrameObservation==="observed" ?
    "The browser reported a video frame submitted for composition. Confirm actual picture and sound on your device." :
    "The media element reported playback. Confirm visible video and audio on your device.";
  return "Choose the demo or a local file to inspect real media-element events.";
}
