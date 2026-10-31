import {test,expect} from "@playwright/test";

async function openWatch(page) {
  await page.route("https://interactive-examples.mdn.mozilla.net/**",route=>route.abort());
  await page.goto("/");
  await page.locator('#primary-nav [data-view="watch"]').click();
  await expect(page.locator("#health-status")).toBeVisible();
}

test("browser media hints run only after explicit Check, with no external probes",async({page})=>{
  const external=[];
  page.on("request",request=>{
    const url=new URL(request.url());
    if(url.hostname!=="127.0.0.1")external.push(url.hostname);
  });
  await openWatch(page);
  await expect(page.locator("#media-support-results")).toContainText("No checks run yet");
  await expect(page.locator(".media-support-list li")).toHaveCount(0);
  await page.locator('[data-action="inspect-formats"]').click();
  await expect(page.locator(".media-support-list li")).toHaveCount(7);
  await expect(page.locator(".media-support-list")).toContainText("MP4 / H.264");
  await expect(page.locator(".media-support-list")).toContainText("WebM / VP9");
  const hints=await page.locator(".media-support-list strong").allTextContents();
  expect(hints.every(text=>["probably","maybe","not reported"].includes(text))).toBeTruthy();
  await expect(page.locator(".media-support-api")).toContainText("Video-frame callback API:");
  expect(external).toEqual([]);
});

test("first video-frame callback is not falsely reported from the playing event",async({page})=>{
  await page.addInitScript(()=>{
    window.__reelFrameCallbacks=new Map();
    window.__reelFrameNext=0;
    Object.defineProperty(HTMLVideoElement.prototype,"requestVideoFrameCallback",{
      configurable:true,value:function(cb){
        const id=++window.__reelFrameNext;
        window.__reelFrameCallbacks.set(id,cb);
        return id;
      }
    });
    Object.defineProperty(HTMLVideoElement.prototype,"cancelVideoFrameCallback",{
      configurable:true,value:function(id){window.__reelFrameCallbacks.delete(id);}
    });
  });
  await openWatch(page);
  await page.locator('[data-action="demo"]').first().click();
  await expect(page.locator("#player-modal")).toBeVisible();
  await expect(page.locator("#player-health-frame")).toContainText("awaiting a frame");
  await page.locator("#media-player").evaluate(el=>el.dispatchEvent(new Event("playing")));
  await expect(page.locator("#player-health-status")).toHaveText("Browser signaled playback");
  await expect(page.locator("#player-health-frame")).toContainText("awaiting a frame");
  await page.evaluate(()=>{
    const el=document.getElementById("media-player");
    Object.defineProperty(el,"videoWidth",{configurable:true,value:640});
    Object.defineProperty(el,"videoHeight",{configurable:true,value:360});
    const callbacks=window.__reelFrameCallbacks;
    const [id,cb]=Array.from(callbacks.entries()).at(-1);
    callbacks.delete(id);
    cb(performance.now(),{presentedFrames:1});
  });
  await expect(page.locator("#player-health-frame")).toContainText("ms after load request");
  await expect(page.locator("#player-health-guidance")).toContainText("Confirm actual picture and sound");
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.locator('#player-modal [data-action="export-health"]').click()
  ]);
  expect(download.suggestedFilename()).toBe("reel-playback-health.json");
  const data=JSON.parse(await (await import("node:fs/promises")).readFile(await download.path(),"utf8"));
  expect(data.schema).toBe("REEL_PLAYBACK_SESSION_V2");
  expect(data.summary.videoFrameObservation).toBe("observed");
  expect(data.summary.firstVideoFrameMs).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(data)).not.toContain("flower.mp4");
  await page.locator("#close-player").click();
  await expect(page.locator("#health-first-frame")).toContainText("ms after load request");
});

test("closing player invalidates stale callbacks from previous media session",async({page})=>{
  await page.addInitScript(()=>{
    window.__callbacks=[];
    Object.defineProperty(HTMLVideoElement.prototype,"requestVideoFrameCallback",{
      configurable:true,value:cb=>{window.__callbacks.push(cb);return window.__callbacks.length;}
    });
    // Deliberately don't implement cancel to ensure generation guard works.
    Object.defineProperty(HTMLVideoElement.prototype,"cancelVideoFrameCallback",{
      configurable:true,value:undefined
    });
  });
  await openWatch(page);
  await page.locator('[data-action="demo"]').first().click();
  await expect(page.locator("#player-health-frame")).toContainText("awaiting a frame");
  await page.locator("#close-player").click();
  await page.locator('[data-action="demo"]').first().click();
  await expect(page.locator("#player-health-frame")).toContainText("awaiting a frame");
  await page.evaluate(()=>{
    const el=document.getElementById("media-player");
    Object.defineProperty(el,"videoWidth",{configurable:true,value:640});
    Object.defineProperty(el,"videoHeight",{configurable:true,value:360});
    window.__callbacks[0](performance.now(),{presentedFrames:1});
  });
  await expect(page.locator("#player-health-frame")).toContainText("awaiting a frame");
  await page.evaluate(()=>window.__callbacks[1](performance.now(),{presentedFrames:1}));
  await expect(page.locator("#player-health-frame")).toContainText("ms after load request");
});

test("audio-only media never claims it produced a video frame",async({page})=>{
  await openWatch(page);
  await page.locator("#local-file").setInputFiles({
    name:"synthetic-audio.mp3",mimeType:"audio/mpeg",buffer:Buffer.from([0,1,2,3,4])
  });
  await expect(page.locator("#player-modal")).toBeVisible();
  await expect(page.locator("#player-health-frame")).toContainText("not applicable to audio");
  await page.locator("#close-player").click();
  await expect(page.locator("#health-first-frame")).toContainText("not applicable to audio");
});

test("without browser frame callback API, show an honest unavailable state",async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(HTMLVideoElement.prototype,"requestVideoFrameCallback",{
      configurable:true,value:undefined
    });
  });
  await openWatch(page);
  await page.locator('[data-action="demo"]').first().click();
  await expect(page.locator("#player-health-frame")).toContainText("API unavailable");
  await page.locator("#close-player").click();
  await expect(page.locator("#health-first-frame")).toContainText("API unavailable");
});
