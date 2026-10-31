# Rung 4: Every Screen browser/PWA field matrix

REEL Theater is a **single web app**, not five native apps. It aims to work in modern browsers on phones, tablets, desktops and TV devices. A working static build is **not** proof that any particular remote control, codec, DRM provider or Fire TV installation workflow works on a specific device.

## Best deployment strategy

One source tree, one GitHub Pages deployment, with:

- Controller and keyboard/remote TV presentation, plus touch-first mobile/tablet bottom navigation.
- Optional manual **TV / remote**, **Phone / tablet**, and **Desktop** layouts in Settings. Automatic mode uses screen/input hints, not a compatibility certificate.
- Standards-based manifest, locally generated 192/512 PNG icons, standalone display preference and scoped service-worker shell cache.
- No sign-in, telemetry, external startup assets, third-party media caching or unauthorized repo scraping.
- All URLs are relative to the hosting base path, including GitHub Pages project paths.
- Third-party video remains subject to its provider, permissions, browser codecs and DRM.

## Launch / shortcut guide

| Device | First launch | Shortcut / install reality |
| --- | --- | --- |
| Xbox Series X | Open published Pages URL in Edge | Browser favorite; native Xbox app installation **not verified** |
| Fire TV / Fire Stick | Open published Pages URL in Silk | Silk bookmark via browser menu. Do **not** promise PWA/WebAPK install |
| Android phone/tablet | Open in Chrome or supported browser | Install app or Add to Home Screen if browser offers it; may be a browser shortcut |
| iPhone/iPad | Open in Safari | Share, then Add to Home Screen (and Open as Web App if offered) |
| Desktop | Open in a modern browser | Bookmark, desktop shortcut, or install via supported browser |

Actual option names and install behaviors vary by browser/OS version. Settings only shows a **REEL install** button after the browser supplies the beforeinstallprompt event.

## Real hardware acceptance

- [ ] Xbox Edge: D-pad/left-stick spatial focus; A/B, Play/Close, Signal Breaker; Field Lab result; 10-foot UI readable.
- [ ] Fire TV Silk: D-pad/Select and remote Back (or browser cursor) behavior, scrolling, focus visibility, no trapped pages, bookmarks.
- [ ] Android Chrome: portrait/landscape orientation, on-screen keyboard, card/tap targets, bottom nav, optional installation.
- [ ] iPhone Safari: safe areas and notch, bottom nav above home indicator, Add to Home Screen if supported, autoplay restrictions.
- [ ] iPad Safari/Android tablet: touch-first layout, split screen or viewport resize, scroll and local form controls.
- [ ] Windows/macOS desktop: keyboard/pointer focus, optional install, startup performance.
- [ ] Network disconnected after an initial successful cached load: shell and Signal Breaker only; no claim that providers or streamed video work offline.
- [ ] After next deploy: updated shell loads; no broken icons or manifest 404s on the actual Pages URL.

## Benchmarks to collect, not assume

Record cold launch and warm launch time to first usable REEL navigation, modal open/close, source search latency, and first video frame time separately. Compare using the same Wi-Fi/router where possible. A static build/CI pass alone never proves sub-2-second startup on hardware.

## What is not implemented here

- No native Android APK, Fire TV package, iOS App Store app or Xbox Store package.
- No guaranteed background streaming, Chromecast/casting, DRM bypass, SMB scan, IPTV recording or video codec support.
- No service-worker video caching, external source playback proxy or surreptitious source checks.
- No universal device profile inferred from one Xbox or Fire TV test.

## Sources for installation behavior

- [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Apple: Turn a website into an app in Safari](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27)
- [Amazon: How to Use the Silk Web Browser on Fire TV](https://digprjsurvey.amazon.com/csad/help/node/TZ6CJ7nVQJW26yiItl)
