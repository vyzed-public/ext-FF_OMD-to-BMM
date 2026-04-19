# #5: Refactor: Move popup and sidebar files into subdirectories

**State:** OPEN
**Author:** vyzed
**Created:** 2026-04-19T22:39:45Z

---

Currently, all the JS files live flat in the repo root. This clutters the top level and is inconsistent with the convention established in the sibling projects (ext-FF_BMM-to-OMD-paste and ext-FF_Tab-to-OMD-paste), which organize UI files into a `popup/` subdirectory.

So we'll implement:
```
ext-FF_OMD-to-BMM/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── sidebar/
│   ├── sidebar.html
│   └── sidebar.js
├── icons/
│   ├── icon-48.png
│   └── icon-96.png
├── docs/
├── archive/
└── ...
```
