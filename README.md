# REEL Theater

**Home without the hassle.** A free, open-source, local-first TV interface designed first for Xbox Series X browser evaluation.

REEL Theater is a separate companion to [ReelCommons](https://github.com/MichaelWave369/ReelCommons). It is not Kodi, not an unauthorized add-on marketplace, and not yet a full native media center.

## Rung 1 (v0.1.0)

- Fast, dependency-free static shell designed for living room viewing
- Home / Watch / Live TV / Arcade / Library / Settings navigation
- Xbox D-pad and analog-stick spatial focus, A select, B back; keyboard and pointer support
- Actual HTML5 video playback: a clearly labeled [MDN CC0 flower demo](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)
- Selected local media playback through object URLs: no uploads, background scanning or persistent access
- Original **Signal Breaker** arcade game with keyboard, pointer and gamepad controls
- Browser-local demo resume and favorite, no accounts or telemetry
- Service worker caches only the app shell, never media or external services
- Honest media and streaming limitations, not pretend live television

## Rung 2 (v0.2.0) — No-repo-maze discovery

- Source guide for six official destinations: Tubi, Pluto TV, Plex Free, PBS, NASA+ and REEL Commons
- TV-distance category filters, instant search, browser-local favorite source buttons
- Curated official-source URLs with evidence notes and conservative Xbox labels
- Offline source browsing via versioned shell-only service worker cache
- External destinations labeled **Open official site**. No fake playable feeds or cross-origin streaming claims
- New source validation and integration smoke tests

For source policy, official reference pages and Xbox acceptance, see [Source Discovery](docs/SOURCE_DISCOVERY.md).

## Rung 3 (v0.3.0) — The Shayne Test

- **Xbox Field Lab** in primary navigation: manual observations for video, Signal Breaker, Break the Matrix and each official service
- Four explicit states: Not tested, Opened (playback unverified), Worked on this device, Failed/blocked
- Per-service **My device** badge is local-only, never a verified compatibility claim
- Local note fields (240 characters maximum) and explicitly requested downloadable, unsigned JSON report
- Direct, clearly **Xbox Edge untested** Break the Matrix arcade launch to its existing GitHub Pages game
- Xbox gamepad support for field outcome selection; updated offline shell and automated tests

See [Xbox Field Lab](docs/XBOX_FIELD_LAB.md) for the hardware acceptance process. CI passing does not mean a game or provider has been verified on Xbox.

## Rung 4 (v0.4.0) — Every Screen

One PWA-capable web application across TV browsers, mobile, tablet and desktop, rather than five native forks:

- Explicit Auto / TV remote / Phone-tablet / Desktop presentation profiles
- TV-sized focus targets and keyboard/Fire TV back handling, responsive touch-first bottom navigation, safe-area support
- Real PWA manifest, locally generated PNG icons (192 and 512), standalone install option *when offered by the browser*
- Fire TV Silk and Xbox browser bookmark guidance, iPhone/iPad home-screen guidance, Android/desktop optional install guidance
- Versioned offline cache for the **app shell only**, never provider video or third-party sites
- Completely dependency-free Node build and browser JavaScript; no remote fonts or startup APIs
- Dedicated multi-device contract tests and [field matrix](docs/DEVICE_MATRIX.md)

**Important:** Xbox Edge, Fire TV Silk and iOS installation/remote behavior are device-test candidates, not verified capabilities. Browser launch is the baseline; no native Fire TV/Android package is shipped.

## Rung 5 (v0.5.0) — Original Arcade and Playback Health

- Five curated first-party browser game/project destinations, with instant genre and search filters, and local game favorites
- Break the Matrix, Spark, Piece by Piece and PhiCade directly linked from their documented GitHub Pages routes. TweedleVerse opens its repository until the public arcade deployment has been confirmed
- Game compatibility stays **unverified on Xbox/Fire TV/mobile** until real device testing; Field Lab now includes the three additional browser games
- Live session-only HTML5 player diagnostics for the bundled CC0 demo and user-selected local video: metadata, playing, buffering, errors and elapsed event times
- Explicit privacy-safe JSON export that excludes local filenames, video URLs, personal identifiers and third-party stream information
- New catalog and playback tests; versioned app-shell cache, with no external game or provider media cached

See [Rung 5 engineering and field checklist](docs/ARCADE_PLAYBACK.md) for provenance and device test requirements.

## Rung 6 (v0.6.0) — TV Remote and Focus Hardening

- Dedicated, unit-tested directional navigation with automatic scroll-to-focused-card
- Signal Breaker takes keyboard/gamepad input **only while the game canvas has focus**; otherwise D-pad, stick and arrow keys operate the menus
- Clear, keyboard-focusable Start/Restart path; B or Escape leaves game controls, with button-release protection against accidentally exiting two screens at once
- Video modal traps Tab focus, disables background interactions while open, and restores the originating button after close
- Remote play/pause and focus behavior refined without changing browser codec or external streaming assumptions
- Zero-dependency local module and updated offline cache; detailed [remote acceptance checklist](docs/REMOTE_FOCUS_RUNG6.md)

Physical Xbox/Fire TV remote testing is still required. Passing software tests cannot certify device input routing.

## Rung 7 (v0.7.0) — Browser Acceptance

- Actual headless Chromium integration checks for the rendered app on desktop, TV-sized, phone and tablet viewport profiles
- Tests for remote keyboard focus, arcade gameplay controls, player modal focus trapping, source/game favorites and Field Lab persistence
- PWA manifest/icons and offline cached-shell reload tested over localhost after service-worker activation
- **Browser tests gate the GitHub Pages deployment**. Screenshots and traces are retained as GitHub Actions artifacts
- Runtime remains dependency-free. Playwright is pinned and installed only for test automation
- [Rung 7 field notes](docs/BROWSER_ACCEPTANCE_RUNG7.md) explain what Chromium simulations do and do not prove

Xbox Edge, Amazon Silk, iOS Safari and actual mobile hardware still require manual validation.

## Rung 8 (v0.8.0) — Device Readiness Lab

- **Device Lab** in the main navigation and Home quick links: voluntary keyboard/remote/gamepad/touch input detection
- Current-browser capability hints (presentation mode, gamepad connected, touch capability, service worker control), without claiming certified compatibility
- At most 20 semantic input events in memory, no full typed keys, device identifiers or pointer coordinates
- Escape / gamepad B ends capture safely, restoring menu controls without accidental double-Back exits
- Optional 60-sample visible-tab frame pacing (median, p95, longest interval), explicitly **not video FPS or device benchmarking**
- Explicit JSON download containing only bounded semantic observations; no hidden uploads or persistent diagnostic storage
- Real Chromium integration tests for pointer/touch, remote-like keys, mock gamepad input, frame pacing and export
- [Device readiness acceptance guide](docs/DEVICE_READINESS_RUNG8.md)

Xbox, Fire TV Silk, Android and iOS still need physical-device verification. This lab helps perform it but cannot substitute for it.

## Rung 9 (v0.9.0) — Quick Launch

- Unified **Quick Launch** page showing curated official streaming sources and original games together: instant local search, All / Favorites / Recent / Games / Watch & Live filters
- One-click Home shortcut shelf with up to six saved favorites or recently selected links
- Reuses original Watch and Arcade favorite storage, so changing a favorite anywhere updates the same data on this browser
- Tracks only deliberate clicks on catalog-matched destinations, with a capped nine-ID recent list and an explicit **Clear recent selections** button
- No source pings, provider scraping, telemetry, arbitrary external URL storage, accounts or fake compatibility claims
- TV-distance cards, keyboard/remote focus, touch layouts, and local offline shell support
- New Node and four-profile Chromium E2E acceptance tests
- [Quick Launch design and privacy notes](docs/QUICK_LAUNCH_RUNG9.md)

**Important:** a recent click means the user selected an external link, not that video played or a browser game successfully loaded.

## Rung 10 (v0.10.0) — Portable Setup

- Explicit **Settings → Move your setup**: Show JSON, download or copy a small versioned setup backup, and restore from a local file or pasted JSON
- Move source favorites, game favorites, up to nine recent shortcut IDs and preferred layout between browsers without an account, sync server or tracking
- Preview a backup first and choose **Merge** (keep current layout, combine favorites/recents) or **Replace** (use backup's selected favorites/recents/layout)
- Strict REEL_PORTABLE_SETUP_V1 validation, 8 KB maximum, allowlisted catalog IDs, explicit disclosure of discarded unknown entries
- Only four known localStorage keys are ever changed; Field Lab notes, demo progress, private media and device reports are intentionally not transferred
- TV/mobile-friendly import and export controls, fallback pasteable JSON where downloads and clipboard are unavailable
- Browser and Node acceptance for exports, merges, replacements, invalid/stale previews, file picker and offline app shell
- [Portable Setup schema and privacy boundaries](docs/PORTABLE_SETUP_RUNG10.md)

This is manual portability, **not** automatic syncing. Physical Xbox and Fire TV import/export workflows still require on-device testing.

## Run locally

Build the deployable site with its real PWA icons, then serve the generated static folder:

~~~sh
npm run build
python -m http.server 8000 --directory dist
~~~

Visit http://localhost:8000. The production Pages deployment uses HTTPS. Icons are generated in dist during build; serving the raw repository root will not supply the generated PNG icons.

## Test and deploy

~~~sh
npm test
npm run build
~~~

Node 22+ runs zero-dependency JavaScript syntax checks, static smoke tests and builds dist/. GitHub Actions validates PRs and deploys main via GitHub Pages once **Settings → Pages → Build and deployment → GitHub Actions** is enabled.

After merge, use the actual Pages URL from GitHub's deployment environment. Do not assume it is live just because CI passed.

## Xbox acceptance

See the [real Xbox Series X field-test checklist](docs/XBOX_FIELD_TEST.md). Browser/controller behaviors and codec support must be verified on hardware. CI does not establish Xbox performance or compatibility.

## Roadmap

1. **Rung 1:** Controller-first shell, sample and selected media playback, original arcade game (merged).
2. **Rung 2:** Official discovery, filtering and favorites (merged).
3. **Rung 3:** Manual Xbox field reports and original-game launcher (merged).
4. **Rung 4:** Multi-device web shell and PWA assets (merged).
5. **Rung 5:** Curated original-game library and playback diagnostics (merged).
6. **Rung 6:** Remote input ownership, TV focus and modal hardening (merged).
7. **Rung 7:** Chromium profiles and browser-gated Pages deployments (merged).
8. **Rung 8:** On-device input and frame pacing readiness lab (merged).
9. **Rung 9:** Unified Quick Launch with shared favorites and recent selections (merged).
10. **Rung 10:** Portable favorite and display settings backup/import (this PR).
11. **Rung 11:** Physical Fire TV/Xbox/mobile acceptance, startup/playback improvements and native-wrapper decisions where genuinely necessary.

## Rights and scope

MIT licensed app code. Media rights remain with their creators. Third-party IPTV/Kodi add-ons and DRM-protected commercial streams are not mirrored or bypassed. See LICENSE.
