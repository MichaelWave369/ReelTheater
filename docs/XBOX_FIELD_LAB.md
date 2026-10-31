# REEL Theater Rung 3: The Shayne Test

## What this does
REEL Theater offers a local, manual field lab so we can learn what *actually* works in Microsoft Edge on a particular Xbox Series X. The report is not an automated playback scan, a source-health guarantee or an authenticated test receipt.

Targets: an in-app CC0 HTML5 sample, the bundled original Signal Breaker, an external original game Break the Matrix (BTM), and all six curated official provider-directory entries.

Each target has four possible local self-reported results:

- **Not tested:** the initial default.
- **Opened, unverified playback:** the site/game opened, but actual playback or gameplay has not been confirmed.
- **Worked on this device:** the operator says playback/gameplay actually worked here.
- **Failed / blocked:** encountered a real playback, navigation, input or platform issue.

The UI can open the official destination, but does **not** automatically mark success. Results are not shared or uploaded and remain in local browser storage until a user explicitly downloads an unsigned JSON report. The report is editable and must be treated as a human observation, not independent verification.

## Real Xbox test steps

1. After the PR merges and GitHub Pages publishes, open REEL Theater from Edge on the Series X.
2. Enter **Field Lab** using D-pad or left stick. Focus the outcome selector and press **A** to cycle through statuses. B returns Home.
3. For the video sample: play enough to confirm visible video and audio, then return and mark the outcome.
4. For Signal Breaker: use controller-only launch, move paddle, hit blocks, lose a life, and restart.
5. For Break the Matrix: choose **Open destination**, allow browser to open the existing public game in another tab, verify actual controls, performance, sound and gameplay. Returning to REEL Theater may require browser tab navigation.
6. For official provider links: distinguish **page opened** from **actual streaming media played**. Never mark a provider "worked" merely because its landing page loaded.
7. Use notes to record failures, region/DRM restrictions, unexpected controller behavior, and which native app was launched, if any.
8. Download report JSON explicitly. On Xbox Edge the browser may block downloads, so keep a photo of the results or reproduce on a desktop.

## Startup and comparison

Time from choosing the web link to usable navigation (cold and warm) with a stopwatch. Separately time opening each official provider and beginning playback. Compare fairly against Kodi on the *same console and network*. The web shell cannot control third-party buffering or DRM.

## Privacy

- One small localStorage report is saved with predefined target IDs and a 240-character note cap per target.
- Reports contain free-form notes, so users should review them before sharing.
- No automatic external status probing, hidden uploads, media interception or source caching.
- No browser-generated device fingerprint is included.
- Only a manual test performed on the actual Xbox can support an Xbox usability claim.

## Future gates

Use multiple actual device reports before labeling any source or original game Xbox compatible. Do not promote a self-reported entry to a global verified badge. An independent repeatability review is needed for wider compatibility claims.
