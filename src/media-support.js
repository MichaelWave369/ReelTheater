// First-party browser media format hints. A canPlayType response is only a
// browser declaration, NOT verification that a particular file will decode,
// that DRM is available, or that provider content will play.
export const FORMAT_HINTS=Object.freeze([
  Object.freeze({id:"mp4-h264",name:"MP4 / H.264",type:'video/mp4; codecs="avc1.42E01E"'}),
  Object.freeze({id:"mp4-hevc",name:"MP4 / HEVC (H.265)",type:'video/mp4; codecs="hvc1.1.6.L93.B0"'}),
  Object.freeze({id:"webm-vp8",name:"WebM / VP8",type:'video/webm; codecs="vp8"'}),
  Object.freeze({id:"webm-vp9",name:"WebM / VP9",type:'video/webm; codecs="vp9"'}),
  Object.freeze({id:"mp4-av1",name:"MP4 / AV1",type:'video/mp4; codecs="av01.0.05M.08"'}),
  Object.freeze({id:"mp3",name:"Audio / MP3",type:"audio/mpeg"}),
  Object.freeze({id:"aac",name:"Audio / AAC (MP4)",type:'audio/mp4; codecs="mp4a.40.2"'})
]);
export function normalizeMediaHint(response) {
  return response==="probably"||response==="maybe"?response:"not reported";
}
export function inspectMediaSupport(video,{mediaSource=null,frameCallback=null}={}) {
  const canPlay=video && typeof video.canPlayType==="function" ?
    type=>{try{return normalizeMediaHint(video.canPlayType(type));}catch{return "not reported";}} :
    ()=>"not reported";
  const formats=FORMAT_HINTS.map(({id,name,type})=>({id,name,hint:canPlay(type)}));
  return {
    schema:"REEL_BROWSER_MEDIA_HINTS_V1",
    formats,
    mediaSourceAPI:Boolean(mediaSource),
    videoFrameCallbackAPI:Boolean(frameCallback),
    note:"Browser-reported format hints only. A 'probably' or 'maybe' response does not verify file decoding, video output, audio, DRM, stream availability or provider compatibility."
  };
}
