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

  // ── Link parsing ─────────────────────────────────────────────

  const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/;
  const BULLET_PREFIX_RE = /^[\s\-\*\+]*/;
  const NUMBERED_PREFIX_RE = /^\s*\d+\.\s*/;

  function stripPrefix(line) {
    // Strip numbered list prefix first, then bullet prefixes
    let stripped = line.replace(NUMBERED_PREFIX_RE, "");
    if (stripped === line) {
      stripped = line.replace(BULLET_PREFIX_RE, "");
    }
    return stripped.trim();
  }

  function parseLinks(text) {
    const lines = text.split("\n");
    const results = [];

    lines.forEach(function (rawLine) {
      const line = stripPrefix(rawLine);
      if (!line) return;

      // Try markdown link first
      const match = line.match(MD_LINK_RE);
      if (match) {
        results.push({ title: match[1], url: match[2] });
        return;
      }

      // Try plain URL
      if (/^https?:\/\//.test(line)) {
        results.push({ title: line, url: line });
      }
    });

    return results;
  }

  function updateParsePreview() {
    const links = parseLinks(linkInput.value);
    if (linkInput.value.trim() === "") {
      parsePreview.textContent = "";
      parsePreview.className = "parse-preview";
    } else if (links.length === 0) {
      parsePreview.textContent = "No valid links detected.";
      parsePreview.className = "parse-preview no-links";
    } else {
      const noun = links.length === 1 ? "link" : "links";
      parsePreview.textContent = links.length + " " + noun + " detected.";
      parsePreview.className = "parse-preview has-links";
    }
    updateCreateButton();
  }

  linkInput.addEventListener("input", updateParsePreview);

  // ── Create button state ──────────────────────────────────────

  function updateCreateButton() {
    const links = parseLinks(linkInput.value);
    createBtn.disabled = !(selectedFolderId && links.length > 0);
  }

  // ── Bookmark creation ────────────────────────────────────────

  createBtn.addEventListener("click", async function () {
    const links = parseLinks(linkInput.value);
    if (!selectedFolderId || links.length === 0) return;

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

    let created = 0;
    let errors = [];

    for (const link of links) {
      try {
        await browser.bookmarks.create({
          parentId: targetFolderId,
          title: link.title,
          url: link.url
        });
        created++;
      } catch (err) {
        errors.push(link.title + ": " + err.message);
      }
    }

    if (errors.length === 0) {
      const noun = created === 1 ? "bookmark" : "bookmarks";
      statusArea.innerHTML =
        "Created " + created + " " + noun + " in folder <strong>" +
        escapeHtml(targetFolderName) + "</strong>.<br>" +
        '<a id="open-sidebar" href="#">View in sidebar</a> · ' +
        'Open Bookmark Manager: <strong>Ctrl+Shift+O</strong><br>' +
        '<code id="library-uri" class="copy-uri" title="Click to copy">chrome://browser/content/places/places.xhtml</code>';
      statusArea.className = "status success";

      // Store the folder ID so the sidebar can highlight it
      browser.storage.local.set({ lastFolderId: targetFolderId });

      // Clear the new folder input after successful creation
      newFolderInput.value = "";

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
        "Created " + created + ", failed " + errors.length + ".<br>" +
        escapeHtml(errors.join("; "));
      statusArea.className = "status error";
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
