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

---

#### More handy (& commonly used) git tidbits (_"gitbits"?_) for the _"git-syntax/arcana-challenged"_:
Synch da local stuffz:
* `git pull && git status`
* `git pull --rebase  # WTF do I always forget this one?`

A commonly repeating feature-branch round-trip:
1. `git pull`
2. `git checkout -b fb-implement_issue-0XYZ # Tie the branch to a documented GSD issue`
3. `git add . # ...or W-dafuk I workded on.`
4. `git commit -m "Implement issue #0XYZ: My anazing (and TESTED, right?) feature."
5. `git checkout main`
6. `git merge fb-implement_issue-0XYZ`
7. `git branch -d fb-implement_issue-0008 # Unless you REALLY want to keep it?`
8. `git status`
9. `git push origin  # Unless you've been sloppy, and you need a...`
10. `git pull --rebase`
11. `git push origin  # ...because NOW you're all clean & tidy`
12. `git pull && git status # I'm a GOOD boy!`

Some frequent tag-flavored (as opposed to branch/merge) ops:
* Mocha/Latte:
  * `git tag -a v0.1.0-pre-ui-rework -m "Before popup UI rework: field reorder, label changes, Clip button"`
  * `git push origin --tags`
* Espresso:
  * `git tag round-trip-features-complete && git push origin --tags`
* Cappuccino:
  * `git tag v0.3.0-flat-parse`
  * `git push origin v0.3.0-flat-parser`
