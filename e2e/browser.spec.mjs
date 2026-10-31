import {test,expect} from "@playwright/test";

async function openApp(page) {
  await page.goto("/");
  await expect(page.locator("#main-content .hero")).toBeVisible();
  await expect(page.locator('#primary-nav [data-view="home"]')).toHaveAttribute("aria-current","page");
}
async function switchTo(page,view) {
  await page.locator('#primary-nav [data-view="'+view+'"]').click();
  await expect(page.locator('#primary-nav [data-view="'+view+'"]')).toHaveAttribute("aria-current","page");
}
function expectedLayout(project) {
  if(project==="tv-remote-simulation") return "tv";
  if(project==="phone-touch-emulation" || project==="tablet-touch-emulation") return "touch";
  return "desktop";
}

test("real browser renders shell and expected responsive layout",async({page},testInfo)=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await openApp(page);
  await expect(page.locator("html")).toHaveAttribute("data-ui-mode",expectedLayout(testInfo.project.name));
  await expect(page.locator("#primary-nav button")).toHaveCount(7);
  await expect(page.locator("#connection-status")).toBeVisible();
  await page.screenshot({path:"test-results/"+testInfo.project.name+"-home.png",fullPage:true});
  expect(errors,errors.join("\n")).toEqual([]);
});

test("curated service search, favorite and reload work without provider requests",async({page})=>{
  const providerRequests=[];
  page.on("request",request=>{
    const host=new URL(request.url()).hostname;
    if(["tubitv.com","pluto.tv","watch.plex.tv"].includes(host)) providerRequests.push(host);
  });
  await openApp(page);
  await switchTo(page,"watch");
  await page.locator("#source-query").fill("NASA");
  await expect(page.locator("#source-results .source-card")).toHaveCount(1);
  await expect(page.locator("#source-results h3")).toHaveText("NASA+");
  await page.locator('[data-source-favorite="nasa"]').click();
  await page.reload();
  await switchTo(page,"watch");
  await page.locator('[data-source-favorites-only="true"]').click();
  await expect(page.locator("#source-results h3")).toHaveText("NASA+");
  expect(providerRequests).toEqual([]);
});

test("arcade controls own arrows only while playing; Back restores menus",async({page})=>{
  await openApp(page);
  await switchTo(page,"arcade");
  const start=page.locator("#start-game");
  const canvas=page.locator("#signal-breaker");
  await expect(start).toBeVisible();
  await start.click();
  await expect(canvas).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(canvas).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(start).toBeFocused();
  await page.keyboard.press("Backspace");
  await expect(page.locator('#primary-nav [data-view="home"]')).toHaveAttribute("aria-current","page");
});

test("media modal disables background, traps focus and restores opener",async({page})=>{
  await page.route("https://interactive-examples.mdn.mozilla.net/**",route=>route.abort());
  await openApp(page);
  await switchTo(page,"watch");
  const opener=page.locator('[data-action="demo"]').first();
  await opener.click();
  await expect(page.locator("#player-modal")).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveAttribute("inert","");
  await expect(page.locator("#close-player")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#player-modal :focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("#player-modal")).toBeHidden();
  await expect(page.locator(".app-shell")).not.toHaveAttribute("inert","");
  await expect(opener).toBeFocused();
});

test("game library is directly searchable and favorites are local",async({page},testInfo)=>{
  await openApp(page);
  await page.locator('#primary-nav [data-view="arcade"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#signal-breaker")).toBeVisible();
  await expect(page.locator(".game-card")).toHaveCount(5);
  await page.locator("#game-query").fill("Spark");
  await expect(page.locator("#game-results .game-card")).toHaveCount(1);
  await expect(page.locator("#game-results h3")).toHaveText("Spark: The Substrate");
  await page.locator('[data-game-favorite="spark"]').click();
  await expect(page.locator('[data-game-favorite="spark"]')).toHaveAttribute("aria-pressed","true");
  await page.screenshot({path:"test-results/"+testInfo.project.name+"-arcade.png",fullPage:true});
});

test("display preference and Field Lab observations persist across reload",async({page})=>{
  await openApp(page);
  await switchTo(page,"settings");
  await page.locator("#layout-mode").selectOption("tv");
  await expect(page.locator("html")).toHaveAttribute("data-ui-mode","tv");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ui-mode","tv");
  await switchTo(page,"field");
  await page.locator('[data-field-status="signal"]').selectOption("opened");
  await page.reload();
  await switchTo(page,"field");
  await expect(page.locator('[data-field-status="signal"]')).toHaveValue("opened");
});

test("media diagnostic panel records an attempted load without asserting playback",async({page})=>{
  await page.route("https://interactive-examples.mdn.mozilla.net/**",route=>route.abort());
  await openApp(page);
  await switchTo(page,"watch");
  await page.locator('[data-action="demo"]').first().click();
  await expect(page.locator("#player-modal")).toBeVisible();
  await expect(page.locator("#player-health-status")).not.toHaveText("Not started");
  await page.locator("#close-player").click();
  await expect(page.locator("#player-modal")).toBeHidden();
  await expect(page.locator("#health-events")).not.toContainText("No playback attempts yet");
});

test("manifest and generated image resources resolve on the real local static server",async({page,request})=>{
  await openApp(page);
  const manifest=await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const m=await manifest.json();
  expect(m.name).toBe("REEL Theater");
  for(const image of ["icon-192.png","icon-512.png"]){
    const response=await request.get("/icons/"+image);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toMatch(/image\/png/);
    const bytes=await response.body();
    expect(Array.from(bytes.subarray(0,8))).toEqual([137,80,78,71,13,10,26,10]);
  }
});

test("cached PWA app shell and arcade work without internet after installation",async({page,context})=>{
  await openApp(page);
  // localhost is a secure context even though its URL is HTTP.
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:8_000}).catch(async()=>{
    await page.reload();
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:15_000});
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#main-content .hero")).toBeVisible();
  await switchTo(page,"arcade");
  await expect(page.locator("#signal-breaker")).toBeVisible();
});
