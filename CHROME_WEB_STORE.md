# Chrome Web Store: everything you need

Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). Work through the sections in order. Each field below shows the text to paste. Copy it as it is.

The dashboard changes its wording from time to time. If a label differs from this file, use the closest match.

## 0. Checklist

- [ ] Developer account is registered and the contact email is verified
- [x] Repo is public (needed for the privacy policy link)
- [ ] Extension zip is built (section 2)
- [ ] Store listing tab is filled (section 3)
- [ ] Privacy tab is filled (section 4)
- [ ] Distribution tab is filled (section 5)
- [ ] Reviewer notes are pasted (section 6)
- [ ] Submit for review

## 1. Developer account

| Item | What to do |
| --- | --- |
| Registration fee | A one-time payment of 5 US dollars. |
| Publisher name | Your name or a brand name. The store shows it on the listing. |
| Contact email | Use an email you check. Verify it from the link Google sends. The store shows it to users. |
| Trader status (EU rules) | The dashboard asks if you are a trader. Answer for your situation. A free hobby project is usually a non-trader. |
| Two-step verification | Turn it on for your Google account. The dashboard asks for it. |

## 2. Build the package

Run this in the project folder. It makes a zip with only the files the extension needs.

```bash
zip -r ai-bookmark-1.1.0.zip manifest.json background.js popup.html popup.js popup.css assets fonts icons -x "*.DS_Store"
```

The zip is about 0.9 MB. Upload it in the dashboard with **Add new item**. Do not include `store/`, `design-source/`, `docs/` or the markdown files.

Before you zip:

- Check `manifest.json` has the right `version`. It is `1.1.0` now. A package with version `1.0.0` was already sent for review, and the store rejects a version it has seen, even if you cancelled that review. Raise it for every new upload.
- Test the zip. Remove the extension. Load the unzipped folder. Run the first-run steps.

## 3. Store listing tab

### Name
```
AI Bookmark
```

### Summary (132 characters or fewer)
```
Stop digging through your bookmarks. Just search smart with AI.
```

### Description
```
Hundreds of bookmarks. Folders inside folders, some organised, some not. When you need one, you can't find it.

AI Bookmark reads your bookmarks, so you can search by what a page is about, not just the words in its title.

HOW IT WORKS
• Add a free Gemini key from Google AI Studio.
• Gemini reads your bookmarks. It adds tags, a short summary and a collection to each one.
• Search based on what you need. The extension compares meaning, not only exact words.

WHAT YOU GET
• Search by meaning, with fast first results.
• A summary and tags for every page. If Gemini cannot read a page, it says so and does not guess.
• Change a summary, a collection or tags from the page's details.
• Collections such as Design, AI Tools and Development.
• A side panel that stays open when you change tabs.
• New bookmarks are indexed by themselves. Or turn that off and sync when you choose.
• Export your bookmarks as an HTML file.
• Delete a bookmark and undo it within seven seconds.

PRIVATE BY DESIGN
• No server of our own. No analytics. No advertising.
• Your index and your key stay in your browser.
• Without a key, nothing leaves your device.
• With a key, the extension sends your bookmark titles, addresses, folder names, tags, summaries and search text to Google. Search text goes as you type.

SHORTCUT
Press Ctrl+Shift+K (Cmd+Shift+K on Mac) to open the panel.
```

### Category
Productivity

### Language
English

### Store icon (128 × 128)
Use `icons/icon128.png`.

### Screenshots (1280 × 800, up to 5)
Upload in this order. The files are in the `store/` folder.

| # | File | Headline on the image |
| --- | --- | --- |
| 1 | `store/screenshot-1-add-a-key.png` | Start in a minute |
| 2 | `store/screenshot-2-indexing.png` | Set up once, runs in the background |
| 3 | `store/screenshot-3-search.png` | Search based on what you need |
| 4 | `store/screenshot-4-collections.png` | Sorted without the folder work |
| 5 | `store/screenshot-5-details.png` | Know a page before you open it |

The order follows a new user's first minutes: add a key, let it index, search, browse the collections, open a bookmark.

After you upload, hover a thumbnail in the dashboard to move or delete it.

The screenshots use a sample set of well-known public sites. They do not show anyone's personal bookmarks.

### Promotional images

Both tiles are optional. Only the store icon and one screenshot are required.
- **Small tile (440 × 280):** the store ranks extensions that have one above extensions that do not, in its lists.
- **Marquee tile (1400 × 560):** used only if the store features your extension in the large banner at the top. Google decides that. You cannot get that spot without this image, so upload it.
- **Promotional video:** a separate, optional field for a video link. You do not need one. Skip it.

| Image | Size | File |
| --- | --- | --- |
| Small promo tile | 440 × 280 | `store/promo-small-440x280.png` |
| Marquee promo tile (optional) | 1400 × 560 | `store/promo-marquee-1400x560.png` |

### Links

