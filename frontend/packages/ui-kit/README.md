# @learnofun/ui-kit

The design system's tokens, fonts, themes, icons and two worlds, and the shared components (Button, AnswerTile, ActivityCard, Card, AvatarPicker, ProgressTrail, ParentalGate, PicturePinPad, Dialog, Toast, Feedback, Celebration, SettingsPanel, SkillStatus). Plan sections 6.6, 8.1 and 8.6. The source of truth for visual design is `docs/design-system/` (ADR 0019).

May import only `@learnofun/i18n`.

Apps import the stylesheet once: `import '@learnofun/ui-kit/styles.css'`.

- `src/styles`:
  - `tokens.css` is generated from `docs/design-system/tokens.json` by `npm run tokens -w @learnofun/ui-kit`. Never edit it by hand: a test fails when it and `tokens.json` differ. Tokens keep their design-system names (`--sun`, `--space-5`, `--play-label-font-size`); type sizes are in rem, so the text-size setting scales them.
  - Themes: light, dark and contrast, chosen with `<html data-theme>`. Without one, the device's dark-mode and more-contrast preferences choose.
  - Fonts: Baloo 2 (display), Andika (read) and Readex Pro (sans), from Fontsource, with no third-party requests. `npm run fonts -w @learnofun/ui-kit` writes each Next.js app's `src/app/fonts.ts`, which loads them with next/font under their own names, a group of faces per subset, and the fallback font next/font sizes like each family's Latin faces; a test fails when an app's copy and the packages differ (ADR 0042). The tokens' font stacks put that fallback just before their generic families.
  - `worlds.css` maps the two worlds to `--ui-*` roles the components use. Family, the parent dashboard, is the default; Play, the child area, is any page with `<html data-band>`, and the `early-years` and `early-primary` bands set its targets and body text (ADR 0005). It also holds the values ADR 0019 chose for gaps the design system leaves: disabled, backdrop, line widths and motion.
  - Class names start with `lf-`.
- `AppearanceProvider` sets `<html data-band data-theme data-motion data-text-scale data-font>` from configuration. Components never check a child's age.
- Icons (`src/components/icons.tsx`) are Learnofun's own, as the screen designs draw them (ADR 0045): line icons on a 24-pixel grid with rounded strokes in the text colour, and a few coloured ones such as `StickerIcon`. They are decoration, at the `--ui-icon-size` role (28px in Play, 20px in Family); the control around them carries the name. A new icon is drawn in the same style. The picture-PIN pictures (`PinPicture`) are coloured shapes in the same style.
- Components so far, each with a page in `tools/ui-preview`, where accessibility and screenshot tests cover every band, theme and locale:
  - `Button`, with an optional leading `icon`; `Card`
  - `AnswerTile`: a pressable answer, default, selected, correct, try again or ruled out. Its look is the `lf-answer` classes, which DOM games use directly, with the words from `ui.answer.*` (ADR 0020); the state icons are masks of `CheckIcon` and `RetryIcon`, inlined
  - `ActivityCard`: one Today or library card as one button: art in the kind's colour, the kind (Review, New skill, Your choice), the title and "About 5 minutes" (ADR 0021); never a score, price or lock
  - `SkillStatus`: the six learner-model statuses as chips with their progress-pie icons, and "Early signal"; parent dashboard only
  - `AvatarPicker` (radio group) and `Avatar`: shape avatars in brand colours, named by shape, never photos
  - `ProgressTrail`: a dot per item and a star at the end, read out as "Question 6 of 8", with "6 of 8" beside it from age 6; no timer
  - `Dialog`: native modal `<dialog>`; `onClose` fires only when the person closes it
  - `ParentalGate`: a times-table question in words, or the parent PIN, on a number pad (ADR 0008). Take the mode from `gateModeForBand`
  - `PicturePinPad`: a child's picture PIN, three pictures in order from a set of nine (ADR 0018)
  - `SettingsPanel`, `Switch` and `appearanceFromSettings`: sound, music, voice, timers, reduced motion, text size, high contrast and the Andika font
  - `ToastProvider` and `useToast()`: confirmations that hide after 8 s, pausing on hover or focus
  - `Feedback`: correct, try again and hint, a soft banner with a badge, announced as a status; the shell keeps it up for 1.5 s or until the child taps
  - `Celebration`: the end-of-session cheer in `play-hero`; its burst ends within 1.2 s and turns off under reduced motion
- `src/i18n`: `I18nProvider` sets `<html lang dir>`, `useI18n()` gives `t`, the locale, its direction and formatters, and `DevLocaleSwitcher` is a development-only language menu.

Status: FRONTEND-KICKOFF step 3 done (3a–3e), on the design system.
