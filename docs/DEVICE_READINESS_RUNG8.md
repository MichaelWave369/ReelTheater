# Rung 8: Device Readiness Lab

## Purpose

REEL Theater already has a manual Field Lab for recording whether original games and official streaming websites work. **Device Readiness Lab** is a separate local-only diagnostic screen: it helps people discover what their *current browser* delivers as keyboard, remote/gamepad and pointer/touch input, then performs a short visible-tab animation interval sample.

This feature is useful while Xbox Series X, Fire TV Silk, iPhone, iPad and Android hardware tests remain outstanding. It **does not** claim a simulated browser represents a physical device, and it does not establish native installation, video/audio decoding, provider DRM access, or gaming performance.

## Interaction flow

1. Open **Device Lab** in primary navigation or from the Home quick card.
2. Examine current layout mode, reported gamepad connection, touch capability hint and service worker control. These are browser signals, not certificates.
3. Select **Start input test**. Focus moves into a large test target. Try D-pad/arrow keys, A/Enter, B/Escape, and tap/pointer.
4. The app records **only a limited allowlist of navigation actions**, not arbitrary keys or typed passwords. Escape/Backspace/B ends input capture and returns focus to the Start button. A held gamepad B does not immediately exit the parent screen.
5. Optionally select **Run frame sample**. Sixty animation-frame intervals are measured only while the page is visible. The app reports median, p95 and longest interval in milliseconds. This is **not video playback FPS**, a hardware benchmark, or startup-time comparison.
6. Optionally select **Download local device report**. It contains bounded semantic actions, display layout class, a few boolean capability hints, and optional frame pacing statistics. There is no automatic export or upload.

## Privacy and trust boundaries

The device report deliberately excludes raw typed text, local file paths, media URLs, full user agent, gamepad ID, precise axes, pointer coordinates, network addresses and device serials. It is session-only until the user explicitly downloads JSON. Report files are editable and unsigned, so a "worked" or "detected" status is only a user's observation on that particular browser.

The input event history stores at most 20 actions in memory. A test can be restarted without retaining a prior history. No external sites are contacted as part of this lab. No game controllers or OS input permissions are requested beyond what the browser normally exposes.

## Software acceptance

- Node unit tests cover key allowlisting, gamepad semantic mapping, bounded input history, sample interval quantiles and privacy-safe export.
- Playwright runs on four Chromium profiles: desktop, large-screen TV simulation, mobile touch emulation, tablet touch emulation.
- Integration tests exercise keyboard capture, pointer/touch, stopping capture, frame intervals, JSON download and a simulated Gamepad API mapping including held-B protection.
- Both Node and Chromium CI suites must pass for GitHub Pages automatic deployment.

## Physical-device validation, still pending

- Xbox Edge: connect a controller, then confirm D-pad/stick/A/B and focus handling.
- Fire TV Silk: verify whether the remote sends browser key events, or drives the Silk pointer. If it cannot forward input, record that honestly.
- Android/iOS: test actual touch events, backgrounding/visibility interruption and UI layout.
- Remote back buttons are browser-controlled on some devices and may not reach JavaScript.
- First actual game frame and audible media playback must be confirmed separately in the manual Field Lab.

Do not mark Xbox, Fire TV, iOS or Android as globally verified based on these synthetic tests. The acceptance protocol remains docs/DEVICE_MATRIX.md.
