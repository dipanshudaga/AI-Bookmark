# Chrome Web Store listing

## Name
AI Bookmarks

## Category
Productivity

## Summary (132 characters or fewer)
Find any bookmark by meaning. Gemini indexes your bookmarks so you can search in plain words.

## Description

Find a saved page by what it is about. Type "3d printing models" or "design agencies". AI Bookmarks shows the bookmarks that answer.

HOW IT WORKS
• Add a free Gemini key from Google AI Studio.
• Gemini reads your bookmarks. It adds tags, a short summary and a collection to each one.
• Search in plain words. The extension compares meaning, not only exact words.

WHAT YOU GET
• Search by meaning, with fast first results.
• Collections such as Design, AI Tools and Development.
• A side panel that stays open when you change tabs.
• New bookmarks are indexed by themselves.
• Export your bookmarks as an HTML file.
• Delete a bookmark and undo it within seven seconds.

PRIVATE BY DESIGN
• No server of our own. No analytics. No advertising.
• Your index and your key stay in your browser.
• Without a key, nothing leaves your device.
• With a key, the extension sends your bookmark titles, addresses, folder names and search text to Google.

SHORTCUT
Press Ctrl+Shift+K (Cmd+Shift+K on Mac) to open the panel.

## Single purpose
Search and organize the user's bookmarks by meaning.

## Permission justifications

| Permission | Justification |
| --- | --- |
| `bookmarks` | The extension reads the user's bookmarks to index and search them. It restores a bookmark that the user deletes and then undoes. |
| `storage` | The extension saves the index, the settings and the API key on the device. |
| `unlimitedStorage` | The search index can be larger than the default storage limit when the user has many bookmarks. |
| `sidePanel` | The interface is a side panel that stays open across tabs. |
| `favicon` | The extension shows the site icon next to each bookmark. |
| Host permission `https://generativelanguage.googleapis.com/*` | The extension calls the Gemini API to index bookmarks and to search. |

## Data usage disclosure (answers for the dashboard form)

- **Data types handled:** website content (bookmark titles and addresses), and user-provided text (search queries and the API key). Check the form's list. The closest matches are "Website content" and "User activity".
- **Sent to:** Google (Gemini API), only after the user adds a key.
- **Sold or used for ads:** No.
- **Used for creditworthiness or lending:** No.
- **Used for anything other than the single purpose:** No.
- **Remote code:** None. All code is in the package.

## Privacy policy URL
Host `PRIVACY.md` at a public address and paste the link here. A public GitHub Pages page or a public file link works.

## Screenshots to make (1280 × 800)
1. Home with search results for a plain question.
2. Collections list.
3. Settings with the progress row during indexing.
4. The first-run card with the key field.
5. Bookmark details with tags and a summary.
