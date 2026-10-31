import {test,expect} from "@playwright/test";

async function openView(page,view) {
  await page.goto("/");
  await page.locator('#primary-nav [data-view="'+view+'"]').click();
  await expect(page.locator('#primary-nav [data-view="'+view+'"]')).toHaveAttribute("aria-current","page");
}

test("selecting the active Quick Launch tab keeps the existing search DOM and typed query",async({page})=>{
  await openView(page,"quick");
  await page.locator("#quick-query").fill("Spark");
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(1);
  await page.locator("#quick-query").evaluate(el=>el.dataset.testPreserved="yes");
  await page.locator('#primary-nav [data-view="quick"]').click();
  await expect(page.locator("#quick-query")).toHaveValue("Spark");
  await expect(page.locator("#quick-query")).toHaveAttribute("data-test-preserved","yes");
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(1);
});

test("selecting the active Arcade tab never recreates a running game canvas",async({page})=>{
  await openView(page,"arcade");
  await page.locator("#start-game").click();
  await expect(page.locator("#signal-breaker")).toBeFocused();
  await page.locator("#signal-breaker").evaluate(el=>el.dataset.testPreserved="running");
  await page.locator('#primary-nav [data-view="arcade"]').click();
  await expect(page.locator("#signal-breaker")).toHaveAttribute("data-test-preserved","running");
  // Clicking the active navigation button moves focus out of gameplay; reacquire it explicitly.
  await page.locator("#signal-breaker").focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#start-game")).toBeFocused();
});

test("Device Lab shows real in-session synchronous redraw numbers, not invented hardware FPS",async({page})=>{
  await openView(page,"quick");
  await page.locator('#primary-nav [data-view="device"]').click();
  await expect(page.locator("#device-redraw-result")).toContainText("screen rebuilds");
  await expect(page.locator("#device-redraw-result")).toContainText("JavaScript DOM work, not paint.");
  await page.locator('[data-action="redraw-clear"]').click();
  await expect(page.locator("#device-redraw-result")).toHaveText("No screen redraw timing observed.");
  await page.locator('#primary-nav [data-view="home"]').click();
  await page.locator('#primary-nav [data-view="device"]').click();
  await expect(page.locator("#device-redraw-result")).toContainText("screen rebuilds");
});

test("disconnected gamepad polling stays below frame-rate while browser remains responsive",async({page})=>{
  await page.addInitScript(()=>{
    window.__gamepadPolls=0;
    Object.defineProperty(navigator,"getGamepads",{
      configurable:true,value:()=>{window.__gamepadPolls++;return [];}
    });
  });
  await page.goto("/");
  await expect(page.locator("#main-content .hero")).toBeVisible();
  await page.waitForTimeout(800);
  const polls=await page.evaluate(()=>window.__gamepadPolls);
  expect(polls).toBeGreaterThan(0);
  expect(polls).toBeLessThan(12);
  await openView(page,"watch");
  await expect(page.locator("#source-results .source-card")).toHaveCount(6);
});

test("gamepadconnected wakes the scheduler and B still returns Home",async({page})=>{
  await page.addInitScript(()=>{
    window.__padReads=0;
    window.__testConnected=false;
    const buttons=Array.from({length:16},()=>({pressed:false}));
    window.__buttons=buttons;
    const gamepad={buttons,axes:[0,0]};
    Object.defineProperty(navigator,"getGamepads",{
      configurable:true,value:()=>{
        window.__padReads++;
        return window.__testConnected?[gamepad]:[];
      }
    });
  });
  await page.goto("/");
  await page.locator('#primary-nav [data-view="quick"]').click();
  await page.evaluate(()=>{
    window.__testConnected=true;
    window.dispatchEvent(new Event("gamepadconnected"));
  });
  await expect.poll(()=>page.locator("#controller-status").textContent()).toContain("Controller connected");
  const before=await page.evaluate(()=>window.__padReads);
  await expect.poll(()=>page.evaluate(start=>window.__padReads-start,before),{timeout:2000}).toBeGreaterThan(5);
  await page.evaluate(()=>window.__buttons[1].pressed=true);
  await expect(page.locator('#primary-nav [data-view="home"]')).toHaveAttribute("aria-current","page");
  await page.evaluate(()=>window.__buttons[1].pressed=false);
});

test("hidden tabs use a slower controller sampling policy",async({page})=>{
  await page.goto("/");
  // Unit contract covers the hidden schedule; this integration check confirms
  // normal UI remains available and the browser profile has the code installed.
  const result=await page.evaluate(async()=> {
    const mod=await import("./src/performance.js");
    return mod.pollMode({connected:true,hidden:true});
  });
  expect(result).toEqual({kind:"timeout",delayMs:1000});
});
