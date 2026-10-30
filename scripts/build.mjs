import { cpSync, mkdirSync, rmSync } from "node:fs";
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const file of ["index.html", "styles.css", "favicon.svg", "sw.js"]) cpSync(file, "dist/" + file);
cpSync("src", "dist/src", { recursive: true });
console.log("REEL Theater static distribution built at dist/");
