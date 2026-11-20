import {test,expect} from "@playwright/test";

test("MikeyFlix local server setup persists per browser without contacting Jellyfin",async({page})=>{
  const outside=[];
  page.on("request",request=>{
    if(new URL(request.url()).hostname==="192.168.1.25")outside.push(request.url());
  });
  await page.goto("/");
  await page.locator('#primary-nav [data-view="library"]').click();
  await expect(page.locator("#jellyfin-open")).toBeHidden();
  await page.locator("#jellyfin-url").fill("http://192.168.1.25:8096/");
  await page.locator('[data-action="jellyfin-save"]').click();
  await expect(page.locator("#jellyfin-open")).toHaveAttribute("href","http://192.168.1.25:8096");
  await expect(page.locator("#jellyfin-open")).toHaveAttribute("target","_blank");
  await expect(page.locator("#jellyfin-open")).toHaveAttribute("rel",/noopener/);
  await expect(page.locator("#jellyfin-status")).toContainText("not verified");
  await page.reload();
  await expect(page.locator("#jellyfin-url")).toHaveValue("http://192.168.1.25:8096");
  await expect(page.locator("#jellyfin-open")).toBeVisible();
  expect(outside).toEqual([]);
  await page.locator('[data-action="jellyfin-clear"]').click();
  await expect(page.locator("#jellyfin-open")).toBeHidden();
  await expect(page.locator("#jellyfin-url")).toHaveValue("");
});

test("public and credential-bearing targets are rejected with a clear message",async({page})=>{
  await page.goto("/#library");
  for(const value of ["http://8.8.8.8:8096","http://user:pass@192.168.1.25:8096","http://192.168.1.25:8096/?apikey=secret"]){
    await page.locator("#jellyfin-url").fill(value);
    await page.locator('[data-action="jellyfin-save"]').click();
    await expect(page.locator("#jellyfin-open")).toBeHidden();
    await expect(page.locator("#jellyfin-status")).not.toBeEmpty();
  }
});
