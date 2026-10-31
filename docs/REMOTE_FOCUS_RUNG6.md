# Rung 6: TV Remote, Focus and Game Controls

## Why this exists

Rung 5 made REEL Theater a useful browser launcher, but TV/controller input still needed a clear ownership boundary. The bundled Signal Breaker game had global keyboard and Gamepad API handlers that could claim the D-pad, left stick, A button and arrow keys even while someone was trying to navigate external arcade entries. The video player could leave background navigation interactive and did not remember where focus came from.

This rung hardens navigation without importing a UI framework or creating separate Xbox, Fire TV and mobile codebases.

## Input ownership

- The app menus own gamepad/D-pad and arrow navigation by default.
- Signal Breaker owns directional controls **only while its actual canvas is focused**. Start/Restart explicitly focuses that canvas.
- B or Escape exits gameplay focus back to Start/Restart. A held B press cannot also exit the entire Arcade: release B, then press again to go Home.
- A on a focused menu link/button activates that control. D-pad navigation can reach the game canvas, search filters, favorite toggles, the source guide and external links.
- Directional focus uses a tested geometry routine and calls scrollIntoView so off-screen TV cards scroll into view.
- On keyboard, Arrow keys navigate the app except when the game canvas is focused, or when a text/selection field has focus. Native text editing is preserved.
- Touch/pointer inputs still work. Actual remote/browser key forwarding depends on hardware and browser.

## Video modal

- The visible player dialog makes the background application inert while open.
- Tab and Shift+Tab wrap among the player controls so keyboard users cannot tab behind the overlay.
- B, Escape and browser Back keys close the player; reopening stores the originating focus control and restores it on close.
- A on player controls can activate them. Gamepad D-pad navigates among the modal's visible buttons and video controls.
- Native video playback and codec behavior have **not** been changed, nor have DRM or provider policies.

## Regression gates

- Spatial navigation selects correctly in four directions and rejects badly off-axis candidates.
- Xbox A/B/D-pad and analog thresholds decode predictably.
- Game controls never steal remote input unless the canvas is focused.
- Held A/B does not repeatedly activate controls.
- Modal focus, background inert behavior and focus restoration are explicitly asserted.
- The offline shell caches the new local remote input module and continues to block media and cross-origin caching.

## Manual acceptance, still needed

1. Xbox Series X Edge: Start Signal Breaker, play using gamepad, B once to its menu, B again after release to Home, then navigate all cards and external links.
2. Amazon Silk on Fire Stick: test each D-pad arrow, Select and Back. Silk may drive a pointer cursor instead of delivering document key events.
3. Android/iOS touch: navigate bottom tabs, scroll arcade cards, play Signal Breaker, close video without tapping through an overlay.
4. Desktop keyboard: Tab into player, Shift+Tab wraps, Escape closes and focus returns to the originating Watch button.
5. Resize/rotate and use reduced-motion preferences. Verify focused elements remain visible and buttons are not hidden by bottom navigation.
6. Verify offline cached shell still loads. External games and video are not available offline through REEL Theater.

CI can verify logic, syntax and bundling. Physical Xbox, Fire TV and mobile testing remains pending. Do not label these platforms verified merely from a green check.
