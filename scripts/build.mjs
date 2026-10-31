import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createIcon } from "./generate-icons.mjs";
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const file of ["index.html", "styles.css", "favicon.svg", "sw.js", "manifest.webmanifest"]) cpSync(file, "dist/" + file);
cpSync("src", "dist/src", { recursive: true });
mkdirSync("dist/icons",{recursive:true});
for (const size of [192,512]) writeFileSync(`dist/icons/icon-${size}.png`,createIcon(size));
console.log("REEL Theater static distribution built at dist/");
