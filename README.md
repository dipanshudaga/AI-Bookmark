# AI Bookmarks

Find any bookmark by its meaning. AI Bookmarks is a browser extension that uses Gemini to index the pages you save. You type a plain question. The extension shows the bookmarks that answer it.

It works in Chrome and in other Chromium browsers, for example Brave. It needs version 114 or later.

## What it does

- **Search by meaning.** Type a question or a few words. The extension compares the meaning, not only the exact words.
- **Index with Gemini.** Gemini reads each bookmark. It adds tags, a short summary and a collection.
- **Collections.** The extension groups your bookmarks, for example Design, AI Tools and Development. A bookmark that fits no group goes to Others.
- **Side panel.** The panel stays open when you change tabs.
- **Local first.** Your index stays on your device. Only the Gemini steps use the network.

## Install

You do not need a build step.

1. Download or clone this repository.
2. Open `chrome://extensions`. In Brave, open `brave://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.
6. Click the puzzle-piece icon. Pin **AI Bookmarks**.

## First run

1. Click the extension icon. The side panel opens.
2. Search for a word. Keyword search works at once, with no key.
3. For meaning search, get a free key from [Google AI Studio](https://aistudio.google.com/apikey).
4. Paste the key into the card on the Home screen. Click **Save**.
5. Click **Get started**. The extension indexes your bookmarks.

You can close the panel while the extension indexes. The work continues in the background.

## Use

| Task | How |
| --- | --- |
| Open the panel | Click the icon. Or press `Ctrl+Shift+K` (`Cmd+Shift+K` on Mac). |
| Search | Type in the search box. Press `Enter`. |
| Move in results | Press the up or down arrow. Press `Enter` to open a link. |
| Copy a link | Select a result. Press `Cmd+C` or `Ctrl+C`. |
| See your collections | Click the layers icon. |
| Check for new bookmarks | Open Settings. Click **Check for new bookmarks**. |
| Export your bookmarks | Open Settings. Click **Export bookmarks**. The file is an HTML bookmarks file. |
| Delete a bookmark | Open its details. Click the bin icon. Click **Undo** within seven seconds to restore it. |

The extension indexes new bookmarks by itself. You can turn this off in Settings.

## Privacy

The extension has no server of its own. It has no analytics.

When you use Gemini, the extension sends this data to Google:

- the title, address and folder name of each bookmark
- your search text

Gemini can also read the pages at your bookmark addresses.

Your API key stays in your browser. The extension sends it only to Google. Read [PRIVACY.md](PRIVACY.md) for the full policy.

## Permissions

| Permission | Reason |
| --- | --- |
| `bookmarks` | Read your bookmarks. Restore one after you delete it. |
| `storage` and `unlimitedStorage` | Keep the index on your device. |
| `sidePanel` | Show the side panel. |
| `favicon` | Show the site icon next to each bookmark. |
| `generativelanguage.googleapis.com` | Call the Gemini API. |

## Project files

```
├── manifest.json          # Extension settings
├── background.js          # Indexes, searches and calls Gemini
├── popup.html             # Side panel page
├── popup.js               # Side panel logic
├── popup.css              # Side panel styles and design tokens
├── assets/                # Pictures and collection badges
├── fonts/                 # Inter, Space Grotesk, JetBrains Mono
├── icons/                 # Extension icons
├── DESIGN.md              # Design rules
├── PRIVACY.md             # Privacy policy
└── CHROME_WEB_STORE.md    # Everything needed for the store page
```

## Develop

There are no dependencies. Edit a file. Open the extensions page. Click the reload icon on the extension card.

To test as a new user, uninstall the extension and load it again. The browser deletes its saved data.

Follow `DESIGN.md` for all interface work. Use the size, space and colour tokens at the top of `popup.css`.

## Licence

MIT. See `LICENSE`.
