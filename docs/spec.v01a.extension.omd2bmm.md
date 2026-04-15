# Obsidian Markdown to Firefox Bookmark Manager (OMD-to-BMM)

## Extension Specification

**Version:** 0.1.0-draft
**Date:** 2026-04-14
**Author:** Daniel Cunningham / Claude (Anthropic)

---

## 1. Purpose

A Firefox WebExtension that accepts Obsidian-style markdown links or plain URLs pasted into a popup UI, parses them into title/URL pairs, and creates Firefox bookmarks in a user-selected destination folder — all in one operation.

## 2. Problem Statement

Users store bookmark links in Obsidian as follows:

```
[Page Title](https://example.com/page)
```

Many times, users may use this format in a bullet or numbered list, such as:

```
- [Page Title](https://example.com/page)
1. [Page Title](https://example.com/page)
```

Users may also have unformatted URL lists that haven't been converted to markdown links yet:

```
https://example.com/page
https://example.com/other
```

Firefox's bookmark manager has no native way to ingest any of these formats in bulk. Creating bookmarks manually one at a time through the New Bookmark dialog is tedious. This extension bridges the gap.

## 3. User Workflow

1. User copies a set of markdown-formatted links from Obsidian.
2. User clicks the extension's toolbar icon in Firefox.
3. A popup opens with two controls:
   - A **folder picker dropdown**, pre-populated with the user's full bookmark folder tree.
   - A **textarea** for pasting the markdown links.
4. User selects a destination folder from the dropdown.
5. User pastes the Obsidian markdown into the textarea.
6. User clicks a **"Create Bookmarks"** button.
7. The extension parses each markdown link, extracts the title and URL, and calls `browser.bookmarks.create()` for each entry, targeting the selected folder.
8. A **status message** confirms the result, e.g., "Created 3 bookmarks in folder DevOps."
9. A **link to the Library view** (`chrome://browser/content/places/places.xhtml`) is provided so the user can verify the bookmarks in Firefox's bookmark manager.

## 4. UI Layout (Popup)

```
┌──────────────────────────────────────┐
│  OMD-to-BMM                          │
│                                      │
│  Destination Folder:                 │
│  ┌──────────────────────────────┐    │
│  │ [Dropdown: bookmark folders] │    │
│  └──────────────────────────────┘    │
│  Selected: (none)                    │
│                                      │
│  Paste Obsidian Links:               │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │  (textarea)                  │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │      Create Bookmarks        │    │
│  └──────────────────────────────┘    │
│                                      │
│  Status: (idle)                      │
│                                      │
└──────────────────────────────────────┘
```

## 5. Component Details

### 5.1 Folder Picker

- Populated on popup open via `browser.bookmarks.getTree()`.
- Displays the full bookmark folder hierarchy with indentation to convey nesting (e.g., "All Bookmarks > Bookmarks Menu > Web Dev").
- Shows the currently selected folder name below the dropdown as confirmation.
- Supports re-selection at any time. The last pick is the active destination. No bookmarks are created until the user explicitly clicks the Create button.
- Default state on popup open: no folder selected.

### 5.2 Link Input (Textarea)

- Accepts one or more lines in either of two supported formats:
  - **Markdown link format:** `- [Title](URL)` or `[Title](URL)` (with or without bullet prefix).
  - **Plain URL format:** A bare URL on its own line, e.g., `https://example.com/page`.
- The parser auto-detects the format per line. Both formats may be mixed freely within a single paste.
- For plain URLs with no title, the URL itself is used as the bookmark title.
- Lines that match neither format are silently ignored.
- Whitespace and blank lines are tolerated.

### 5.3 Create Bookmarks Button

- **Disabled** until both conditions are met:
  - A valid folder is selected in the dropdown.
  - At least one valid `[Title](URL)` pair has been detected in the textarea.
- On click:
  - Parses all valid markdown links from the textarea.
  - Iterates through the list and calls `browser.bookmarks.create({title, url, parentId})` for each.
  - `parentId` is the ID of the selected folder from the dropdown.

### 5.4 Status Area

- Default state: empty or "(idle)".
- After successful creation: "Created N bookmarks in folder [FolderName]."
- On error: displays the error message.
- Includes a clickable link to `chrome://browser/content/places/places.xhtml` labeled "Open Bookmark Manager" so the user can verify the result.

## 6. Input Parsing Rules

The parser processes the textarea contents line by line, supporting two input formats. Both formats may appear in the same paste.

### 6.1 Format A: Markdown Links

1. Each line is processed independently.
2. Leading whitespace, `-`, `*`, and `+` characters (markdown bullet prefixes) are stripped before parsing. Leading numbered list prefixes (e.g., `1.`, `2.`, `10.`) are also stripped.
3. A valid entry matches the pattern: `[any text](any URL)`.
4. Title is the content between `[` and `]`.
5. URL is the content between `(` and `)`.

