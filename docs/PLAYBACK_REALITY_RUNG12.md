# Rung 12: Playback Reality Lab

## Why this rung exists

A Kodi alternative has to identify what a browser can really play, not just link to services and display optimistic status labels. REEL Theater already recorded HTMLMediaElement events such as "playing", "waiting", "stalled", and generic errors. Those events are helpful but do **not** prove that the user saw a video frame or heard audio.

This rung makes two complementary first-party diagnostics available inside the Watch room and player, without adding media proxies, DRM bypasses, provider scraping, streaming databases, telemetry, or native platform packages.

## On-demand codec capability hints

Watch → "Check browser format hints" asks the existing HTMLVideoElement.canPlayType API about seven fixed MIME/codec examples: H.264 MP4, HEVC MP4, VP8 WebM, VP9 WebM, AV1 MP4, MP3, and AAC/MP4.

Responses are displayed only as:
- "probably": the browser declares it probably supports the specified MIME/codec pairing.
- "maybe": the browser cannot confidently determine support.
- "not reported": the API returns no support indication or is unavailable.

The panel also indicates whether the MediaSource and requestVideoFrameCallback APIs are present. These are **hints**, not proof that a particular file, resolution, device decoder, encryption scheme, live stream, or third-party provider will work. Actual playback may fail due to malformed media, audio codecs, unsupported profiles, memory pressure, CORS, authorization, DRM, network issues, browser restrictions, or other conditions.

The feature runs only when the user presses Check and makes no network requests. It does not store the results or export a browser/device fingerprint.

## First video-frame callback observation

When a video attempt starts, the existing player requests a callback through HTMLVideoElement.requestVideoFrameCallback, if supported. The callback indicates that a frame was submitted for composition by the browser. After confirming that the video element reports nonzero video dimensions, REEL records the elapsed time from the start of that playback attempt to the **first valid callback**.

The player and Watch health panel now separately show:

- **First playing event**: the HTMLMediaElement playing event latency. It does not certify pixels or sound.
- **First video frame callback**: elapsed time to a browser callback for a frame submitted for composition. It is stronger evidence than playing alone, but is still not independent proof that visible pixels appeared on the physical screen or that audio was audible.

Fallbacks are explicit:
- "awaiting a frame" if the API exists but no valid callback has been received;
- "API unavailable" if this browser cannot expose video-frame callbacks;
- "not applicable to audio" for a locally selected audio-only media file;
- "not checked" before an attempt is started.

The callback is cancelled on close whenever the browser supports cancellation, and a session generation check ignores stale callbacks even if cancellation does not work. No frame dimensions, file paths, source URLs, filenames, raw media content, IP address or user agent are stored or exported.

## Privacy-safe diagnostics

The local playback report schema is now REEL_PLAYBACK_SESSION_V2. It includes the existing bounded media-event history and generic error category, plus firstVideoFrameMs and videoFrameObservation status. A report is created only when the user deliberately downloads it. This data is not automatically transmitted, uploaded, synchronized, or persisted in localStorage.

The original first-playing timestamp remains available for backward compatibility. Existing Field Lab test statuses are not automatically changed. **No result is promoted to "verified audio/video" without human validation.**

## Automated acceptance and real hardware

Node tests verify the callback state machine, privacy-sanitized export, audio-only and unsupported API handling, codec hint normalization, and conditional UI wiring.

Chromium browser tests cover seven on-demand codec hints, a mocked frame callback arriving after a "playing" event, cancellation/generation safety, the audio-only path, the unavailable-API fallback, and explicit export. A mocked callback test is a software regression test; it is **not a test of real frame rendering**.

Manual testing remains required:

1. Xbox Series X Edge: play a permitted known-good local video and confirm displayed picture, audible sound and controller control.
2. Fire TV Silk: repeat with remote and record whether a callback API is present, whether the browser forwards remote input, and whether file selection works.
3. Android and iPhone/iPad: test local and CC0 demo playback on actual devices, including muted autoplay restrictions, focus and orientation.
4. Compare first-playing event and first-frame callback only when both are supported, and keep human confirmation of image/audio separate.
5. Never assume that a provider link can be embedded or that it uses the same codecs as the local sample.

No commercial DRM or proprietary codec support is added by this rung.
