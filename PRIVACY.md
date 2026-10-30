# Privacy policy

Effective date: 30 October 2026

AI Bookmarks is a browser extension. This policy states what data it handles and where the data goes.

## Summary

- The extension has no server of its own.
- The extension has no analytics and no advertising.
- The extension does not sell your data.
- Your index and your API key stay in your browser.
- When you use Gemini, the extension sends data to Google. The sections below list this data.

## Data kept on your device

The extension saves this data in your browser storage:

- your bookmark titles, addresses and folder names
- the tags, summaries and collections made for your bookmarks
- the numeric search index (vectors) made for each bookmark
- your settings
- your Gemini API key, if you add one

This data does not leave your device unless you use a Gemini feature.

## Data sent to Google

You can use the extension with no key. In this mode, the extension sends nothing to any server.

After you add a Gemini API key, the extension sends data to the Gemini API at `generativelanguage.googleapis.com`:

- **When it indexes bookmarks:** the title, address and folder name of each bookmark. Gemini can also fetch and read the page at each address. This is how it writes the tags and the summary.
- **When you search:** your search text.
- **With every request:** your API key. This identifies your account to Google.

Google handles this data under its own terms. Read the [Gemini API terms](https://ai.google.dev/gemini-api/terms) for how Google uses it. The terms for free keys and for paid keys can be different.

## Data we collect

We collect no data. The developer of this extension cannot see your bookmarks, your searches or your key.

## Your controls

- **Clear the index.** Open Settings. Click **Clear the index**. This deletes the tags, summaries and search index from your device. Your bookmarks stay.
- **Remove the key.** Open Settings. Open **API key**. Click **Remove key**.
- **Stop Gemini use.** Remove the key. After this, the extension sends nothing.
- **Delete everything.** Uninstall the extension. The browser deletes all its saved data.
- **Export.** Open Settings. Click **Export bookmarks** to save a copy.

## Permissions

| Permission | Reason |
| --- | --- |
| `bookmarks` | Read your bookmarks. Restore a deleted bookmark. |
| `storage`, `unlimitedStorage` | Keep the index on your device. |
| `sidePanel` | Show the side panel. |
| `favicon` | Show the site icon for each bookmark. |
| Host access to `generativelanguage.googleapis.com` | Call the Gemini API. |

## Children

The extension is not for children under 13. It does not knowingly collect data from them.

## Changes

If this policy changes, the new text appears in this file with a new effective date.

## Contact

Open an issue in this repository.
