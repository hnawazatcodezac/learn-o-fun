# 0008. Parental gate challenge and the dyslexia-friendly font

- Status: accepted
- Date: 2026-10-20
- Plan section: 8.1 (accounts and access), 8.6 (accessibility), 7.3 (letterforms)

## Context

Plan 8.1 asks for a parental gate before settings, purchases, external links and leaving child mode, using an arithmetic challenge for young children and a parent PIN or device biometrics from age 9. Plan 8.6 asks for a dyslexia-friendly font setting. Neither the challenge nor the font was specified.

## Options considered

Challenge for ages 3–8:

1. A times-table question in words ("What is seven times six?"), answered on a number pad.
2. Spelled-out numbers to tap in order ("Tap four, nine, two").

Font: Andika, OpenDyslexic, Lexend, Atkinson Hyperlegible. All are open-licensed (OFL) and self-hostable.

## Decision

- **Gate:** option 1, the team's choice. Factors run from 3 to 9, and the question is written in words because this app teaches maths to 6–8-year-olds, who might read "7 × 6". Answers go in through an on-screen number pad, never a text field (CLAUDE.md rule 6). A wrong answer brings a new question. Which gate a band gets comes from configuration (`gateModeForBand`), never from the child's age; bands from age 9 will use the parent PIN.
- **Font:** Andika, the team's choice. SIL designed it for beginning readers: easily confused letters (b d p q, I l 1) are clearly different, and it has the single-storey a and g that children learn to write, which plan 7.3 also asks for in literacy games. It is self-hosted from `@fontsource/andika`; no font is fetched from a third party, and browsers download it only when the setting is on.

## Consequences

- Gate questions use a random source the caller can seed, so previews and tests repeat exactly.
- The PIN check is supplied by the app until real sign-in exists; device biometrics come with real authentication.
- Research on "dyslexia fonts" is mixed. The setting stays a choice for parents, off by default; a learning designer may revisit the font with playtest evidence.
- Andika adds font files to the build (all scripts and both weights), but each browser downloads only what a page uses.
