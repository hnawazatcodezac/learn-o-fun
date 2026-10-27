Learnofun is an adaptive learning-games platform for children aged 3 to 18 and their parents. It has two visual worlds that share one shape language: **Play**, the child app, is bright, rounded and tactile; **Family**, the parent dashboard and the website, is calm, clear and trustworthy. Use these rules when building either one.

## Voice

### Talking to children

- Keep sentences short: at most 8 words for ages 3 to 5, and 12 words for ages 6 to 8. Every instruction is also spoken aloud.
- Speak to the child as "you", in the present tense: "Hop to 12."
- Praise the strategy, not the child: "You counted on from 7." Never "You're so clever."
- A wrong answer is never "Wrong" or "Incorrect". Say "Nearly", "Let's try again" or give a next step: "Try one more hop."
- Use at most one exclamation mark per message, and no emoji in interface text.

### Talking to parents

- Be calm and specific, and show the evidence: "14 of 16 first tries correct over 4 sessions."
- Use growth words: *exploring*, *building*, *getting stronger*, *ready for more*. Never *weak*, *failing*, *behind* or *slow*. Never compare a child with other children.
- Use sentence case for every heading and button. Write numbers as digits and durations in minutes ("About 5 minutes").
- Buttons start with a verb: "Add a child", "Set a goal".

### The name

Write **Learnofun** as one word with a capital L only. Until a logo is designed, set the name in `display` at weight 800 in `ink`, or in `on-navy` on `navy`. Do not draw a mark.

## Colour

- Child app screens sit on `play-ground`. Parent dashboard and website screens sit on `family-ground`. Cards, tiles and dialogs use `surface-raised` in both worlds.
- Set text in `ink`, and secondary text in `ink-muted`. On a bright fill (`sun`, `coral`, `sky`, `leaf`), text and icons are `on-bright`; on `navy` they are `on-navy`.
- Give each child screen one `sun` primary action. Use `sky` for a second action.
- `leaf` means correct, done or mastered. `coral` is a warm accent for Review and celebrations; it never means wrong.
- Show a wrong answer with `sun-soft` and `sun-ink` plus a "Try again" icon and words. There is no red anywhere in the child app.
- Parent primary buttons and links are `action` with `on-action` labels. `teal` is decorative only (charts, illustrations, website shapes), so never put text on it.
- Use `danger` only for parent form errors and destructive actions, always with an icon and words.
- Every status pairs its colour with an icon and a word, so nothing relies on colour alone.
- Every text pair named in the token notes meets 4.5:1 in Light and Dark, and 7:1 in High contrast. The High contrast theme replaces shadows with 2px borders.

## Type

- **`display` (Baloo 2)** is for child titles, play buttons, feedback and every numeral in a maths game (`play-hero`, `play-title`, `play-label`, `play-number`). On the website it appears only as `site-headline`.
- **`read` (Andika)** is for anything a child decodes: word tiles, letters, sentences and stories (`read-early` for ages 5 to 7, `read-story` for ages 8 to 11). It has the single-storey a and g taught in schools.
- **`sans` (Readex Pro)** is for the whole parent dashboard and all website body copy (`family-title` to `family-label`).
- Child-facing text is never smaller than 20px. Keep reading text within `measure`.
- Self-host the font files inside the apps. The child app must never request fonts from Google at runtime; that would send children's IP addresses to a third party.
- For Arabic later: Baloo Bhaijaan 2 is the Arabic sibling of Baloo 2, and Readex Pro already includes Arabic. Andika has no Arabic, so Arabic literacy needs its own reading face chosen with Arabic educators.

## Space, size and shape

- Spacing uses a 4px base (`space-1` to `space-8`). Child cards use `space-5` padding; parent cards use `space-4`.
- Touch targets are at least `target-early` for ages 3 to 5, `target-play` from age 6, and `target-family` for parents. Keep at least `space-3` between targets in the child app.
- Everything a child touches uses `radius-lg`. Parent cards and buttons use `radius-md`. Chips, avatars and progress dots use `radius-full`.
- Play buttons and answer tiles sit on `press-depth`, a solid ledge. On press, the piece moves down 6px and the ledge disappears, so it feels like a real button.
- Cards rest on `shadow-sm`; dialogs, menus and the parental gate float on `shadow-lg`.
- Every interactive element shows `focus-ring` on keyboard focus. Never remove it.

## Motion

- Interface transitions take 150 to 250ms and ease out.
- A celebration lasts at most 1.2 seconds. Nothing loops forever, and nothing flashes more than 3 times a second.
- When the device asks for reduced motion, or the parent turns motion off in settings, replace movement with a short fade.

## Illustration and icons

- Characters and scenes are original and flat, built from the same pebbles, discs and pills as the interface: no outlines, no gradients, no textures. Never draw known characters or brands.
- Until an illustrator delivers final art, use plain geometric placeholders in the brand fills, as the ActivityCard preview does.
- **Pip** is the placeholder guide: a frog built from a `leaf` pebble body, two `leaf` eye bumps with white eyes and `navy` pupils, and a `navy` smile. Pip appears on the website hero, in Hop Line and on celebration screens, never on parent dashboard pages. An illustrator replaces Pip with the final character.
- Icons are **Learnofun's own**, as the screen designs draw them (ADR 0045): line icons on a 24-pixel grid, with rounded caps and joins and a thick stroke (2 to 3.5) in the text colour, at 28px in the child app and 20px for parents. They live in `frontend/packages/ui-kit`. A new icon is drawn in the same style, never taken from another set. An icon-only button always has an accessible label.
- Skill statuses use the progress-pie icons shown in SkillStatus: an empty circle, then a quarter, half, three-quarters and a full circle with a check, plus a loop arrow for Review due.

## Experience bands

- **Ages 3 to 5:** audio first; no reading needed. Use `target-early`, at most 3 answer choices, and only the `play-*` styles.
- **Ages 6 to 8:** short text, always with audio. Use `read-early` for anything to decode, and 3 or 4 answer choices.
- **Ages 9 to 11:** more text with `read-story`; `target-play` is enough.
- **Ages 12 to 18:** a calmer, non-cartoon look. Set interface text in `sans`, prefer `navy`, `sky` and `teal`, use `radius-md`, and drop characters from game screens.

## Website

The website belongs to the Family world: `family-ground`, wide `navy` hero bands with `on-navy` text, `site-headline` for the hero and `site-title` for section headings. It borrows play shapes (pebbles, discs and number-line hops) in `sun`, `sky`, `coral` and `leaf` as decoration.

- On `family-ground` and the surfaces, the primary call to action is an `action` button.
- On a `navy` band, the primary call to action is a `sun` play button with an `on-bright` label: `action` does not stand out enough against `navy`.
- Secondary text on `navy` is `on-navy` at 85% opacity, never a grey.

## Components

The previews here are visual specs in plain HTML and CSS (`components/bundle.css`). Build the React versions in the app's own UI kit, using the tokens by name.

On a Design canvas, load `tokens.css` first and then `components/bundle.css`; the stylesheet reads its variables from `tokens.css`. Load the three Google Fonts families (Baloo 2, Andika, Readex Pro) with a `<link>` for mockups only; the apps themselves self-host them.

- **Button:** play buttons (`sun` primary, `sky` secondary) and parent buttons (`action`, quiet).
- **AnswerTile:** a tappable answer, with default, selected, correct and try-again states.
- **ActivityCard:** a card on the child's Today screen: Review, New skill or Your choice.
- **Feedback:** the message after an answer: correct, try again or hint.
- **ProgressTrail:** where the child is in the current session.
- **SkillStatus:** the parent-facing chip for a skill's status.
