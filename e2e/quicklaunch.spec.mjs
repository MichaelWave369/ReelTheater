import {test,expect} from "@playwright/test";

async function quickView(page) {
  await page.goto("/");
  await page.locator('#primary-nav [data-view="quick"]').click();
  await expect(page.locator('#primary-nav [data-view="quick"]')).toHaveAttribute("aria-current","page");
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(11);
}
test("quick launch unifies 11 curated games and official destinations",async({page},testInfo)=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await quickView(page);
  await expect(page.locator("#quick-count")).toContainText("11 of 11");
  await page.locator("#quick-query").fill("NASA");
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(1);
  await expect(page.locator("#quick-results h3")).toHaveText("NASA+");
  await page.locator("#quick-query").fill("");
  await page.locator('[data-quick-filter="game"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(5);
  await page.locator('[data-quick-filter="source"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(6);
  await page.screenshot({path:"test-results/"+testInfo.project.name+"-quick-launch.png",fullPage:true});
  expect(errors).toEqual([]);
});

test("favorite a service and game centrally; both appear on Home after reload",async({page})=>{
  await quickView(page);
  await page.locator('[data-quick-favorite="source:nasa"]').click();
  await expect(page.locator('[data-quick-favorite="source:nasa"]')).toHaveAttribute("aria-pressed","true");
  await page.locator('[data-quick-favorite="game:spark"]').click();
  await expect(page.locator('[data-quick-favorite="game:spark"]')).toHaveAttribute("aria-pressed","true");
  await page.locator('[data-quick-filter="favorites"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(2);
  await page.reload();
  await page.locator('#primary-nav [data-view="home"]').click();
  await expect(page.locator(".quick-home .quick-card")).toHaveCount(2);
  await expect(page.locator(".quick-home")).toContainText("NASA+");
  await expect(page.locator(".quick-home")).toContainText("Spark: The Substrate");
  const saved=await page.evaluate(()=>({
    sources:JSON.parse(localStorage.getItem("reel-theater:favorite-sources")),
    games:JSON.parse(localStorage.getItem("reel-theater:favorite-games"))
  }));
  expect(saved.sources).toContain("nasa");
  expect(saved.games).toContain("spark");
});

test("the existing Watch and Arcade favorite actions appear on Quick Launch",async({page})=>{
  await page.goto("/");
  await page.locator('#primary-nav [data-view="watch"]').click();
  await page.locator('[data-source-favorite="nasa"]').click();
  await page.locator('#primary-nav [data-view="arcade"]').click();
  await page.locator('[data-game-favorite="spark"]').click();
  await page.locator('#primary-nav [data-view="quick"]').click();
  await page.locator('[data-quick-filter="favorites"]').click();
  await expect(page.locator("#quick-results h3")).toHaveText(["NASA+","Spark: The Substrate"]);
});

test("explicit external link clicks create local recents, never hidden provider requests",async({page})=>{
  const providerRequests=[];
  page.on("request",request=>{
    if(["www.nasa.gov","michaelwave369.github.io"].includes(new URL(request.url()).hostname)) providerRequests.push(request.url());
  });
  await quickView(page);
  await page.locator('[data-quick-filter="recent"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(0);
  await page.locator('[data-quick-filter="all"]').click();
  const nasa=page.locator('#quick-results a[data-quick-link="source:nasa"]');
  // Test the delegated user-activation path without contacting any provider.
  await nasa.evaluate(el=>{
    const event=new MouseEvent("click",{bubbles:true,cancelable:true});
    el.addEventListener("click",e=>e.preventDefault(),{once:true});
    el.dispatchEvent(event);
  });
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("reel-theater:recent-links")||"[]"))).toEqual(["source:nasa"]);
  await page.reload();
  await page.locator('[data-quick-filter="recent"]').click();
  await expect(page.locator("#quick-results h3")).toHaveText("NASA+");
  expect(providerRequests).toEqual([]);
  await page.locator('[data-action="clear-quick-recents"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem("reel-theater:recent-links"))).toBe("[]");
});

test("keyboard and touch can navigate unified shortcuts with standard links",async({page})=>{
  await quickView(page);
  const search=page.locator("#quick-query");
  await search.fill("Piece");
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(1);
  const link=page.locator('#quick-results a[data-quick-link="game:piece"]');
  await expect(link).toHaveAttribute("href","https://michaelwave369.github.io/PieceByPiece/");
  await expect(link).toHaveAttribute("rel",/noopener/);
  await expect(link).toHaveAttribute("target","_blank");
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator('#primary-nav [data-view="home"]')).toHaveAttribute("aria-current","page");
});

test("offline cached app shell includes unified shortcuts and remains navigable",async({page,context})=>{
  await page.goto("/");
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:8000}).catch(async()=>{
    await page.reload();
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),null,{timeout:15000});
  });
  await context.setOffline(true);
  await page.reload();
  await page.locator('#primary-nav [data-view="quick"]').click();
  await expect(page.locator("#quick-results .quick-card")).toHaveCount(11);
});
