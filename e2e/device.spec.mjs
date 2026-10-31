import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";

async function openDevice(page) {
  await page.goto("/");
  await page.locator('#primary-nav [data-view="device"]').click();
  await expect(page.locator('#primary-nav [data-view="device"]')).toHaveAttribute("aria-current","page");
  await expect(page.locator("#device-capture-target")).toBeVisible();
}

test("recognizes only requested keyboard navigation and releases on Escape",async({page})=>{
  await openDevice(page);
  await expect(page.locator("#device-input-count")).toHaveText("0");
  await page.locator('[data-action="device-start"]').click();
  await expect(page.locator("#device-capture-target")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#device-input-events")).toContainText("keyboard: Left");
  await page.keyboard.press("x");
  await expect(page.locator("#device-input-count")).toHaveText("1");
  await page.keyboard.press("Escape");
  await expect(page.locator("#device-input-events")).toContainText("keyboard: Back / Escape");
  await expect(page.locator("#device-capture-status")).toHaveText("Not recording");
  await expect(page.locator('[data-action="device-start"]')).toBeFocused();
  await expect(page.locator('#primary-nav [data-view="device"]')).toHaveAttribute("aria-current","page");
});

test("input target accepts pointer or touch without recording coordinates",async({page})=>{
  await openDevice(page);
  await page.locator('[data-action="device-start"]').click();
  await page.locator("#device-capture-target").click();
  await expect(page.locator("#device-input-count")).toHaveText("1");
  await expect(page.locator("#device-input-events")).toContainText(/(Tap \/ touch|Pointer click)/);
  await page.locator('[data-action="device-stop"]').click();
  await expect(page.locator("#device-capture-status")).toHaveText("Not recording");
});

test("frame sample produces visible animation interval statistics",async({page})=>{
  await openDevice(page);
  await page.locator('[data-action="device-frame"]').click();
  await expect(page.locator("#device-frame-result")).toContainText("60 intervals",{timeout:15_000});
  await expect(page.locator("#device-frame-result")).toContainText("Not video/game FPS.");
});

test("export is explicit, semantic and excludes raw keystrokes or hardware ID",async({page})=>{
  await openDevice(page);
  await page.locator('[data-action="device-start"]').click();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.locator('[data-action="device-export"]').click()
  ]);
  expect(download.suggestedFilename()).toBe("reel-device-readiness.json");
  const p=await download.path();
  const data=JSON.parse(readFileSync(p,"utf8"));
  expect(data.schema).toBe("REEL_DEVICE_READINESS_V1");
  expect(data.input.map(e=>e.action)).toEqual(["Up","Back / Escape"]);
  expect(data.warning).toContain("self-operated browser observations");
  expect(data).not.toHaveProperty("userAgent");
  expect(data).not.toHaveProperty("gamepadId");
});

test("simulated gamepad B records action and never exits Device Lab while held",async({page})=>{
  await page.addInitScript(()=>{
    const buttons=Array.from({length:16},()=>({pressed:false}));
    window.__reelTestPadButtons=buttons;
    Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[{buttons,axes:[0,0]}]});
  });
  await openDevice(page);
  await page.locator('[data-action="device-start"]').click();
  await page.evaluate(()=>{window.__reelTestPadButtons[12].pressed=true;});
  await expect(page.locator("#device-input-events")).toContainText("gamepad: D-pad Up");
  await page.evaluate(()=>{
    window.__reelTestPadButtons[12].pressed=false;
    window.__reelTestPadButtons[1].pressed=true;
  });
  await expect(page.locator("#device-input-events")).toContainText("gamepad: B / Back");
  await expect(page.locator("#device-capture-status")).toHaveText("Not recording");
  await page.waitForTimeout(450);
  await expect(page.locator('#primary-nav [data-view="device"]')).toHaveAttribute("aria-current","page");
  await page.evaluate(()=>{window.__reelTestPadButtons[1].pressed=false;});
});
