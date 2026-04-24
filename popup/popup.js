/**
 * OMD-to-BMM: Obsidian Markdown to Firefox Bookmark Manager
 * popup.js — Main extension logic
 */

(function () {
  "use strict";

  const folderTree = document.getElementById("folder-tree");
  const selectedFolderDisplay = document.getElementById("selected-folder");
  const newFolderInput = document.getElementById("new-folder-input");
  const linkInput = document.getElementById("link-input");
  const parsePreview = document.getElementById("parse-preview");
  const createBtn = document.getElementById("create-btn");
  const dismissBtn = document.getElementById("dismiss-btn");
  const statusArea = document.getElementById("status");

  let selectedFolderId = null;
  let selectedFolderName = null;
  let currentSelectedLabel = null;

  // Disable new folder input until a folder is selected
  newFolderInput.disabled = true;

  // ── Folder tree picker ─────────────────────────────────────

  async function populateFolders() {
    const tree = await browser.bookmarks.getTree();
    // Render top-level children (Bookmarks Toolbar, Bookmarks Menu, Other Bookmarks)
    tree[0].children.forEach(function (node) {
      if (node.children) {
        folderTree.appendChild(buildFolderNode(node, true));
      }
    });
  }

  function buildFolderNode(node, startExpanded) {
    const div = document.createElement("div");
    div.className = "ft-folder " + (startExpanded ? "ft-expanded" : "ft-collapsed");

    const header = document.createElement("div");
    header.className = "ft-header";

    const toggle = document.createElement("span");
    toggle.className = "ft-toggle";
    header.appendChild(toggle);

    const label = document.createElement("span");
    label.className = "ft-label";
    label.textContent = node.title || "(untitled)";
    label.dataset.folderId = node.id;
    label.dataset.folderName = node.title || "(untitled)";
    header.appendChild(label);

    div.appendChild(header);

    // Children container
    const children = document.createElement("div");
    children.className = "ft-children";
    node.children.forEach(function (child) {
      if (child.children) {
        children.appendChild(buildFolderNode(child, false));
      }
    });
    div.appendChild(children);

    // Toggle expand/collapse
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (div.classList.contains("ft-collapsed")) {
        div.classList.remove("ft-collapsed");
        div.classList.add("ft-expanded");
      } else {
        div.classList.remove("ft-expanded");
        div.classList.add("ft-collapsed");
      }
    });

    // Select folder on label click
    label.addEventListener("click", function (e) {
      e.stopPropagation();
      selectFolder(label);
    });

    return div;
  }

  function selectFolder(label) {
    // Deselect previous
    if (currentSelectedLabel) {
      currentSelectedLabel.classList.remove("selected");
    }
    // Select this one
    label.classList.add("selected");
    currentSelectedLabel = label;
    selectedFolderId = label.dataset.folderId;
    selectedFolderName = label.dataset.folderName;
    selectedFolderDisplay.textContent = "Selected: " + selectedFolderName;
    selectedFolderDisplay.classList.add("active");
    newFolderInput.disabled = false;
    updateCreateButton();

    // Build the full ancestor chain by walking up the DOM tree
    var ancestorIds = [selectedFolderId];
    var parent = label.closest(".ft-folder");
    if (parent) parent = parent.parentElement.closest(".ft-folder");
    while (parent) {
      var parentLabel = parent.querySelector(":scope > .ft-header > .ft-label");
      if (parentLabel && parentLabel.dataset.folderId) {
        ancestorIds.push(parentLabel.dataset.folderId);
      }
      parent = parent.parentElement.closest(".ft-folder");
    }

    // Persist the selection and full ancestor chain for next time
    browser.storage.local.set({
      lastSelectedFolderId: selectedFolderId,
      lastSelectedAncestorIds: ancestorIds
    });
  }

  async function restoreLastFolder() {
    var data;
    try {
      data = await browser.storage.local.get(["lastSelectedFolderId", "lastSelectedAncestorIds"]);
    } catch (e) {
      return;
    }

    var ancestorIds = data.lastSelectedAncestorIds || [];
    if (ancestorIds.length === 0 && data.lastSelectedFolderId) {
      ancestorIds = [data.lastSelectedFolderId];
    }
    if (ancestorIds.length === 0) return;

    // Walk the ancestor chain until we find one that still exists in the tree
    for (var i = 0; i < ancestorIds.length; i++) {
      var label = folderTree.querySelector('[data-folder-id="' + ancestorIds[i] + '"]');
      if (label) {
        // Found a surviving folder — expand ancestors and select it
        var parent = label.closest(".ft-folder");
        while (parent) {
          parent.classList.remove("ft-collapsed");
          parent.classList.add("ft-expanded");
          parent = parent.parentElement.closest(".ft-folder");
        }
        selectFolder(label);
        label.scrollIntoView({ block: "nearest" });
        return;
      }
    }

    // Nothing in the chain survived — fall back to no selection
  }

  // ── Input parsing (hierarchical) ──────────────────────────────
  //
  // Parses indented bulleted markdown into a tree structure.
  // Supports:
  //   - [Title](url)              → bookmark
  //   — [Title](url)              → bookmark (em-dash U+2014, canonical round-trip format)
  //   - ─────  separator  ─────   → separator (round-trip convention)
  //   - Plain text bullet         → folder (children are indented beneath)
  //   - Plain URL                 → bookmark (title = URL)
  //   - Flat lists (no indent)    → all items at root level (backwards compatible)
  //
  // Indentation: 2 spaces or 1 tab per level (tab = 2 spaces).
  // Em-dash lines are always bookmarks regardless of what follows them.

  const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/;

  /* Separator pattern: matches the convention from ext-FF_BMM-to-OMD-paste.
   * U+2500 (BOX DRAWINGS LIGHT HORIZONTAL) × 3 or more on each side,
   * with the word "separator" in between (flexible whitespace).
   * This enables round-trip: BMM → OMD → BMM preserves separators.
   * See: ext-FF_BMM-to-OMD-paste/docs/spec.v02a.extension.bmm2omd.md §7.4 */
  const SEPARATOR_RE = /^─{3,}\s+separator\s+─{3,}$/;

  /**
   * Measure the indentation level of a raw line.
   * 1 tab = 2 spaces = 1 level. 2 spaces = 1 level.
   * Returns { level: number, content: string (stripped of indent and bullet) }
   */
  function parseLine(rawLine) {
    if (!rawLine.trim()) return null;

    // Count leading whitespace to determine indent level
    var leadingMatch = rawLine.match(/^(\s*)/);
    var leading = leadingMatch ? leadingMatch[1] : "";
    var spaces = 0;
    for (var i = 0; i < leading.length; i++) {
      if (leading[i] === "\t") {
        /* Treat tab as 2 spaces — matches Obsidian's tab-indented list
         * convention where continuation lines use tab + 2 spaces,
         * giving a clean 2-space-per-level indent unit throughout. */
        spaces += 2;
      } else {
        spaces += 1;
      }
    }

    // 2 spaces = 1 indent level
    var level = Math.floor(spaces / 2);

    // Strip bullet prefix (-, *, +) or numbered prefix (1., 2., etc.)
    var rest = rawLine.trim();
    var numberedMatch = rest.match(/^\d+\.\s+(.*)/);
    if (numberedMatch) {
      rest = numberedMatch[1];
    } else {
      var bulletMatch = rest.match(/^[-*+]\s+(.*)/);
      if (bulletMatch) {
        rest = bulletMatch[1];
      }
    }

    rest = rest.trim();
    if (!rest) return null;

    // Em-dash prefix (U+2014): canonical bookmark attribution line from
    // Tab-to-OMD and BMM-to-OMD round-trip format. Strip the em-dash and
    // classify the remainder as a bookmark directly — do not fall through
    // to folder detection.
    var emDashMatch = rest.match(/^\u2014\s+(.*)/);
    if (emDashMatch) {
      rest = emDashMatch[1].trim();
      var emLinkMatch = rest.match(MD_LINK_RE);
      if (emLinkMatch) {
        return { level: level, type: "bookmark", title: emLinkMatch[1], url: emLinkMatch[2] };
      }
      if (/^https?:\/\//.test(rest)) {
        return { level: level, type: "bookmark", title: rest, url: rest };
      }
      // Em-dash with non-link content — ignore
      return null;
    }

    // Classify the content
    if (SEPARATOR_RE.test(rest)) {
      return { level: level, type: "separator" };
    }

    var linkMatch = rest.match(MD_LINK_RE);
    if (linkMatch) {
      return { level: level, type: "bookmark", title: linkMatch[1], url: linkMatch[2] };
    }

    if (/^https?:\/\//.test(rest)) {
      return { level: level, type: "bookmark", title: rest, url: rest };
    }

    // Plain text = folder name
    return { level: level, type: "folder", title: rest, children: [] };
  }

  /**
   * Parse pasted text into a tree of nodes.
   * Each node: { type, title?, url?, children? }
   * Folders have children arrays; bookmarks and separators are leaves.
   *
   * The algorithm uses a stack to track the current parent at each depth.
   * When indentation increases, the most recent folder becomes the parent.
   * When indentation decreases, we pop back up the stack.
   */
  function parseInput(text) {
    var lines = text.split("\n");
    var root = { type: "root", children: [] };

    // Stack: array of { node, level }
    // stack[0] is always root at level -1
    var stack = [{ node: root, level: -1 }];

    for (var i = 0; i < lines.length; i++) {
      var parsed = parseLine(lines[i]);
      if (!parsed) continue;

      // Pop stack back to the appropriate parent level
      while (stack.length > 1 && stack[stack.length - 1].level >= parsed.level) {
        stack.pop();
      }

      var parent = stack[stack.length - 1].node;

      // Ensure parent has a children array
      if (!parent.children) parent.children = [];
      parent.children.push(parsed);

      // If this is a folder, push it onto the stack as potential parent
      if (parsed.type === "folder") {
        stack.push({ node: parsed, level: parsed.level });
      }
    }

    return root.children;
  }

  /**
   * Count all items in a parsed tree (recursive).
   * Returns { bookmarks, separators, folders }
   */
  function countParsedItems(nodes) {
    var counts = { bookmarks: 0, separators: 0, folders: 0 };
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.type === "bookmark") counts.bookmarks++;
      else if (node.type === "separator") counts.separators++;
      else if (node.type === "folder") {
        counts.folders++;
        if (node.children && node.children.length > 0) {
          var sub = countParsedItems(node.children);
          counts.bookmarks += sub.bookmarks;
          counts.separators += sub.separators;
          counts.folders += sub.folders;
        }
      }
    }
    return counts;
  }

  function updateParsePreview() {
    var items = parseInput(linkInput.value);

    if (linkInput.value.trim() === "") {
      parsePreview.textContent = "";
      parsePreview.className = "parse-preview";
    } else if (items.length === 0) {
      parsePreview.textContent = "No valid items detected.";
      parsePreview.className = "parse-preview no-links";
    } else {
      var counts = countParsedItems(items);
      var parts = [];
      if (counts.bookmarks > 0) {
        parts.push(counts.bookmarks + (counts.bookmarks === 1 ? " link" : " links"));
      }
      if (counts.folders > 0) {
        parts.push(counts.folders + (counts.folders === 1 ? " folder" : " folders"));
      }
      if (counts.separators > 0) {
        parts.push(counts.separators + (counts.separators === 1 ? " separator" : " separators"));
      }
      parsePreview.textContent = parts.join(", ") + " detected.";
      parsePreview.className = "parse-preview has-links";
    }
    updateCreateButton();
  }

  linkInput.addEventListener("input", updateParsePreview);

  // ── Create button state ──────────────────────────────────────

  function updateCreateButton() {
    const items = parseInput(linkInput.value);
    createBtn.disabled = !(selectedFolderId && items.length > 0);
  }

  // ── Bookmark creation (recursive) ─────────────────────────────

  /**
   * Recursively create bookmarks, folders, and separators from a parsed tree.
   * @param {Array} nodes - parsed items from parseInput()
   * @param {string} parentId - Firefox bookmark folder ID to create items in
   * @returns {Promise<{created: number, errors: string[]}>}
   */
  async function createBookmarkTree(nodes, parentId) {
    var created = 0;
    var errors = [];

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      try {
        if (node.type === "separator") {
          /* Round-trip separator support: create a Firefox bookmark
           * separator from the OMD separator designator.
           * See: ext-FF_BMM-to-OMD-paste/docs/spec.v02a §7.4 */
          await browser.bookmarks.create({
            type: "separator",
            parentId: parentId
          });
          created++;
        } else if (node.type === "folder") {
          /* Create the folder, then recurse into its children */
          var newFolder = await browser.bookmarks.create({
            parentId: parentId,
            title: node.title
          });
          created++;
          if (node.children && node.children.length > 0) {
            var sub = await createBookmarkTree(node.children, newFolder.id);
            created += sub.created;
            errors = errors.concat(sub.errors);
          }
        } else {
          /* Bookmark */
          await browser.bookmarks.create({
            parentId: parentId,
            title: node.title,
            url: node.url
          });
          created++;
        }
      } catch (err) {
        var errLabel = node.type === "separator" ? "separator" :
                       node.type === "folder" ? "folder: " + node.title :
                       node.title;
        errors.push(errLabel + ": " + err.message);
      }
    }

    return { created: created, errors: errors };
  }

  createBtn.addEventListener("click", async function () {
    const items = parseInput(linkInput.value);
    if (!selectedFolderId || items.length === 0) return;

    createBtn.disabled = true;
    statusArea.textContent = "Creating bookmarks...";
    statusArea.className = "status";

    // Determine the target folder — create a new subfolder if specified
    let targetFolderId = selectedFolderId;
    let targetFolderName = selectedFolderName;
    const newFolderName = newFolderInput.value.trim();

    if (newFolderName) {
      try {
        const newFolder = await browser.bookmarks.create({
          parentId: selectedFolderId,
          title: newFolderName
        });
        targetFolderId = newFolder.id;
        targetFolderName = newFolderName;
      } catch (err) {
        statusArea.textContent = "Failed to create folder: " + err.message;
        statusArea.className = "status error";
        createBtn.disabled = false;
        return;
      }
    }

    var result = await createBookmarkTree(items, targetFolderId);

    if (result.errors.length === 0) {
      const noun = result.created === 1 ? "item" : "items";
      statusArea.innerHTML =
        "Created " + result.created + " " + noun + " in folder <strong>" +
        escapeHtml(targetFolderName) + "</strong>.<br>" +
        '<a id="open-sidebar" href="#">View in sidebar</a> · ' +
        'Open Bookmark Manager: <strong>Ctrl+Shift+O</strong><br>' +
        '<code id="library-uri" class="copy-uri" title="Click to copy">chrome://browser/content/places/places.xhtml</code>';
      statusArea.className = "status success";

      // Store the folder ID so the sidebar can highlight it
      browser.storage.local.set({ lastFolderId: targetFolderId });

      // Clear the new folder input after successful creation
      newFolderInput.value = "";

      // Swap Create button for Dismiss button to prevent double-submission
      createBtn.style.display = "none";
      dismissBtn.style.display = "";
      dismissBtn.addEventListener("click", function () {
        window.close();
      });

      document.getElementById("open-sidebar").addEventListener("click", function (e) {
        e.preventDefault();
        browser.sidebarAction.open();
      });

      document.getElementById("library-uri").addEventListener("click", function () {
        navigator.clipboard.writeText("chrome://browser/content/places/places.xhtml").then(function () {
          document.getElementById("library-uri").textContent = "Copied!";
          setTimeout(function () {
            document.getElementById("library-uri").textContent =
              "chrome://browser/content/places/places.xhtml";
          }, 1500);
        });
      });
    } else {
      statusArea.innerHTML =
        "Created " + result.created + ", failed " + result.errors.length + ".<br>" +
        escapeHtml(result.errors.join("; "));
      statusArea.className = "status error";
      createBtn.disabled = false;
    }

    updateCreateButton();
  });

  // ── Utilities ────────────────────────────────────────────────

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Init ─────────────────────────────────────────────────────

  populateFolders().then(restoreLastFolder);
})();
