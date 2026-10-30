# AI Bookmark: design system

Source of truth is `popup.css` (the `:root` tokens at the top). Nothing in the UI should use a raw colour, size or space that is not one of these.

## Type
| Token | Size | Use |
| --- | --- | --- |
| `--fs-xs` | 12 | captions, counts, version |
| `--fs-sm` | 12 | secondary text, hints, small buttons |
| `--fs-base` | 14 | body, rows, buttons |
| `--fs-md` | 16 | section titles inside cards |
| `--fs-lg` | 18 | screen sub-headings |
| `--fs-xl` | 22 | the big count, screen titles |

Families: Inter (UI), Space Grotesk (headings, wordmark), JetBrains Mono (domains, counts, percentages).
Weights: 400 body, 500 labels, 600 buttons, 700 headings.

## Space and shape
- Space `--sp-1..6` = 4, 8, 12, 16, 20, 24. Every gap, padding and margin uses these.
- Radius `--r-sm` 6 (boxes, chips) · `--r-md` 8 (buttons, fields) · `--r-lg` 12 (cards, dialogs).
- Controls: `--ctl` 44 (primary height), `--ctl-sm` 32, `--hit` 36 (icon buttons; touch area is padded out to 44).
- Icons: 20px, stroke 1.8, round caps, one set. The current header icon is violet, same stroke.

## Colour
- Ink `--ink` #1e1a3a, secondary `--ink-2`, tertiary `--ink-3`. Ground `--bg` white, `--surface` card tint.
- Violet `--accent` #4a3baa is the action colour. `--accent-tint` is its light wash.
- Lime `--lime` #d3f72a is the marker: hover wash on rows, the active box in the progress row, highlights. Never a text colour.
- Danger `--danger` #b3392b, `--danger-tint` for delete and clear actions only.

## Buttons
- Primary: solid violet, white text. One per view. While busy it dims to 75% and shows three soft dots. The dots keep their phase across re-renders, so nothing jumps.
- Outlined (`.raised`): violet outline. Hover goes light violet. The lone outlined button in the status card fills solid violet.
- Delete and clear: red text or icon, red wash on hover.
- Header icons: no box. The page you are on is a violet icon.
- Back and delete on the details page: boxed squares, same size, top left and top right.

## Rows
Settings and the link details page use one list pattern. Each row has a 20px icon, a 500-weight label and a value on the right in 12px. Rows are 64px high and divided by full-width bars. A row that opens something has an arrow.
- A long value is cut with an ellipsis, as in Summary and Tags.
- Tapping a row opens a dialog (Summary, Tags, API key, Clear the index) or a small menu (Collection).
- Rows that only show information (Saved, Last accessed) have no arrow and no hover.
- Bookmark rows in lists run edge to edge. Hover is a pale neon wash. Tags show two at most, white with a fine edge.

## Dialogs
Centred card, 340px wide at most, dimmed background. A title, the content, then a Cancel and a primary button side by side. Esc and a click outside close it. Focus stays inside and returns to the row that opened it.

## Progress
Twenty small boxes in one row. Each box is a twentieth of the bookmarks. The next box glows neon while indexing runs. Status words rotate (Indexing, Reading, Filing and so on). The row hides when everything is indexed.

## Layout
Each screen is a header and one scrolling column. Groups inside are CSS grid with one gap token. The illustration is the last thing in the scroll. It runs the full width and rests at the bottom on short screens.

## Wording
Say "index" for what Gemini does to your bookmarks. Sentence case. No full stops on labels. When Gemini cannot read a page, say so. Never show a guessed summary.
