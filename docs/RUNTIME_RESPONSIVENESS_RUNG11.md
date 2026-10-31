# Rung 11: Runtime Responsiveness and Honest UI Redraw Timings

## Purpose

REEL Theater runs on desktop, browser-based TV hardware, tablets, and phones. While physical Xbox Series X Edge and Fire TV Silk tests remain outstanding, this rung fixes two avoidable sources of work in the existing browser app. It also gives a *local* observation of JavaScript screen-rebuild time without inventing a device benchmark.

## Changes that affect responsiveness

**Idle controller polling.** Previous versions used requestAnimationFrame to check the Gamepad API on every frame even with no controller connected. Rung 11 polls in a short 280 ms interval while no controller is reported, then returns to requestAnimationFrame when one is present or while the Device Lab's explicit gamepad input capture is active. Browser gamepadconnected and gamepaddisconnected events prompt immediate resampling, and hidden tabs use a slower 1000 ms policy. This reduces avoidable JavaScript work on idle, controller-free screens but does **not** claim a measured battery-life increase.

**No redundant active-tab rerender.** Clicking the currently selected navigation tab no longer replaces the entire main page DOM. This preserves Quick Launch's typed search and Signal Breaker's running canvas. A different tab still gets a fresh screen as before; manual backup imports and user-triggered updates can explicitly call render when needed.

**In-session redraw timings.** The Device Lab now displays a bounded collection of the last 24 synchronous JavaScript main-screen redraw durations: last, median, p95, and worst observed milliseconds. There is a clear button. These values are derived from performance.now() before/after the existing render function, and are *not* proof of visual paint, input-to-photon latency, streaming first frame, gaming FPS or actual device startup.

No startup speedup, frame-rate boost, or controller responsiveness improvement is claimed without a real A/B measurement on representative hardware.

## Behavior and guardrails

- No external scripts, cloud services, accounts or telemetry.
- No external media or game files are cached. Only the new local performance module is added to the offline shell.
- No persistence of timing values. Readings disappear on reload and do not appear in the existing exported Device Lab report.
- The Gamepad API can be restricted in some browsers, and the browser may suppress gamepad events. The periodic slow poll remains a fallback; it can introduce up to approximately 280 ms detection lag for devices that provide no connection event. Once detected, controller input uses animation-frame polling as before.
- Hidden tabs are intentionally not treated as responsive foreground TV sessions.

## Automated acceptance

- Node tests verify the idle/active/hidden polling policy, sample validation, bounded records, summary quantiles, and no redundant navigation replacement.
- Chromium E2E tests in four screen profiles verify that clicking the already active Quick Launch or Arcade tab preserves live DOM and focus; Device Lab timing summaries update and can be cleared; idle Gamepad API calls are bounded; and a simulated connection event restores frequent polling and the B-to-Home behavior.
- The GitHub Pages deployment still requires both Node and Chromium jobs to pass.

## Outstanding physical-device testing

On Xbox Series X Edge and Amazon Fire TV Silk, verify actual controller/remote enumeration, timing after a connection event, D-pad selection, long-screen focus, Back navigation, and provider behavior. The Android/iOS browser runs must separately verify screen transitions, backgrounding behavior, and actual input routing.

A green Chromium test remains a software regression gate, **not** a certification of Fire TV, Xbox, phone, or tablet hardware.
