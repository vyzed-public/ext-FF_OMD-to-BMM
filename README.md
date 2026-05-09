# ext-FF_OMD-to-BMM

We use AI (Claude Opus 4.6) to "vibe-code" a custom personal browser extension (for Firefox) to extract URL Links from Obsidian Markown (OMD) and insert into the Bookmark Manager (BMM)

---

## How Tos

Useful SOPs can be pulled straight off the (now) [Closed Issues List](https://github.com/vyzed-public/ext-FF_OMD-to-BMM/issues?q=is%3Aissue%20state%3Aclosed%20sort%3Acreated-asc)

---


## Installation:

### Post (personal) Release via AMO

Our extension was automatically screened and approved. 

It is now available at https://addons.mozilla.org/developers/addon/3003369/versions.
 
Since this was a personal submission, login may be required.  

If so, then use your own development version and submit your own personal extension.

Helpful Guidance: [guidance.AMO-submissions.errors-and-arcana.md](https://github.com/vyzed-public/ext-FF_BMM-to-OMD-paste/blob/main/docs/guidance.AMO-submissions.errors-and-arcana.md)


### For Development/Debugging:

Use Firefox Internal URI:  `about:debugging#/runtime/this-firefox` to `[Load Temporary Add-On...]`

---

### Local Coding Env Notes (YMWV):

This is purely for my convenience, as I have projects scattered across wide sands of dev dirs by the 4 winds over 30+ years.

_"I... had some code... in `/tmp`"_ — Baroness Blixen
```
cd ~/my/files/local/lfs.00-Scratch/builds/from.repos/on.github/vyzed-public/ext-FF_OMD-to-BMM
```

More handy (& commonly used) git tidbits (_"gitbits"?_) for the _"git-syntax/arcana-challenged"_:
```
# Synch da local stuffz
git pull && git status
git pull --rebase  # WTF do I always forget this one?

# Some frequent tag-flavored (as opposed to branch/merge) ops
git tag -a v0.1.0-pre-ui-rework -m "Before popup UI rework: field reorder, label changes, Clip button"
git push origin --tags

git tag round-trip-features-complete && git push origin --tags

git tag v0.3.0-flat-parse
git push origin v0.3.0-flat-parser
```
