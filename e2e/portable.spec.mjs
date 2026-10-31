import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";

function portable(overrides={}) {
  return {schema:"REEL_PORTABLE_SETUP_V1",
    favorites:{sources:["nasa"],games:["spark"]},
    recents:["game:spark","source:nasa"],
    preferences:{mode:"touch"},...overrides};
}
async function settings(page) {
  await page.goto("/");
  await page.locator('#primary-nav [data-view="settings"]').click();
  await expect(page.locator("#portable-export-text")).toBeVisible();
}
async function seed(page) {
  await page.evaluate(()=>{
    localStorage.setItem("reel-theater:favorite-sources",'["tubi"]');
    localStorage.setItem("reel-theater:favorite-games",'["btm"]');
    localStorage.setItem("reel-theater:recent-links",'["game:btm"]');
    localStorage.setItem("reel-theater:display-mode","desktop");
  });
  await page.reload();
}
async function localSnapshot(page) {
  return page.evaluate(()=>({
    sources:JSON.parse(localStorage.getItem("reel-theater:favorite-sources")||"[]"),
    games:JSON.parse(localStorage.getItem("reel-theater:favorite-games")||"[]"),
    recents:JSON.parse(localStorage.getItem("reel-theater:recent-links")||"[]"),
    mode:localStorage.getItem("reel-theater:display-mode")
  }));
}

test("Show JSON and download export only curated, private portable settings",async({page})=>{
  await settings(page);
  await seed(page);
  await page.locator('[data-action="portable-show"]').click();
  const text=await page.locator("#portable-export-text").inputValue();
  const json=JSON.parse(text);
  expect(json.schema).toBe("REEL_PORTABLE_SETUP_V1");
  expect(json.favorites).toEqual({sources:["tubi"],games:["btm"]});
  expect(json.recents).toEqual(["game:btm"]);
  expect(json.preferences.mode).toBe("desktop");
  expect(text).not.toContain("file");
  expect(text).not.toContain("userAgent");
  expect(text).not.toContain("fieldReport");
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.locator('[data-action="portable-download"]').click()
  ]);
  expect(download.suggestedFilename()).toBe("reel-theater-setup.json");
  const disk=JSON.parse(readFileSync(await download.path(),"utf8"));
  expect(disk).toEqual(json);
});

test("preview then Merge preserves current layout and combines catalog favorites",async({page})=>{
  await settings(page);
  await seed(page);
  const input=page.locator("#portable-import-text");
  await input.fill(JSON.stringify(portable()));
  const merge=page.locator('[data-action="portable-merge"]');
  const replace=page.locator('[data-action="portable-replace"]');
  await expect(merge).toBeDisabled();
  await page.locator('[data-action="portable-preview"]').click();
  await expect(page.locator("#portable-preview-status")).toContainText("Incoming: 1 service favorites");
  await expect(page.locator("#portable-preview-status")).toContainText("Choose Merge or Replace");
  await expect(merge).toBeEnabled();
  await expect(replace).toBeEnabled();
  // Preview does not alter saved data.
  expect(await localSnapshot(page)).toEqual({sources:["tubi"],games:["btm"],recents:["game:btm"],mode:"desktop"});
  await merge.click();
  expect(await localSnapshot(page)).toEqual({
    sources:["tubi","nasa"],games:["btm","spark"],
    recents:["game:btm","game:spark","source:nasa"],mode:"desktop"
  });
  await page.reload();
  await page.locator('#primary-nav [data-view="quick"]').click();
  await page.locator('[data-quick-filter="favorites"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(4);
});

test("file picker imports locally and explicit Replace changes only portable settings",async({page})=>{
  await settings(page);
  await seed(page);
  await page.locator("#portable-file").setInputFiles({
    name:"portable-setup.json",
    mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(portable()))
  });
  await expect(page.locator("#portable-import-text")).toHaveValue(/REEL_PORTABLE_SETUP_V1/);
  await expect(page.locator('[data-action="portable-replace"]')).toBeDisabled();
  await page.locator('[data-action="portable-preview"]').click();
  await expect(page.locator('[data-action="portable-replace"]')).toBeEnabled();
  await page.locator('[data-action="portable-replace"]').click();
  expect(await localSnapshot(page)).toEqual({
    sources:["nasa"],games:["spark"],recents:["game:spark","source:nasa"],mode:"touch"
  });
  await expect(page.locator("html")).toHaveAttribute("data-ui-mode","touch");
  await page.reload();
  await page.locator('#primary-nav [data-view="quick"]').click();
  await expect(page.locator(".quick-home")).toHaveCount(0);
  await page.locator('[data-quick-filter="favorites"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(2);
});

test("invalid schema, tampering and changing text never allow a blind import",async({page})=>{
  await settings(page);
  await seed(page);
  const input=page.locator("#portable-import-text");
  const preview=page.locator('[data-action="portable-preview"]');
  const merge=page.locator('[data-action="portable-merge"]');
  await input.fill('{"schema":"UNKNOWN"}');
  await preview.click();
  await expect(page.locator("#portable-preview-status")).toContainText("Unsupported backup format");
  await expect(merge).toBeDisabled();
  await input.fill(JSON.stringify(portable()));
  await preview.click();
  await expect(merge).toBeEnabled();
  await input.fill("{}");
  await expect(merge).toBeDisabled();
  expect(await localSnapshot(page)).toEqual({sources:["tubi"],games:["btm"],recents:["game:btm"],mode:"desktop"});
});

test("unknown IDs are dropped, clearly previewed, and never become launch targets",async({page})=>{
  await settings(page);
  const malicious=portable({
    favorites:{sources:["nasa","not-a-provider"],games:["spark","https://evil.invalid/"]},
    recents:["game:spark","not-a-key"]
  });
  await page.locator("#portable-import-text").fill(JSON.stringify(malicious));
  await page.locator('[data-action="portable-preview"]').click();
  await expect(page.locator("#portable-preview-status")).toContainText("3 duplicate or unknown entries were excluded");
  await page.locator('[data-action="portable-replace"]').click();
  expect(await localSnapshot(page)).toEqual({
    sources:["nasa"],games:["spark"],recents:["game:spark"],mode:"touch"
  });
  await page.locator('#primary-nav [data-view="quick"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(11);
});
