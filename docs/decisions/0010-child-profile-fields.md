# 0010. What a child profile holds

- Status: accepted
- Date: 2026-10-20
- Plan section: 3.1 (separations), 3.4 (modelling rules), 8.3 (data minimization)

## Context

CLAUDE.md rule 7 says to collect only a child's nickname, birth year and month, and learning language. The plan also stores a UI locale, curriculum, optional grade (3.1), a time zone for the learning day (3.4), and the avatar the child picks (1). FRONTEND-KICKOFF step 10 lets parents edit the nickname, birth year and month, learning language and optional grade, "nothing more".

## Options considered

1. Rule 7's personal data, the optional grade, and settings that identify nobody: avatar, UI language, curriculum and time zone.
2. Only rule 7's three fields, leaving the rest for a later decision.

## Decision

Option 1, the team's choice. `ChildProfile` in `packages/contracts` holds:

- personal data: `nickname` (need not be a real name), `birthYear`, `birthMonth`, `learningLanguage`, and an optional `grade`;
- settings: `avatarId`, `uiLocale`, optional `curriculumId`, and `timeZone`.

`ChildProfile` and `ParentAccount` are strict schemas: an unknown field, such as `dateOfBirth`, `photo` or `school`, is rejected rather than silently dropped, so personal data cannot slip in unnoticed. Play settings and time limits are a separate `ChildSettings` record.

## Consequences

- Rule 7 reads as a rule about personal data; the settings above identify nobody.
- Adding any field to a child profile now needs a change to the contract, which makes it a reviewed decision.
- Parents edit only the personal-data fields and grade (step 10); the avatar is chosen in child mode, and the other settings come from family and market defaults.
