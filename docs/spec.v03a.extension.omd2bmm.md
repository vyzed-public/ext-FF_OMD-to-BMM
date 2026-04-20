# Obsidian Markdown to Firefox Bookmark Manager (OMD-to-BMM)

## Extension Specification

**Version:** 0.3a
**Date:** 2026-04-19
**Author:** Daniel Cunningham / Claude (Anthropic)

---

## 1. Purpose

A Firefox WebExtension that accepts Obsidian-style markdown pasted into a popup UI, parses it into a hierarchical tree of bookmarks, folders, and separators, and creates the corresponding structure in Firefox's Bookmark Manager — all in one operation. The extension supports nested indented outlines (creating nested bookmark folders), round-trip separator preservation with the sibling extension ext-FF_BMM-to-OMD-paste, creating new subfolders on the fly, and provides a sidebar view for verifying created bookmarks.

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

Users may also have hierarchically organized bookmark collections exported from Firefox via the sibling extension ext-FF_BMM-to-OMD-paste, including nested folders and separator markers:

```
- DevOps
    - [Docker Hub](https://hub.docker.com)
    - [Portainer Docs](https://docs.portainer.io)
    - ─────  separator  ─────
    - WireGuard
        - [WG Quick Start](https://www.wireguard.com/quickstart)
```

Firefox's bookmark manager has no native way to ingest any of these formats in bulk. Creating bookmarks and folder hierarchies manually is tedious. This extension bridges the gap.

## 2.1 Relationship to Sibling Projects

This extension is part of a family of Firefox extensions for moving bookmark data between Firefox and Obsidian:

| Extension | Direction | Description |
|-----------|-----------|-------------|
| **ext-FF_Tab-to-OMD-paste** | Tab → Clipboard | Clips the current tab's title, URL, and selection as Obsidian Markdown |
| **ext-FF_OMD-to-BMM** | Clipboard → Bookmarks | Imports Obsidian markdown (including hierarchical outlines) into Firefox bookmark folders *(this extension)* |
| **ext-FF_BMM-to-OMD-paste** | Bookmarks → Clipboard | Copies bookmark folder contents as Obsidian Markdown |

The separator convention (`─────  separator  ─────`) is shared with ext-FF_BMM-to-OMD-paste to enable lossless round-trip transfer of bookmark structures through Obsidian.

## 3. User Workflow

1. User copies a set of markdown-formatted links or plain URLs from Obsidian.
2. User clicks the extension's toolbar icon in Firefox.
3. A popup opens with the following controls:
   - A **collapsible folder tree picker**, pre-populated with the user's full bookmark folder hierarchy.
   - A **"Create folder" text input** for optionally creating a new subfolder inside the selected folder.
   - A **textarea** for pasting the markdown links or plain URLs.
4. The folder tree auto-selects the last-used folder from the previous session. If that folder has been deleted, the extension walks up the stored ancestor chain and selects the nearest surviving parent.
5. User selects or confirms a destination folder from the tree.
6. Optionally, user types a new folder name in the "Create folder" input. If provided, this subfolder is created inside the selected folder and becomes the bookmark destination.
7. User pastes the Obsidian markdown or plain URLs into the textarea.
8. User clicks a **"Create Bookmarks"** button.
9. The extension parses the input into a hierarchical tree of bookmarks, folders, and separators, and recursively calls `browser.bookmarks.create()` to build the corresponding structure in the destination folder.
10. A **status message** confirms the result, e.g., "Created 722 items in folder Test-Round-Trip BMM cycles."
11. A **"View in sidebar"** link opens the extension's sidebar panel showing the bookmark tree with the target folder highlighted.
12. The **Bookmark Manager** can be opened via the keyboard shortcut **Ctrl+Shift+O** or by copying the displayed URI `chrome://browser/content/places/places.xhtml` into a new tab.

## 4. UI Layout (Popup)

