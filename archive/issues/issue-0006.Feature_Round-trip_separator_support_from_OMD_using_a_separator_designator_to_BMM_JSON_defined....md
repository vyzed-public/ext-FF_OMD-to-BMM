# #6: Feature: Round-trip separator support from OMD (using a separator designator) to BMM (JSON defined) separator

**State:** OPEN
**Author:** vyzed
**Created:** 2026-04-19T23:28:34Z

---

The sibling extension [ext-FF_BMM-to-OMD-paste]() exports Firefox bookmark separators as:

- ─────  separator  ─────

This uses U+2500 (BOX DRAWINGS LIGHT HORIZONTAL) × 5 on each side, with double-spaced padding around the word "separator". See the [separator convention rationale](https://github.com/vyzed-public/ext-FF_BMM-to-OMD-paste/blob/main/docs/spec.v02a.extension.bmm2omd.md#74-separators) in the `BMM-to-OMD` spec.

This extension should detect that pattern in pasted markdown and create a Firefox bookmark separator via `browser.bookmarks.create({ type: "separator", parentId }).`

The detection pattern (regex): `/^─{3,}\s+separator\s+─{3,}$/`
