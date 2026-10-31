import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir:"./e2e",
  timeout:30_000,
  expect:{timeout:8_000},
  retries:process.env.CI ? 1 : 0,
  workers:process.env.CI ? 1 : undefined,
  fullyParallel:false,
  reporter:process.env.CI ? [["line"],["html",{outputFolder:"playwright-report",open:"never"}]] : [["list"]],
  use:{
    baseURL:"http://127.0.0.1:4173",
    trace:"retain-on-failure",
    screenshot:"only-on-failure"
  },
  webServer:{
    command:"python3 -m http.server 4173 --bind 127.0.0.1 --directory dist",
    url:"http://127.0.0.1:4173/",
    reuseExistingServer:!process.env.CI,
    timeout:20_000
  },
  projects:[
    {name:"desktop-chromium",use:{browserName:"chromium",viewport:{width:1440,height:900}}},
    {name:"tv-remote-simulation",use:{
      browserName:"chromium",viewport:{width:1920,height:1080},
      userAgent:"Mozilla/5.0 (Linux; Android 9; AFTMM) AppleWebKit/537.36 Silk/100 Chrome/123 Safari/537.36"
    }},
    {name:"phone-touch-emulation",use:{browserName:"chromium",viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}},
    {name:"tablet-touch-emulation",use:{browserName:"chromium",viewport:{width:1024,height:768},isMobile:true,hasTouch:true,deviceScaleFactor:2}}
  ]
});