### 6.2 Format B: Plain URLs

1. If a line does not match the markdown link pattern, it is tested as a plain URL.
2. Leading whitespace, `-`, `*`, `+` characters, and numbered list prefixes (e.g., `1.`, `2.`) are stripped.
3. A valid plain URL starts with `http://` or `https://`.
4. The entire trimmed line is used as the URL.
5. The bookmark title is set to the URL itself (Firefox will often resolve this to the page title on first visit, but the extension does not fetch page titles).

### 6.3 General Rules

1. Lines that match neither Format A nor Format B are silently skipped.
2. Blank lines and whitespace-only lines are skipped.
3. Duplicate URLs within a single paste operation are allowed (user may intentionally file the same link under different titles or may not care about deduplication).
4. The parser processes formats per-line — a single paste can freely mix markdown links and plain URLs.

### Example Input (Mixed Formats)

```
- [enable: Simultaneous use of multiple GitHub/GitLab accounts](http://127.0.0.1:1234/#enable%3A%20Simultaneous%20use%20of%20multiple%20GitHub%2FGitLab%20accounts)
- [Inbox (97) - daniel.cunningham@mindcurrent.io - mindcurrent.io Mail](https://mail.google.com/mail/u/3/#inbox)
- [Setting up a production ready VPS is a lot easier than I thought. - YouTube](https://www.youtube.com/watch?v=F-9KWQByeU0)
https://github.com/nicehash/NiceHashQuickMiner
https://wiki.archlinux.org/title/WireGuard
```

### Expected Parse Output

| # | Title | URL | Source Format |
|---|-------|-----|---------------|
| 1 | enable: Simultaneous use of multiple GitHub/GitLab accounts | `http://127.0.0.1:1234/#enable%3A%20Simultaneous%20use%20of%20multiple%20GitHub%2FGitLab%20accounts` | Markdown |
| 2 | Inbox (97) - daniel.cunningham@mindcurrent.io - mindcurrent.io Mail | `https://mail.google.com/mail/u/3/#inbox` | Markdown |
| 3 | Setting up a production ready VPS is a lot easier than I thought. - YouTube | `https://www.youtube.com/watch?v=F-9KWQByeU0` | Markdown |
| 4 | https://github.com/nicehash/NiceHashQuickMiner | `https://github.com/nicehash/NiceHashQuickMiner` | Plain URL |
| 5 | https://wiki.archlinux.org/title/WireGuard | `https://wiki.archlinux.org/title/WireGuard` | Plain URL |

## 7. Permissions Required

| Permission | Reason |
|------------|--------|
| `bookmarks` | Read folder tree, create bookmarks |

No additional permissions (storage, tabs, clipboardRead, etc.) are required. The user pastes manually into the textarea; no clipboard API access is needed.

## 8. Extension File Structure

```
omd2bmm/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
└── icons/
    ├── icon-48.png
    └── icon-96.png
```

## 9. Manifest

- `manifest_version`: 2 (Firefox still fully supports MV2; MV3 support in Firefox is evolving and not required here).
- `browser_action` with `default_popup` pointing to `popup.html`.
- `permissions`: `["bookmarks"]`.

## 10. Installation

This extension is for personal use and will not be published publicly on AMO. Installation is split into two phases: a development cycle for building and testing the extension, and a production install for daily use.

### 10.1 Development Cycle: Temporary Install via about:debugging

During active development, the extension is loaded temporarily through Firefox's built-in debugging tools. This works on any version of Firefox, requires no signing, and picks up code changes immediately on reload.

**Initial load:**

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on..."
3. Navigate to the `omd2bmm/` project directory and select `manifest.json` (or any file in the extension root).
4. The extension loads immediately. Its icon appears in the toolbar and the popup is functional.

**Edit-test cycle:**

1. Edit the extension source files (`popup.html`, `popup.js`, `popup.css`, etc.).
2. Return to `about:debugging#/runtime/this-firefox`.
3. Find the extension in the list and click "Reload".
4. The extension reloads with the latest code. Test changes via the toolbar popup.

**Limitations:**

- The extension is removed when Firefox restarts. It must be re-loaded manually after every browser restart.
- This is acceptable during development but is not viable for daily use.

**Debugging tools available from about:debugging:**

- "Inspect" opens a dedicated devtools window for the extension, with console, debugger, and network tabs scoped to the extension's context.
- `console.log()` output from `popup.js` appears in this inspector, not in the page's normal devtools.

### 10.2 Production Use: Permanent Installation