```
┌──────────────────────────────────────┐
│  OMD-to-BMM                          │
│                                      │
│  Destination Folder:                 │
│  ┌──────────────────────────────┐    │
│  │ ▾ Bookmarks Toolbar          │    │
│  │   ▸ Web Dev                  │    │
│  │   ▸ Tools                    │    │
│  │ ▸ Bookmarks Menu             │    │
│  │ ▸ Other Bookmarks            │    │
│  └──────────────────────────────┘    │
│  Selected: Web Dev                   │
│                                      │
│  Create folder: [_______________]    │
│                                      │
│  Paste Obsidian Links:               │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │  (textarea)                  │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│  3 links detected.                   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │      Create Bookmarks        │    │
│  └──────────────────────────────┘    │
│                                      │
│  Status: Created 3 bookmarks in      │
│  folder Web Dev.                     │
│  View in sidebar · Ctrl+Shift+O     │
│                                      │
└──────────────────────────────────────┘
```

## 5. Component Details

### 5.1 Folder Tree Picker

- Populated on popup open via `browser.bookmarks.getTree()`.
- Displays the full bookmark folder hierarchy as a collapsible tree with expand/collapse toggle arrows.
- Top-level folders (Bookmarks Toolbar, Bookmarks Menu, Other Bookmarks) start expanded. Subfolders start collapsed.
- Click a folder name to select it (highlighted in purple). Click the toggle arrow to expand/collapse without selecting.
- Shows the currently selected folder name below the tree as confirmation: "Selected: [FolderName]".
- Supports re-selection at any time. The last click wins as the active destination. No bookmarks are created until the user explicitly clicks the Create button.
- **Persistent selection:** The last selected folder is persisted to `browser.storage.local` along with the full ancestor chain of folder IDs. On the next popup open, the extension auto-selects the saved folder and expands its ancestors so it is visible. If the saved folder has been deleted, the extension walks up the ancestor chain and selects the nearest surviving parent folder. This also correctly handles renamed folders since matching is by ID, not name.

### 5.2 Create Folder Input

- A single-line text input on the same horizontal line as its label "Create folder:".
- Disabled until a folder is selected in the tree picker.
- If left empty, bookmarks are created directly in the selected folder (no subfolder is created).
- If a name is entered, a new subfolder with that name is created inside the selected folder before any bookmarks are inserted. The bookmarks are then placed in the new subfolder.
- After successful bookmark creation, the input is cleared.
- If subfolder creation fails, an error is displayed and no bookmarks are created.

### 5.3 Link Input (Textarea)

- Accepts one or more lines in any of the supported formats:
  - **Markdown link format:** `- [Title](URL)` or `[Title](URL)` (with or without bullet prefix).
  - **Plain URL format:** A bare URL on its own line, e.g., `https://example.com/page`.
  - **Separator format:** `─────  separator  ─────` (U+2500 box-drawing characters, round-trip convention from ext-FF_BMM-to-OMD-paste).
  - **Folder format:** A plain text bullet that is not a link, URL, or separator is treated as a folder name. Items indented beneath it become its children.
- The parser auto-detects the format per line. All formats may be mixed freely within a single paste.
- Indentation determines hierarchy: 4 spaces or 1 tab per nesting level. 2-space indentation is also supported as a fallback.
- For plain URLs with no title, the URL itself is used as the bookmark title.
- Lines that match no recognized format are treated as folder names if bulleted, or silently ignored otherwise.
- Whitespace and blank lines are tolerated.
- A **parse preview** below the textarea shows the count of detected items in real time (e.g., "3 links, 2 folders, 1 separator detected.").

### 5.4 Create Bookmarks Button

- **Disabled** until both conditions are met:
  - A valid folder is selected in the tree picker.
  - At least one valid item has been detected in the textarea.
- On click:
  - If "Create folder" has text, creates the subfolder first via `browser.bookmarks.create({parentId, title})`.
  - Recursively walks the parsed tree and creates folders, bookmarks, and separators via `browser.bookmarks.create()`.
  - Folders in the input become bookmark folders. Their indented children are created inside them.
  - Separators become Firefox bookmark separators via `browser.bookmarks.create({ type: "separator", parentId })`.

### 5.5 Status Area

- Default state: empty.
- After successful creation: "Created N bookmarks in folder [FolderName]."
- Includes a **"View in sidebar"** link that opens the extension's sidebar panel via `browser.sidebarAction.open()`.
- Shows the keyboard shortcut **Ctrl+Shift+O** for opening the native Bookmark Manager.
- Displays the URI `chrome://browser/content/places/places.xhtml` as a click-to-copy code snippet (copies to clipboard on click with "Copied!" confirmation).
- On error: displays the error message.

