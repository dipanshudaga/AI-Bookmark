# AI Bookmarks: design system

Source of truth is `popup.css` (the `:root` tokens at the top). Nothing in the UI should use a raw colour, size or space that is not one of these.

## Type
| Token | Size | Use |
| --- | --- | --- |
| `--fs-xs` | 12 | captions, tagline, counts, version |
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
- Icons: 20px, stroke 1.8, round caps. The current header icon is violet, same stroke.

## Colour
- Ink `--ink` #1e1a3a, secondary `--ink-2`, tertiary `--ink-3`. Ground `--bg` white, `--surface` card tint.
- Violet `--accent` #4a3baa is the action colour. `--accent-tint` is its light wash.
- Lime `--lime` #d3f72a is the marker: hover wash on rows, the active box in the progress row, highlights. Never a text colour.
- Danger `--danger` #b3392b, `--danger-tint` for delete and clear actions only.

## Buttons
- Primary: solid violet, white text. One per view. When busy it stays solid and its icon spins.
- Outlined (`.raised`): violet outline. Hover goes light violet; the lone outlined button in the status card fills solid violet.
- Delete and clear: red outline or text, red wash on hover.
- Rows (`.drow`, bookmark rows): neon wash on hover, edge to edge.
- Icon buttons: no box. The page you are on is a violet icon.

## Layout
Each screen is a header and one scrolling column. Groups inside are CSS grid with one gap token. List rows run edge to edge. The illustration is the last thing in the scroll and rests at the bottom on short screens.

## Wording
Say "index" for what Gemini does to your bookmarks. Sentence case. No full stops on labels.
