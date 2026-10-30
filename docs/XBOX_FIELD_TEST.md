# REEL Theater: Xbox Series X field test (Rung 1)

This is a browser pilot, not a native Xbox app. No physical Series X test has yet been completed. Shayne's console is the first acceptance platform.

## First launch

1. After the PR merges and GitHub Pages deploys, open the published Pages URL in Microsoft Edge on Series X.
2. Press Xbox controller A once to allow the browser to expose the gamepad.
3. Navigate using D-pad or left stick; A selects; B returns Home or closes playback.
4. Time first paint, interactive navigation, and repeat-load performance. Compare against Kodi using the same hardware and network.

## Acceptance matrix

- [ ] Home renders and fits the TV.
- [ ] All five sections plus Settings work with controller only.
- [ ] Controller focus is visible and never trapped.
- [ ] CC0 sample actually plays in Xbox Edge; otherwise record codec/network error.
- [ ] B closes video without leaving stuck overlays.
- [ ] Signal Breaker starts, moves paddle, scores blocks, ends and restarts using the controller.
- [ ] Browser back/hash navigation works without trapping focus.
- [ ] After one online visit, offline reload shows shell and arcade but never pretends online video is playable.
- [ ] Favorite and demo resume persist when browser storage allows it.
- [ ] Unavailable features have explanations, never fake play buttons.

## Known limitations

- Xbox Edge file-picker access may be restricted. SMB, USB and DLNA scanning are not implemented.
- No unauthorized Kodi repositories or pirated streaming sources.
- CC0 sample depends on MDN reachability and browser codec support.
- Commercial DRM playback may require separate approved applications.
- No EPG, DVR, emulator cores, native Xbox installation or verified PWA behavior.
- Pages deployment may need Settings > Pages > Build and deployment > GitHub Actions.

## Field report

Device: Xbox Series X | OS: ______ | Edge: ______
Network: ______ | First use: ______ sec | Second use: ______ sec
Controller: ______ | Video: ______ | Arcade: ______
Failures: ______ | Shayne's rating (1-10): ______
