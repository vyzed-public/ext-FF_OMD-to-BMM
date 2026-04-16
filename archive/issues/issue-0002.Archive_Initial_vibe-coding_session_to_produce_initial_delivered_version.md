# #2: Archive: Initial "vibe-coding" session (to produce initial delivered version)

**State:** OPEN
**Author:** vyzed
**Created:** 2026-04-16T00:19:43Z

---

### Here's [our initial '"vibe-coding" session](https://github.com/vyzed-public/ext-FF_OMD-to-BMM/blob/main/archive/chats/chat.vibe-code.OMD-to-BMM.session-1.md)...

...which we produced with the help of this awesome prompt: 
* [prompt_archive-this-conversation.md](https://github.com/vyzed-public/ext-FF_OMD-to-BMM/blob/main/archive/chats/prompt_archive-this-conversation.md)

...for Claude -- designed by... (you guessed it) Claude himself:

---

### Usage Notes (for the user)

- **To invoke:** Edit the `BASENAME` in this file, upload it, and prompt:
  *"Please archive this conversation per the attached spec."*
- Place this prompt at or near the **end** of the conversation you want
  to archive.
- **Archive before forking.** If you're about to edit an earlier message to
  create a branch, drop this prompt first — once you fork, the current
  branch's images and context may become inaccessible.
- **Archive early, curate later.** Capture everything faithfully now; trim
  what you don't need with a markdown editor afterward.



---

## Comments

### vyzed — 2026-04-16T03:47:47Z

# Prompt: Archive This Conversation

## Configuration (for the human)

Replace `chat.CHANGEME` with your desired base name. This drives all output paths:

## Configuration (for the AI model)

```
BASENAME = chat.CHANGEME
```

> - Markdown file: `${BASENAME}.md`
> - Images directory: `${BASENAME}.images/`
> - Zip archive: `${BASENAME}.zip`

---

## Task

Archive this entire conversation into a markdown document with associated
images, packaged as a zip file.

You have everything you need:
- The full conversation text is in your context window.
- All uploaded images are in `/mnt/user-data/uploads/`.

---

## Markdown Format

- **Speaker labels:**
  ```
  ## User
  [message]

  ## Assistant
  [response]
  ```
- **No timestamps** on messages.
- **No `<thinking>` blocks.**
- **Do NOT** include separate code artifact files.
- **DO** include inline code in the markdown output.
- **Preserve language hints** (e.g., ` ```bash `, ` ```javascript `).

## Image Handling

- Copy all user-uploaded images from `/mnt/user-data/uploads/` into the
  `${BASENAME}.images/` directory, preserving original filenames.
- Place each image reference **before** the user message text it accompanies.
- For messages with multiple images, list them in attachment order, each on
  its own line with a blank line between.
- **Alt text** = the image filename.
- **All paths must be relative:** `${BASENAME}.images/filename.ext`
- Do NOT base64-encode images into the markdown.

## Zip Structure

```
${BASENAME}.zip
├── ${BASENAME}.md
└── ${BASENAME}.images/
    ├── image1.png
    ├── image2.png
    └── ...
```

---

## Quality Checklist (verify before delivering)

- [ ] Every image in `/mnt/user-data/uploads/` is in the images directory
- [ ] Every image in the images directory is referenced in the markdown
- [ ] Every image reference uses a relative path
- [ ] Every image reference has alt text (no empty `![]()`)
- [ ] Speaker labels are `## User` and `## Assistant` only
- [ ] No timestamps, no thinking blocks
- [ ] Code blocks retain language hints
- [ ] Zip contains both the markdown file and the images directory

---

## Processing Rules (for Claude)

- Do NOT include this archival prompt and its response in the archived output.
- If any uploaded files are NOT images (e.g., `.md`, `.zip`, `.txt`), exclude
  them from the images directory — only include actual image files
  (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`).



### vyzed — 2026-04-16T04:03:42Z

### Example Usage (at `claude.ai`):

Using the prompt at this URL: 
* https://github.com/vyzed-public/ext-FF_OMD-to-BMM/blob/main/archive/chats/prompt_archive-this-conversation.md

...and a BASENAME spec of: archive_issues-and-comments_in-repo;

...please archive this conversation per the spec in the prompt.
