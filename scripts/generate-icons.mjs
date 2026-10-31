// Deterministic, zero-dependency REEL Theater PWA icons.
// Build-time PNG generation only. The app itself never runs this code.
import {mkdirSync,writeFileSync} from "node:fs";
import {deflateSync} from "node:zlib";

function crc32(data) {
  let crc=0xffffffff;
  for(const byte of data) {
    crc ^= byte;
    for(let j=0;j<8;j++) crc = (crc>>>1) ^ (crc&1 ? 0xedb88320 : 0);
  }
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data) {
  const name=Buffer.from(type,"ascii"), n=Buffer.alloc(4), checksum=Buffer.alloc(4);
  n.writeUInt32BE(data.length,0);
  checksum.writeUInt32BE(crc32(Buffer.concat([name,data])),0);
  return Buffer.concat([n,name,data,checksum]);
}
function colorAt(x,y,size) {
  const u=(x+0.5)/size, v=(y+0.5)/size;
  let rgb=[11,16,33];
  const d=Math.max(Math.abs(u-0.5),Math.abs(v-0.5));
  const round=Math.max(0,Math.hypot(Math.max(0,Math.abs(u-.5)-.265),Math.max(0,Math.abs(v-.5)-.265)));
  if(d<.265 || round<.045) rgb=[53,43,106];
  const letterBar=u>=.33&&u<=.405&&v>=.32&&v<=.69;
  const letterTop=u>=.34&&u<=.58&&v>=.32&&v<=.39;
  const letterRight=u>=.555&&u<=.625&&v>=.37&&v<=.495;
  const letterMid=u>=.35&&u<=.57&&v>=.48&&v<=.545;
  const diagonal=v>=.53&&v<=.69&&Math.abs(u-(.46+(v-.53)*.88))<.045;
  if(letterBar||letterTop||letterRight||letterMid||diagonal) rgb=[230,220,255];
  if(Math.hypot(u-.708,v-.295)<.047)rgb=[112,223,229];
  return rgb;
}
export function createIcon(size) {
  if(!Number.isInteger(size)||size<16||size>1024)throw Error("Invalid icon size");
  const rowBytes=size*4+1, pixels=Buffer.alloc(rowBytes*size);
  for(let y=0;y<size;y++) {
    const offset=y*rowBytes;
    pixels[offset]=0; // PNG filter: none
    for(let x=0;x<size;x++){
      const i=offset+1+x*4, rgb=colorAt(x,y,size);
      pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];pixels[i+3]=255;
    }
  }
  const header=Buffer.alloc(13);
  header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);
  header[8]=8;header[9]=6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(pixels,{level:9})),chunk("IEND",Buffer.alloc(0))]);
}
if(process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  mkdirSync("dist/icons",{recursive:true});
  for(const size of [192,512])writeFileSync("dist/icons/icon-"+size+".png",createIcon(size));
  console.log("Generated 192px and 512px offline PWA icons");
}
