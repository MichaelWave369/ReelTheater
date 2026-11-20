# Rung 13: MikeyFlix / Jellyfin LAN launcher

## Goal and honest scope

REEL Theater adds a **private LAN launch point** for an existing, user-operated Jellyfin server. It does **not** implement the Jellyfin API, a streaming proxy, token/session exchange, library browsing, thumbnails, authentication or embedded playback. REEL never claims it successfully contacted the user's server. The existing Jellyfin app remains the recommended player on Fire TV.

In **Library**, enter the server origin shown in your Jellyfin dashboard, for example:

    http://192.168.1.50:8096

Select **Save local server**, then **Open MikeyFlix**. The address (no passwords or tokens) stays only in this device's browser localStorage. The user can forget it. Saved addresses are never exported in REEL's portable setup file or field reports.

REEL accepts only HTTP/HTTPS private IPv4 ranges, loopback, localhost and .local mDNS names with a server origin (no path, query string, credentials or fragment). Plain HTTP addresses without an explicit port get Jellyfin's usual 8096 port. A stored link is a convenience, **not** connectivity or playback verification.

## Platform and trust boundaries

- On a Fire TV Stick, use its actual LAN IP, **not localhost**: localhost refers to the Stick itself, not the PC running Jellyfin.
- REEL Theater is statically served via HTTPS on GitHub Pages. The browser cannot reliably embed or fetch from private HTTP LAN hosts because of mixed-content, private-network and CORS restrictions. This rung performs **only a user-initiated top-level navigation**, never an embedded video/player/API request. Silk, Xbox Edge and other browser handling of a HTTPS-to-HTTP navigation must be tested on physical hardware. If Silk blocks it, use the installed Jellyfin app or open the saved local URL manually.
- Keep your Jellyfin port private to the LAN. Do not forward port 8096 to the internet, publish it through REEL Network, use GitHub Pages as a relay, or put tokens in URLs.
- REEL service worker caches only its same-origin application shell. It never caches Jellyfin media, thumbnails or server responses.
- No browser library management, automatic media discovery, background checks, browser-stored Jellyfin credentials, or remote server execution.
- LocalStorage is scoped by browser and origin. Different TVs need their own URL setting; private data must never be shared via public URL or repository config.

## Acceptance

1. Run \`npm test\` and \`npm run build\`.
2. Run \`npm run test:browser\` with Playwright installed to exercise remote profiles and the new browser setup tests.
3. On desktop LAN, save an actual private server origin, confirm it persists after refresh, and deliberately open the link. Authenticate and watch content **inside Jellyfin**. Do not infer success from a saved URL.
4. On Fire Stick 3rd gen Silk, try the launcher and document whether top-level navigation works; retain the native Jellyfin app as fallback.
5. On an offline device, confirm the REEL shell opens but a Jellyfin stream is not falsely marked available.
6. Confirm malformed/public/token-bearing values are rejected and the portable setup export excludes the address.

## Subsequent rung

A **separate locally hosted, consent-based Jellyfin adapter** can offer authenticated read-only media lists, artwork and watch state to REEL Theater, and later REEL Network and PhiCade's XR theater. Build and test that separately with same-origin or controlled local proxy transport, explicit session permissions and no automatic internet exposure. Avoid duplicating the library database or inventing a native Fire TV/XR player before device qualification.
