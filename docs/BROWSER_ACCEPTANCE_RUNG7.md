# Rung 7: Real browser acceptance, simulated device profiles

REEL Theater remains one static browser app, not separate Xbox, Fire TV, Android, or iOS applications. Earlier rungs validated JavaScript and data contracts. Rung 7 adds **real Chromium integration tests** for rendered navigation, the player dialog, responsive layouts, and the offline PWA shell.

## Profiles in GitHub CI

| Test profile | Viewport | Simulates | Does not prove |
| --- | --- | --- | --- |
| Desktop Chromium | 1440 × 900 | Pointer and keyboard navigation | Every desktop browser |
| TV remote simulation | 1920 × 1080, Fire-TV-like user agent | TV sizing and keyboard remote-style focus | Real Amazon Silk or Fire hardware input |
| Phone touch emulation | 390 × 844, mobile and touch | Small viewport and touch navigation | Android hardware, mobile Safari, codecs |
| Tablet touch emulation | 1024 × 768, mobile and touch | Tablet view and touch navigation | iPad Safari or tablet graphics performance |

All tests use Playwright Chromium. The TV label is **not** a claim that an Xbox or Fire remote was physically tested. A user-agent string and viewport size cannot substitute for hardware.

## Coverage

- App loads without JavaScript errors with correct responsive mode.
- Official source search and favorites work without contacting any provider.
- Signal Breaker takes directional inputs only when focused and returns focus with Escape/Back.
- Player dialog makes the app inert, traps Tab inside, and restores the originating control.
- Game library is searchable, game favorites can be saved, and Field Lab results survive reload.
- Browser event diagnostics observe attempted media loading without asserting picture or sound.
- Manifest and generated PNG icons are present and load from a local static server.
- A previously cached service-worker application shell reloads while the browser is offline. External streaming and original game sites remain unavailable offline.
- Full-page screenshots and Playwright traces are saved as CI artifacts for follow-up analysis.

## Run locally

Production build and zero-dependency unit tests:

    npm test
    npm run build

Optional development-only browser automation:

    npm install --no-save --no-package-lock @playwright/test@1.64.1
    npx playwright install chromium
    npm run build
    npm run test:browser

On Ubuntu CI, npx playwright install --with-deps chromium also installs browser system dependencies. The production dist folder includes **no** Playwright assets or dependencies.

## CI and deployment

The GitHub Pages workflow now has validate and browser jobs. Both must pass before deployment of main, while browser screenshots and reports remain available as short-lived artifacts. This adds CI time but prevents obviously broken browser navigation from being released automatically.

The browser web server runs on localhost. Service workers recognize localhost and 127.0.0.1 as secure development contexts; this does **not** enable service-worker use on arbitrary insecure HTTP sites.

## Remaining manual test gates

- Xbox Series X Edge: actual Gamepad API input, focus and codecs.
- Amazon Fire TV Silk: physical D-pad, Select/Back behavior and browser cursor modes.
- Android phone/tablet: real navigation and installation behavior.
- iPhone/iPad: Safari/WebKit, Add to Home Screen, playback/autoplay restrictions.
- Network/provider playback: real video frames, audio, DRM and buffering.
- Cold/warm startup and actual first-video-frame timings on each physical device.

CI screenshots are synthetic and cannot certify any of these. See docs/DEVICE_MATRIX.md and docs/REMOTE_FOCUS_RUNG6.md for hardware-specific checklists.

## Privacy and rights

No login, real private media or unauthorized streaming source is used. The online CC0 sample is intentionally blocked during dialog tests, so test success is **not** confused with streaming success. Reports never include local filenames or provider credentials.
