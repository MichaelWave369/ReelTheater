# Rung 5: Original Arcade Library & Playback Health

## What is new

REEL Theater now bundles a searchable **original game library**, keeping the actual games in their existing repositories rather than copying third-party scripts into a media app. Genres and favorite game IDs live locally with no startup web requests, sign-in, storefront, ROM discovery or emulation dependency.

### Curated launch destinations

| Game | Destination | Why included | Device status |
| --- | --- | --- | --- |
| Break the Matrix | https://michaelwave369.github.io/BTM/ | BTM README advertises play on GitHub Pages | Xbox/Fire/mobile need testing |
| Spark: The Substrate | https://michaelwave369.github.io/SparkTheSubstrate/ | Spark README names the public game URL | Xbox/Fire/mobile need testing |
| Piece by Piece | https://michaelwave369.github.io/PieceByPiece/ | PieceByPiece README documents the Pages URL (deployment dependent) | Xbox/Fire/mobile need testing |
| PhiCade | https://michaelwave369.github.io/PhiCade/ | Xbox Edition documentation specifies the gateway | Xbox/Fire/mobile need testing |
| TweedleVerse Arcade | https://github.com/MichaelWave369/TweedleVerse | README documents a relative arcade.html page, but public deployment was not independently established | Project link only; not a Play button |

**Signal Breaker** remains the bundled original mini-game. Its files and the static game catalog are part of REEL Theater's app shell. External games are launched by user click into their own pages and maintain their own saves. They are **not** cached by REEL Theater.

The entry point URLs were retrieved from the source repositories on October 31, 2026, not confirmed as playable on all hardware. On-site Play success is not a validated Xbox, Android, iOS, or Fire TV test.

## Playback Health

The **Watch → Playback Health** panel shows a bounded, session-only list of native HTMLMediaElement events for the built-in CC0 demo or the user-selected local media file.

- Load request, metadata, canplay, playing, waiting, stalled, error, pause/seek/end.
- An approximate elapsed time from player initialization to the first **playing event**, explicitly *not* a first-visible-frame metric.
- Standard HTMLMediaElement error categories (cancelled, network, decode/codec, unsupported format).
- Contextual troubleshooting guidance, but no claims about external-provider stream health.
- Explicit download of a small JSON report containing only demo/local type, generic event status, elapsed milliseconds, and error category.
- No local filename, URL, user agent, network requests, player cookies, provider authentication, browser fingerprint, background uploads, or persistent health history.

The video element's **playing** event is not independent proof of audible audio, displayed frames, or smooth sustained playback. Those still require actual person-on-device testing. The report is local and unsigned.

## Multi-platform QA

- [ ] Phone/touch: search and category filters without interrupting Signal Breaker; game links launch with usable back navigation.
- [ ] Desktop: keyboard focus, category filter, favorite persistence, direct links.
- [ ] Fire TV Silk: remote D-pad focus reaches game search/filter, entry links, back; assess tabs and buffering separately.
- [ ] Xbox Edge: BTM/Spark/Piece by Piece/PhiCade controller setup; record actual gameplay or failure in Field Lab.
- [ ] Test original Signal Breaker while offline after shell cache is installed; do not expect external games offline.
- [ ] Watch demo online: note loadstart → metadata → playing; induce network loss if safe to observe stalled/error without claiming cross-site results.
- [ ] Local playback on a computer: privacy-safe export should not include filename.
- [ ] External official provider links still open the provider's site rather than being passed to REEL Theater's video player.
- [ ] Revisit GitHub Pages deploy and the main app after merge before declaring any hosted service live.

## Engineering safety rules

The manifest is a static allowlist. No arbitrary URL injection, no dynamic remote code, no scrapers or ROM downloads. Device results are local manual reports, not compatibility badges applied to all users. Media and game rights stay with their creators. A source repository's README is evidence of intent, not a guarantee of deployment or browser compatibility.