### 5.6 Sidebar Panel

- A custom sidebar registered via `sidebar_action` in the manifest.
- Displays the full bookmark tree with expand/collapse functionality.
- After bookmark creation, the target folder is highlighted in purple and auto-expanded. Bookmarks within the target folder are highlighted in green.
- The sidebar is accessible via View → Sidebar → "OMD-to-BMM Bookmarks" in Firefox, or via the "View in sidebar" link in the popup status area.

## 6. Input Parsing Rules

The parser processes the textarea contents into a hierarchical tree structure. Each line is classified by its content and indentation level.

### 6.1 Indentation

- 4 spaces = 1 nesting level (primary convention, matching ext-FF_BMM-to-OMD-paste output).
- 1 tab = 1 nesting level.
- 2 spaces = 1 nesting level (fallback for manually typed input).
- Items at the same indentation level are siblings. Items indented deeper than the preceding folder become its children.

### 6.2 Line Classification

After stripping the bullet prefix (`-`, `*`, `+`) or numbered prefix (`1.`, `2.`, etc.), each line is classified in this order:

1. **Separator:** Matches the regex `/^─{3,}\s+separator\s+─{3,}$/` (U+2500 box-drawing characters). Created as `browser.bookmarks.create({ type: "separator", parentId })`.

2. **Markdown link:** Matches the pattern `[Title](URL)`. Created as a bookmark with the extracted title and URL.

3. **Plain URL:** Starts with `http://` or `https://`. Created as a bookmark with the URL as both title and URL.

4. **Folder:** Any other non-empty text. Created as a bookmark folder. Subsequent lines indented deeper become its children.

5. **Blank/empty lines:** Silently skipped.

### 6.3 Tree Building Algorithm

The parser uses a stack to track the current parent at each depth level:

1. Start with a virtual root node at level -1.
2. For each non-empty line, determine its indentation level.
3. Pop the stack back to find the appropriate parent (the most recent node at a shallower level).
4. Add the current item as a child of that parent.
5. If the item is a folder, push it onto the stack as a potential parent for subsequent deeper-indented items.

### 6.4 General Rules

1. Flat input (no indentation) works identically to the original flat parser — all items are created in the target folder. Backwards compatible.
2. Duplicate URLs within a single paste operation are allowed.
3. All formats (links, URLs, separators, folders) may be freely mixed at any nesting level.

### 6.5 Separator Convention

The separator marker `─────  separator  ─────` uses U+2500 (BOX DRAWINGS LIGHT HORIZONTAL) × 5 on each side, with two spaces of padding around the word "separator." This convention is shared with ext-FF_BMM-to-OMD-paste and enables lossless round-trip transfer:

- **BMM → OMD:** ext-FF_BMM-to-OMD-paste exports Firefox separators as `- ─────  separator  ─────`
- **OMD → BMM:** This extension detects the pattern and creates `browser.bookmarks.create({ type: "separator" })`

The regex is deliberately flexible (`─{3,}` not `─{5}`) to tolerate minor formatting variations.