| Field | Value |
| --- | --- |
| Official URL | Leave empty, or use the repo link |
| Homepage URL | `https://github.com/dipanshudaga/AI-Bookmark` |
| Support URL | `https://github.com/dipanshudaga/AI-Bookmark/issues` |
| Mature content | No |

## 4. Privacy tab

### Single purpose
```
Search and organize the user's bookmarks by meaning.
```

### Permission justifications

Paste each text into the matching field.

**bookmarks**
```
The extension reads the user's bookmarks so it can index and search them. It also restores a bookmark that the user deletes and then undoes.
```

**storage**
```
The extension saves the search index, the settings and the user's API key on the device.
```

**unlimitedStorage**
```
The search index grows with the number of bookmarks. It can be larger than the default storage limit.
```

**sidePanel**
```
The interface is a side panel that stays open when the user changes tabs.
```

**favicon**
```
The extension shows the site icon next to each bookmark.
```

**Host permission: https://generativelanguage.googleapis.com/***
```
The extension calls the Gemini API at this address to index bookmarks and to search. It uses no other address.
```

### Remote code
Answer: **No, I am not using remote code.** All code is in the package. The extension calls the Gemini API for data only. It does not run code from the network.

### Data usage

Tick the data types the extension handles. The form lists them in groups.

| Group | Tick it? | Why |
| --- | --- | --- |
| Website content | Yes | Bookmark titles and addresses go to Google when the user adds a key. |
| User activity | Yes | The search text goes to Google as the user types and searches. |
| Authentication information | Yes | The user's own API key is stored on the device and sent to Google. |
| Personally identifiable information | No | The extension does not collect it. |
| Health information | No | |
| Financial and payment information | No | |
| Personal communications | No | |
| Location | No | |
| Web history | No | The extension does not read the browsing history. |

If the form gives only a short list, tick the closest groups. Be honest and consistent with `PRIVACY.md`.

### Certify the three statements
Tick all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

The data goes to Google only to do the job the user asks for. This is an approved use case.

### Privacy policy URL
Use this link after the repo is public:
```
https://github.com/dipanshudaga/AI-Bookmark/blob/main/PRIVACY.md
```
The link must open without a sign-in. Test it in a private window.

## 5. Distribution tab

| Field | Value |
| --- | --- |
| Visibility | Public |
| Regions | All regions |
| Pricing | Free |
| In-app purchases | None |

## 6. Notes for the reviewer

Paste this in the **Test instructions** field.

```
The extension works with no account and no key. Keyword search and the automatic collections work at once.

To test the Gemini features:
1. Open https://aistudio.google.com/apikey and create a free API key.
2. Open the extension side panel. Paste the key in the card on the Home screen. Click Save.
3. Indexing starts at once. Progress shows on the Home card and in Settings.
4. Search in plain words. Open Collections to see the groups. Open a bookmark to see its summary, collection and tags.

The extension sends data only to generativelanguage.googleapis.com, and only after the user adds a key. It has no server of its own.
```

## 7. Test before you submit

Do this once in Chrome with the zip, not only in Brave.

- [ ] The side panel opens from the icon and from the shortcut
- [ ] Saving a key starts indexing, and progress shows on Home and in Settings
- [ ] A new bookmark is indexed when the switch is on, and waits when it is off
- [ ] A page Gemini cannot read shows "Gemini could not read this page" and no summary
- [ ] Summary, Collection and Tags change from the details page
- [ ] Delete shows Undo, and Undo restores the bookmark
- [ ] Export gives an HTML file, and Import opens the bookmark manager
- [ ] The privacy policy link opens in a private window

## 8. Review tips

Review usually takes from a few hours to a few days. The first review can take longer.

Common reasons for rejection, and how this extension answers them:

| Reason | Answer |
| --- | --- |
| Permission has no clear use | Each permission has a justification in section 4. |
| Host permission is too broad | Only one address is listed. |
| Privacy policy is missing or does not open | Use the public link. Test it in a private window. |
| Policy does not match the data use | `PRIVACY.md` lists what goes to Google and when. |
| Remote code | None. |
| Misleading listing | The description matches what the extension does. It does not promise results it cannot give. |
| Poor screenshots | Screenshots show the real interface. |
| Keyword stuffing | The description has no keyword lists. |

If the reviewer asks for a change, fix it. Upload a new zip with a higher version. Submit again.

## 9. After publishing

- Copy the store link from the dashboard.
- Add an install line to the top of `README.md`.
- Raise `version` in `manifest.json` for every update. Build a new zip. Upload it.
- Rotate any old API key that was ever in the code. The current code has no built-in key.
- Remake the screenshots if the interface changes. The captions and the files are listed in section 3.

## 10. Files in this repo

| File | Use |
| --- | --- |
| `PRIVACY.md` | The privacy policy. |
| `store/` | Screenshots and promo images. |
| `icons/icon128.png` | The store icon. |
| `DESIGN.md` | The design rules, if you need to make more images. |
