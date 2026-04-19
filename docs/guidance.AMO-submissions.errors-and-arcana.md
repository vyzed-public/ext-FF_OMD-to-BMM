# AMO Submission: Errors, Gotchas, and Arcana

## Guidance for Submitting Private (Unlisted) Firefox Extensions

**Date:** 2026-04-19
**Author:** Daniel Cunningham / Claude (Anthropic)
**Applies to:** All extensions under the `vyzed-public` GitHub organization

---

## 1. Purpose

This document captures hard-won knowledge from submitting Firefox extensions through Mozilla's Add-on Developer Hub (AMO) for unlisted self-distribution. It exists because the AMO process has several non-obvious requirements and a UX that can charitably be described as "arcane." Following this guide will save you cycles of upload → reject → search for answers → re-upload.

---

## 2. Pre-Submission Checklist

Before you zip up your extension and upload to AMO, verify all of the following.

### 2.1 Manifest: `data_collection_permissions` (REQUIRED)

As of November 2025, all new Firefox extensions **must** include a `data_collection_permissions` declaration inside `browser_specific_settings.gecko`. Without it, AMO will reject your upload at validation.

**If your extension does NOT collect any user data** (which is the case for all our current extensions), add this to your `manifest.json`:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "your-extension-id@vyzed.net",
    "data_collection_permissions": {
      "required": ["none"]
    }
  }
}
```

**Common mistakes that will fail validation:**

```json
// WRONG — "data_collected" is not a recognized property
"data_collection_permissions": {
  "data_collected": false
}

// WRONG — missing the "required" array
"data_collection_permissions": {}