Once the extension is stable and working correctly, it should be installed permanently so it survives browser restarts. There are two methods available, depending on which version of Firefox you are running.

#### 10.2.1 Recommended: AMO Unlisted Self-Distribution (standard Firefox Release)

This is the only method that works on the standard release version of Firefox. Mozilla requires all extensions to be signed before Firefox Release or Beta will install them — but signing does not require public listing. The extension is submitted to AMO as "unlisted," signed automatically, and never appears publicly.

**One-time setup:**

1. Create a free account on [addons.mozilla.org](https://addons.mozilla.org) (AMO) if you don't already have one.
2. Generate API credentials at the [AMO Developer Hub](https://addons.mozilla.org/en-US/developers/addon/api/key/).
3. Install `web-ext` globally: `npm install -g web-ext`.

**Build and sign:**

```bash
cd omd2bmm/
web-ext build --overwrite-dest
web-ext sign --channel=unlisted \
  --api-key=$AMO_JWT_ISSUER \
  --api-secret=$AMO_JWT_SECRET
```

This submits the extension to AMO for automated validation and signing, but does **not** list it publicly. AMO returns a signed `.xpi` file (typically within minutes). The extension is not visible to anyone on AMO.

**Install the signed .xpi:**

1. In Firefox, open `about:addons`.
2. Click the gear icon → "Install Add-on From File..."
3. Select the signed `.xpi` file.
4. Click "Add" when prompted.

The extension persists across Firefox restarts and updates like any normal add-on.

**Updating:** When the extension code changes, increment the version in `manifest.json`, re-run the `web-ext sign` command, and install the new `.xpi` over the old one.

#### 10.2.2 Alternative: Unsigned Install (Firefox Developer Edition, ESR, or Nightly only)

If you are running Firefox Developer Edition, Firefox ESR, or Firefox Nightly instead of standard Firefox Release, you can skip the AMO signing step entirely and install the unsigned extension directly.

**Steps:**

1. Ensure `manifest.json` includes a `browser_specific_settings.gecko.id` field (e.g., `"omd2bmm@vyzed.net"`).
2. In Firefox, navigate to `about:config` and set `xpinstall.signatures.required` to `false`.
3. Package the extension: `cd omd2bmm/ && zip -r ../omd2bmm.xpi *`
4. In Firefox, open `about:addons` → gear icon → "Install Add-on From File..." → select the `.xpi`.
5. The extension installs permanently without signing.

**Note:** The `xpinstall.signatures.required` preference has **no effect** on Firefox Release or Beta builds — it is only honored by Developer Edition, ESR, and Nightly. This is a hard restriction enforced by Mozilla at the build level, not a configuration issue.

### 10.3 Manifest Requirements for All Installation Methods

Regardless of installation method (temporary, signed, or unsigned), the `manifest.json` must include:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "omd2bmm@vyzed.net"
  }
}
```

The `id` field is required for AMO signing and unsigned permanent installation. The temporary load via `about:debugging` is more lenient, but including the ID from the start avoids issues when transitioning from development to production.

## 11. Resolved Questions

1. **Library link behavior:** ~~Can a WebExtension open `chrome://browser/content/places/places.xhtml` via `browser.tabs.create()`?~~ **RESOLVED:** Manually opening a new tab and navigating to `chrome://browser/content/places/places.xhtml` works in Firefox. The status area after bookmark creation should provide this URL as a clickable link or instruct the user to paste it into a new tab. Whether `browser.tabs.create()` can open it programmatically from extension code will be confirmed during development, but worst case the user can copy/paste the URL.
2. **Folder creation:** The current version assumes the destination folder already exists in Firefox. The user must pre-create the folder in the bookmark manager before using the extension. **Future enhancement:** A subsequent version could support creating a new folder on the fly from within the extension popup.
3. **Icons:** See section 11.1 below.

### 11.1 Extension Icon

The extension icon should visually suggest the concept of bookmark import or transfer. The icon is provided as PNG at two sizes: 48×48 and 96×96 pixels.

**Selected icon concept:** A white bookmark ribbon shape on an Obsidian purple (`#7B68C4`) rounded-square background, with a purple upward-pointing arrow inside the ribbon suggesting "import into bookmarks." The arrow shaft runs from the bottom center notch of the bookmark upward, with a chevron arrowhead. Shaft width is 6px on the 96×96 icon and 4px on the 48×48 icon. Icon files: `icons/icon-48.png` and `icons/icon-96.png`.

## 12. Out of Scope

- Syncing bookmarks back to Obsidian.
- Reading directly from Obsidian vault files (clipboard is the transport).
- Tag support (Firefox bookmark tags are not populated by this extension).
- Any interaction with TiddlyWiki.
