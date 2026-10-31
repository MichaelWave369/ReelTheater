# Rung 10: Portable Setup, no accounts

## Why this exists

A browser-first entertainment center should not make people recreate the same favorites on every phone, tablet, PC, Xbox or Fire TV browser. Rung 10 lets users **explicitly export and import a small local setup backup**, without cloud sync, accounts, trackers, or a server.

This is a useful fallback for devices where a PWA install is unavailable: the normal website still works, and favorite shortcuts can be carried between browsers.

## What is in the V1 backup

The REEL_PORTABLE_SETUP_V1 JSON document contains **only**:

- Curated official-source favorite IDs
- Curated original-game favorite IDs
- Up to nine curated recently selected shortcut IDs
- The display preference: auto, tv, touch, or desktop

It does **not** include video files, media paths, playback progress, URLs, Field Lab notes, Device Lab input, private local media, hardware identifiers, account tokens, search strings, arbitrary links or a device fingerprint.

Example:

    {
      "schema": "REEL_PORTABLE_SETUP_V1",
      "favorites": {"sources": ["nasa"], "games": ["spark"]},
      "recents": ["game:spark"],
      "preferences": {"mode": "auto"}
    }

The file is plaintext JSON and is not encrypted, signed or authenticated. Share it only if you are comfortable sharing which curated services and games you selected.

## Export and import

Open **Settings → Move your setup**:

1. Select Show JSON, Download backup or Copy JSON. The JSON is displayed on-screen even if the device blocks the download or clipboard.
2. Move the file or copied JSON to the destination device using your own chosen method.
3. In Settings on the destination, select a local JSON file or paste the backup text.
4. Select **Preview incoming setup**. The preview shows incoming and existing counts, the layout modes, and any duplicate/unknown IDs that will be dropped.
5. Select **Merge** or **Replace** explicitly. There is no automatic import or silent overwrite.

**Merge** keeps the destination browser's layout, unions favorite IDs and keeps its recent selections before imported ones.

**Replace** writes the imported favorite IDs, recent selection IDs and layout mode.

Both strategies touch **only four allowlisted localStorage keys**. The existing Field Lab reports, playback progress and other settings are preserved.

## Safety and compatibility

- V1 schema and shape must match. Future schema versions are rejected until implemented.
- Imports are limited to 8 KB of UTF-8 and up to 100 raw entries per list.
- Unknown or duplicate IDs are dropped, reported in the preview and never become unapproved destinations.
- Import decisions are invalidated if the pasted text changes after preview.
- Storage writes are attempted together, with best-effort rollback on a localStorage failure. A browser that disables storage cannot promise a complete import.
- The file picker reads local bytes only. No upload endpoint, tracking beacon, external file reader or URL fetch exists.
- Touch, keyboard, TV remote and gamepad focus paths remain the same. Some Xbox/Fire TV browsers block downloads, clipboard or file pickers. Pasteable plaintext is the fallback.
- Explicit exports do not prove media playback or device compatibility.

## Validation

Unit tests cover strict validation, schema enforcement, corrupt/oversize rejection, ID allowlisting, merge/replace semantics, the four-key write allowlist, and safe UI wiring.

Four-profile Chromium acceptance tests exercise manual export/download, preview before import, file-picker import, merge and replace, favorites appearing in Quick Launch after reload, rejection of unsupported schema, invalidating changed previews, and discarding injected IDs.

As before, Chromium touch and TV-like simulation are **not** evidence that Amazon Silk, Xbox Edge, iOS Safari or an actual Android device was physically tested.

## Follow-on acceptance

- On a real Fire Stick or Xbox, check whether copy/paste or file picker/download is usable; if not, document the limitations and evaluate a future explicit pairing flow that does not compromise sovereignty.
- Test iOS Safari and Android browsers with physically transferred JSON.
- Confirm gamepad or remote focus can reach and activate the Settings buttons.
- Do not claim automatic cross-device synchronization. V1 is manual and deliberate by design.
