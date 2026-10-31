# Rung 9: Quick Launch, unified favorites and private recent selections

## Goal

REEL Theater should open games and legitimate streaming destinations in fewer clicks than a Kodi repository maze. This rung adds a **single, static, fast Quick Launch page** across TV, phone, tablet and desktop and a compact Home row with favorited or recently selected entries.

## User experience

- **Quick Launch** is the ninth primary navigation destination. It shows eleven existing curated entries: six official Watch/Live/source-directory links and five original game/game-project links. No new source is scraped or invented.
- **Search** matches names, descriptions and categories locally, without a remote request or account.
- **Filters**: All, Favorites, Recent, Games, Watch & Live.
- **Favorites** reuse the exact existing source-favorite and game-favorite localStorage values. Favoriting Spark in Arcade or NASA+ in Watch instantly makes those entries eligible for Quick Launch and Home. Saving from Quick Launch updates the same storage keys rather than creating a third source of truth.
- **Recent selections** record a bounded list of curated entry IDs only when the user intentionally activates a matching external link. The page does not call home, ping services, fetch third-party websites, record browsing history, or infer playback success. The most recent selected ID moves to the front.
- **Home shortcut shelf** surfaces a maximum of six items: saved favorites first, then recent selections. No saved items starts with an honest empty state and an obvious Browse action.
- **Clear recent selections** deletes the app-local click history without touching favorites or a game’s separate save data.
- All links continue to open the original first-party game or legitimate service destination in a new browser tab. TV browser tab and actual media compatibility still require on-device testing.

## Privacy, provenance and trust

- Recent history contains **only** predefined keys such as source:nasa or game:btm. It excludes arbitrary URLs, search queries, timestamps, cookies, account identifiers, file names, IP addresses or provider state.
- The history is size-limited to nine entries and stored **only** on the current browser. It can be cleared at any time.
- Search text stays in the current in-memory app session and is never transmitted.
- Only destinations defined in the existing SOURCES and GAMES allowlists are permitted. Link recording additionally checks that the clicked link's href exactly matches the curated entry. Corrupted localStorage state is safely discarded.
- A recent-click indication is **not** proof of successful page navigation, media playback or compatibility on Xbox Edge, Amazon Silk, iPhone or Android. A source name being present is not a direct video stream.

## Testing

- Node unit tests validate source/game allowlist integrity, filter behavior, favorite interoperability, deduplication/capping of recent entries, corrupted storage recovery, and default Home ordering.
- Playwright E2E checks all four existing Chromium profiles: search/filtering, source/game favorite interoperability, Home after reload, user-only recents, keyboard focus, no hidden provider requests, and the previously cached offline shell.
- The continuous-integration and GitHub Pages gates remain unchanged: both Node and Chromium jobs must pass before deployment.

## Device acceptance still needed

- Fire TV Silk: test focus, scroll, Select, new browser tabs, and Back using the physical Fire remote.
- Xbox Edge: gamepad A and B, navigating the bottom/top lists and switching into the game website.
- iOS/Android: on-screen keyboard, touch targets, portrait/landscape scrolling and external links.
- Provider playback and game performance must be assessed separately, not inferred from a Quick Launch click.

Do not interpret automated Chromium emulation as certification of any TV browser hardware.


## Narrow-screen TV mode regression found by CI

The first browser run found a genuine overlap on a phone viewport when **TV / remote** presentation was manually selected: the long TV sidebar made the Field Lab button partially covered by Device Lab. Rung 9 now constrains that override on narrow screens to a horizontally scrollable, bottom-anchored remote menu with stable touch/click targets. A dedicated Chromium regression test navigates Quick Launch, Field Lab, Device Lab, Watch and Home under that preference. The fix does not relabel a phone as a certified television.