// WRONG — "none" must be inside an array
"data_collection_permissions": {
  "required": "none"
}
```

**If your extension DOES collect data**, the `required` array should contain one or more of these category strings instead of `"none"`:

`authenticationInfo`, `bookmarksInfo`, `browsingActivity`, `financialAndPaymentInfo`, `healthInfo`, `locationInfo`, `personalCommunications`, `personallyIdentifyingInfo`, `searchTerms`, `websiteActivity`, `websiteContent`

There is also an `optional` array for data the user can opt into. See the Mozilla docs for details: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/

### 2.2 Manifest: `gecko.id` (REQUIRED for signing)

Your manifest must include a gecko ID. Without it, AMO cannot sign the extension.

```json
"browser_specific_settings": {
  "gecko": {
    "id": "your-extension-id@vyzed.net"
  }
}
```

Use the `name@vyzed.net` email-style format. The ID must be unique across all of AMO.

### 2.3 ZIP Contents: Only Runtime Files

The ZIP you upload to AMO should contain **only the files Firefox needs to run the extension**. Strip out everything else.

**Include:**
- `manifest.json`
- `popup/` (or wherever your HTML/CSS/JS lives)
- `icons/`

**Exclude:**
- `.git/`
- `.github/`
- `archive/`
- `docs/`
- `screenshots/`
- `LICENSE`
- `README.md`
- Any other repo-only artifacts

**Example build command:**

```bash
cd your-extension-repo/
zip -r ../your-extension-1.0.0.zip manifest.json popup/ icons/
```

---

## 3. AMO Submission Process

### 3.1 Account Setup

1. Go to **https://addons.mozilla.org/en-US/developers/**
2. Click "Register or Log In" — use a Firefox account.
3. You're now in the Developer Hub.

### 3.2 Upload

1. Click **"Submit a New Add-on"**
2. Choose **"On your own"** (self-distribution / unlisted)
3. Click **"Select a file..."** and upload your ZIP
4. Wait for automated validation

### 3.3 Validation

AMO runs five test suites: General Tests, Security Tests, Extension Tests, Localization Tests, and Compatibility Tests. All must pass (green checkmarks). If General Tests fails, it's almost always the `data_collection_permissions` issue described in section 2.1.

### 3.4 Source Code Question

After successful validation, AMO asks: **"Do You Need to Submit Source Code?"**

It lists: code generators, minifiers, webpack, template engines, or any build tools.

If your extension is hand-written HTML/CSS/JS with no build pipeline (which all our current extensions are), select **"No"** and continue.

### 3.5 Signing

AMO displays: **"Version Signature Pending"**

You will receive an email when the signed `.xpi` is ready. For simple extensions, this typically takes minutes. Check your spam folder if you don't see it within 24 hours.

---

## 4. Downloading the Signed XPI (The Hard Part)

This is where AMO's UX falls apart. There is no obvious "Download your signed extension" button. Here's how to find it:

1. From the email notification or the Developer Hub, navigate to your extension's **"Manage Status & Versions"** page.
2. In the versions table, click on the **version number link** (e.g., "Version 1.0.0").
3. This opens the **"Manage Version"** page.
4. At the top, find the **"Files"** row. It contains a blue link with a long hash filename ending in `.xpi` (e.g., `19137edd3edb4d37b847-1.0.0.xpi`), along with the file size and "Approved" status.
5. **Click that `.xpi` filename link.** This is your download.
6. Firefox will show the standard extension install prompt with permissions and data collection info.
7. Click **"Add"** to install permanently.

**If the `.xpi` link triggers an install prompt instead of a download**, that's fine — it means Firefox recognized it as an extension and is offering to install it directly. Click "Add."

**If you need the raw `.xpi` file** (e.g., to share with someone or archive), right-click the link and "Save Link As."

---

## 5. Post-Install Verification

After installing the signed `.xpi`:

1. Open `about:addons` in Firefox.
2. Confirm your extension appears in the list with the correct name and version.
3. Verify it has a proper extension ID (not a temporary UUID).
4. Test all functionality.
5. Restart Firefox and confirm the extension persists (unlike temporary debug installs).

---

## 6. Updating an Existing Extension

When you need to push a new version:

1. **Increment the version** in `manifest.json` (e.g., `1.0.0` → `1.1.0`).
2. Build a new ZIP with only runtime files.
3. In the Developer Hub, go to your extension and click **"Upload a New Version"**.
4. Follow the same upload → validate → sign → download → install flow.
5. The new version replaces the old one. Firefox handles the upgrade.

---

## 7. Reference: Complete Manifest Template

Here is a minimal `manifest.json` template that passes AMO validation for our unlisted extensions:

```json
{
  "manifest_version": 2,
  "name": "Your Extension Name",
  "version": "1.0.0",
  "description": "Brief description of what the extension does.",
  "browser_specific_settings": {
    "gecko": {
      "id": "your-id@vyzed.net",
      "data_collection_permissions": {
        "required": ["none"]
      }
    }
  },
  "permissions": [
    "bookmarks",
    "clipboardWrite",
    "storage"
  ],
  "browser_action": {
    "default_icon": {
      "48": "icons/icon-48.png",
      "96": "icons/icon-96.png"
    },
    "default_popup": "popup/popup.html",
    "default_title": "Your Extension Tooltip"
  },
  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png"
  }
}
```

Adjust `permissions` to match your extension's actual needs. The `data_collection_permissions` block stays the same for any extension that doesn't collect user data.

---

## 8. Lessons Learned

1. **AMO validation errors are one-at-a-time.** If you have multiple problems, you'll only see the first one. Fix it, re-upload, and you might get a new error. Don't assume one green validation means you're done until you see "no errors or warnings."

2. **The `data_collection_permissions` requirement is new (Nov 2025) and poorly documented.** Most existing tutorials and blog posts don't mention it. The Mozilla blog post announcing it: https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/

3. **The Developer Hub UX is developer-hostile.** After signing, there is no clear "download your extension" call to action. The download link is buried inside a version management form. See section 4 for the exact click path.

4. **Temporary debug installs and signed installs share the same gecko ID.** Remove the temporary one from `about:debugging` before installing the signed `.xpi` to avoid any potential conflicts.

5. **The `data_collection_permissions` key will eventually be required for ALL extensions** (not just new ones). Mozilla announced this will happen in the first half of 2026. Get ahead of it now.
