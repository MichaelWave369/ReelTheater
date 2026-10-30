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

## Run locally

Use a static HTTP server in the repository root:

~~~sh
python -m http.server 8000
~~~

Visit http://localhost:8000. Most browsers require localhost or HTTPS for service workers.

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

1. **Rung 1:** Controller-first shell; sample and chosen-file playback; original arcade game. This PR.
2. **Rung 2:** Source-verified official discovery links and clearer ReelCommons integration, keeping directory entries separate from direct playable media.
3. **Rung 3:** Device-tested original game catalog; supported non-DRM media formats; offline health checks.
4. **Rung 4:** Investigate a supported native Xbox app, authorized media server access, live TV guide and DVR capability.

## Rights and scope

MIT licensed app code. Media rights remain with their creators. Third-party IPTV/Kodi add-ons and DRM-protected commercial streams are not mirrored or bypassed. See LICENSE.
