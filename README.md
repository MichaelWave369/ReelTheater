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
6. **Rung 6:** Remote input ownership, TV focus and player modal hardening (this PR).
7. **Rung 7:** Real Fire TV/Xbox/mobile field acceptance and performance work, then evaluate native wrappers only if needed.

## Rights and scope

MIT licensed app code. Media rights remain with their creators. Third-party IPTV/Kodi add-ons and DRM-protected commercial streams are not mirrored or bypassed. See LICENSE.