See: [ext-FF_BMM-to-OMD-paste spec §7.4](https://github.com/vyzed-public/ext-FF_BMM-to-OMD-paste/blob/main/docs/spec.v02a.extension.bmm2omd.md#74-separators)

### 6.6 Example Input (Hierarchical with Separators)

```
- DevOps
    - [Docker Hub](https://hub.docker.com)
    - [Portainer Docs](https://docs.portainer.io)
    - ─────  separator  ─────
    - [Docker Compose Ref](https://docs.docker.com/compose)
    - WireGuard
        - [WG Quick Start](https://www.wireguard.com/quickstart)
        - [WG Config Guide](https://www.wireguard.com/config)
- ─────  separator  ─────
- [Ansible Getting Started](https://docs.ansible.com/getting-started)
https://github.com/nicehash/NiceHashQuickMiner
```

### Expected Result in Bookmark Manager

```
📁 (target folder)
   📁 DevOps
      🔖 Docker Hub
      🔖 Portainer Docs
      ──────────
      🔖 Docker Compose Ref
      📁 WireGuard
         🔖 WG Quick Start
         🔖 WG Config Guide
   ──────────
   🔖 Ansible Getting Started
   🔖 https://github.com/nicehash/NiceHashQuickMiner
```

## 7. Permissions Required

| Permission  | Reason                                                                     |
| ----------- | -------------------------------------------------------------------------- |
| `bookmarks` | Read folder tree, create bookmarks and folders                             |
| `storage`   | Persist last-selected folder ID, ancestor chain, and sidebar target folder |

No additional permissions (tabs, clipboardRead, etc.) are required. The user pastes manually into the textarea; no clipboard API access is needed.

## 8. Extension File Structure

```
ext-FF_OMD-to-BMM/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── sidebar/
│   ├── sidebar.html
│   └── sidebar.js
├── docs/
│   └── spec.v03a.extension.omd2bmm.md
├── icons/
│   ├── icon-48.png
│   └── icon-96.png
├── archive/
├── .github/
│   └── workflows/
│       └── sync-issues.yml
├── LICENSE
└── README.md
```

## 9. Manifest

- `manifest_version`: 2 (Firefox still fully supports MV2; MV3 support in Firefox is evolving and not required here).
- `browser_action` with `default_popup` pointing to `popup/popup.html`.
- `sidebar_action` with `default_panel` pointing to `sidebar/sidebar.html`.
- `permissions`: `["bookmarks", "storage"]`.
- `browser_specific_settings.gecko.data_collection_permissions`: `{ "required": ["none"] }` (required by AMO for all new extensions as of November 2025).

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
    "id": "omd2bmm@vyzed.net",
    "data_collection_permissions": {
      "required": ["none"]
    }
  }
}
```

The `id` field is required for AMO signing and unsigned permanent installation. The `data_collection_permissions` field is required by AMO for all new extensions as of November 2025. See [AMO Submissions: Errors, Gotchas, and Arcana](https://github.com/vyzed-public/ext-FF_BMM-to-OMD-paste/blob/main/docs/guidance.AMO-submissions.errors-and-arcana.md) for details.

## 11. Resolved Questions

1. **Library link behavior:** ~~Can a WebExtension open `chrome://browser/content/places/places.xhtml` via `browser.tabs.create()`?~~ **RESOLVED:** No — Firefox blocks extensions from opening `chrome://` URLs via `browser.tabs.create()`. The status area instead shows the keyboard shortcut **Ctrl+Shift+O** to open the Bookmark Manager, and displays the `chrome://browser/content/places/places.xhtml` URI as a click-to-copy code snippet the user can paste into a new tab.
2. **Folder creation:** ~~Should the extension support creating a new folder on the fly?~~ **RESOLVED:** Yes. The "Create folder" text input allows the user to specify a new subfolder name. If provided, the subfolder is created inside the selected folder before bookmarks are inserted. This eliminates the need to pre-create folders in the bookmark manager.
3. **Icons:** See section 11.1 below.

### 11.1 Extension Icon

The extension icon visually suggests the concept of bookmark import. The icon is provided as PNG at two sizes: 48×48 and 96×96 pixels.

**Selected icon concept:** A wide white bookmark ribbon shape on an Obsidian purple (`#7B68C4`) rounded-square background, with a purple upward-pointing arrow inside the ribbon suggesting "import into bookmarks." The ribbon spans most of the icon width and height. The arrow has a thick shaft (7px on 96×96, 5px on 48×48) with a large chevron arrowhead spanning most of the ribbon width. The shaft connects from the bottom center notch of the bookmark upward. Icon files: `icons/icon-48.png` and `icons/icon-96.png`.

## 12. Known Issues

1. **Folder tree indentation mismatch:** The collapsible folder tree in the popup and sidebar does not perfectly match Firefox's native bookmark sidebar indentation hierarchy. This is a cosmetic issue — folder selection and nesting work correctly. A future version may refine the CSS to better align with Firefox's native rendering.

## 13. Out of Scope

- Reading directly from Obsidian vault files (clipboard is the transport).
- Tag support (Firefox bookmark tags are not populated by this extension).
- Deduplication of URLs within a paste (user may intentionally have duplicates).
