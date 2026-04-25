# #7: Feature: Hierarchical import — support nested indented outlines as nested bookmark folders

**State:** CLOSED
**Author:** vyzed
**Created:** 2026-04-19T23:43:15Z
**Closed:** 2026-04-25T05:37:30Z

---

Currently the extension creates all bookmarks flat in a single target folder. 

It should parse indented outlines and create matching nested folder structures in the Bookmark Manager.

An input like:
```
- DevOps
    - [Docker Hub](https://hub.docker.com)
    - [Portainer Docs](https://docs.portainer.io)
    - ─────  separator  ─────
    - WireGuard
        - [WG Quick Start](https://www.wireguard.com/quickstart)
```

Should produce a `DevOps` folder containing two bookmarks, a separator, and a `WireGuard` subfolder with one bookmark inside it.

Indent detection: 4-space or tab per level, matching the output convention from [ext-FF_BMM-to-OMD-paste](https://github.com/vyzed-public/ext-FF_BMM-to-OMD-paste).
