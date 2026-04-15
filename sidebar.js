/**
 * OMD-to-BMM Sidebar
 * Displays the bookmark tree with the last-targeted folder highlighted.
 */

(function () {
  "use strict";

  const treeContainer = document.getElementById("tree");
  const infoArea = document.getElementById("info");

  async function init() {
    // Get the last folder we created bookmarks in
    let targetFolderId = null;
    try {
      const data = await browser.storage.local.get("lastFolderId");
      targetFolderId = data.lastFolderId || null;
    } catch (e) {
      // storage might not have anything yet
    }

    const tree = await browser.bookmarks.getTree();

    if (targetFolderId) {
      infoArea.textContent = "Highlighting last target folder.";
    } else {
      infoArea.textContent = "No recent imports. Showing all bookmarks.";
    }

    // Get bookmarks in the target folder to mark them
    let targetBookmarkUrls = new Set();
    if (targetFolderId) {
      try {
        const children = await browser.bookmarks.getChildren(targetFolderId);
        children.forEach(function (c) {
          if (c.url) targetBookmarkUrls.add(c.url);
        });
      } catch (e) {
        // folder may have been deleted
      }
    }

    // Render the tree, skipping the invisible root
    tree[0].children.forEach(function (node) {
      treeContainer.appendChild(
        renderNode(node, targetFolderId, targetBookmarkUrls, false)
      );
    });

    // If there's a target folder, scroll it into view
    const targetEl = document.querySelector(".folder-label.target");
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function renderNode(node, targetFolderId, targetBookmarkUrls, parentIsTarget) {
    if (node.children) {
      // It's a folder
      const isTarget = node.id === targetFolderId;
      const div = document.createElement("div");
      div.className = "folder " + (isTarget || isAncestorOfTarget(node, targetFolderId) ? "expanded" : "collapsed");

      const header = document.createElement("div");
      header.className = "folder-header";

      const toggle = document.createElement("span");
      toggle.className = "toggle";
      header.appendChild(toggle);

      const label = document.createElement("span");
      label.className = "folder-label" + (isTarget ? " target" : "");
      label.textContent = node.title || "(untitled)";
      header.appendChild(label);

      div.appendChild(header);

      const children = document.createElement("div");
      children.className = "children";
      node.children.forEach(function (child) {
        children.appendChild(
          renderNode(child, targetFolderId, targetBookmarkUrls, isTarget)
        );
      });
      div.appendChild(children);

      // Toggle expand/collapse on click
      header.addEventListener("click", function () {
        if (div.classList.contains("collapsed")) {
          div.classList.remove("collapsed");
          div.classList.add("expanded");
        } else {
          div.classList.remove("expanded");
          div.classList.add("collapsed");
        }
      });

      return div;
    } else {
      // It's a bookmark
      const div = document.createElement("div");
      const isNew = parentIsTarget && node.url && targetBookmarkUrls.has(node.url);
      div.className = "bookmark" + (isNew ? " new-item" : "");

      const a = document.createElement("a");
      a.href = node.url || "#";
      a.textContent = node.title || node.url || "(untitled)";
      a.title = node.url || "";
      a.target = "_blank";
      div.appendChild(a);

      return div;
    }
  }

  function isAncestorOfTarget(node, targetFolderId) {
    if (!node.children || !targetFolderId) return false;
    for (const child of node.children) {
      if (child.id === targetFolderId) return true;
      if (child.children && isAncestorOfTarget(child, targetFolderId)) return true;
    }
    return false;
  }

  init();
})();
