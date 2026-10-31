# Rung 2 — Official source discovery

REEL Theater now offers a local-first directory of six official destinations. It does **not** scrape repositories, proxy third-party video, cache external websites, assert that providers play in Xbox Edge, or silently start streaming.

## Core rules

1. Every source is manually curated in src/sources.js with an HTTPS destination and public evidence URL.
2. "Open official site" navigates to the provider's own website. It never claims direct playback in REEL Theater.
3. Search, categories and favorites work entirely from the bundled manifest; no remote request is required to browse.
4. The only persisted new user data is a bounded list of known favorite source IDs in browser storage.
5. The source guide labels Xbox-specific claims conservatively: **Xbox app listed** for Tubi and Plex; **Xbox Edge not tested** otherwise.
6. The ReEL Commons link is a service directory/project page, explicitly *not* a direct stream.
7. Sources may require a provider account, show ads, be region-limited or be blocked in Xbox Edge even when the official website is functioning.
8. We do not infer network/stream health from CORS-blocked probes or assume HTTP success means video can play.

## Curated official reference pages (Oct 31, 2026)

- Tubi: https://tubitv.com/welcome (service, supported platforms incl. Xbox)
- Pluto: https://pluto.tv/where-to-watch (browser availability and official home)
- Plex: https://support.plex.tv/articles/free-live-tv-streaming-overview/ (free live streaming and Xbox app)
- PBS: https://help.pbs.org/support/solutions/articles/12000090583-how-to-watch-pbs-without-cable (browser streaming)
- NASA+: https://www.nasa.gov/ways-to-watch/ (free ad-free NASA streaming)
- REEL Commons: https://github.com/MichaelWave369/ReelCommons (project directory)

## Xbox acceptance

- [ ] The source guide loads with no network required after a cached site visit.
- [ ] D-pad reaches search field, all category filters, favorites, and official links.
- [ ] Xbox virtual keyboard can type a query and the matching cards update instantly.
- [ ] Favorites remain after reload and no unknown IDs enter saved storage.
- [ ] Browser opens official destinations without a spoofed REEL player overlay.
- [ ] Document whether each provider opens/plays on Xbox Edge; distinguish provider native apps.
- [ ] Record any pop-up blocking, stalled tab return or controller-focus issue.

## Next engineering rung

Add a source-health *reporting* workflow and stronger Xbox browser compatibility receipts. Don't add automatic HEAD/GET probes as a substitute for playback verification. Once real test receipts exist, rank verified-compatible sources ahead of unsupported ones.
