# Screen-reader checklist

For the human, who listens: Claude cannot (FRONTEND-KICKOFF 15e). The automated pass in `frontend/apps/web/e2e/accessibility.e2e.ts` checks the structure, names, contrast, keyboard and switch use of every screen. It cannot tell whether the result *sounds* right. This list covers that.

## Before you start

- Run `npm run dev` in `frontend/`, then open http://localhost:5173.
- Windows: NVDA with Chrome or Edge. Mac or iPad: VoiceOver with Safari. Android: TalkBack with Chrome.
- Use the reader's own keys (NVDA: Tab, arrow keys, H for headings, D for landmarks; VoiceOver: VO + arrows, the rotor; touch: swipe and double-tap).
- Mock accounts: Robin (no PIN) and Ari (picture PIN sun, fish, star) in the child area; Sam and Alex in the dashboard. For the grown-ups' gate, answer the times-table question.

Tick each line, or write what you heard instead.

## Child area

### Who's playing?
- [ ] The page is announced as "Who's playing?", and each child as a button with their nickname.
- [ ] "Grown-ups" is announced as a button.

### Picture PIN (Ari)
- [ ] The dialog is announced by its title, "Ari's picture PIN", and focus is inside it.
- [ ] Each picture is a button with its name (sun, moon, star, …), and you hear how many pictures are chosen.
- [ ] A wrong PIN is announced without you having to look for it.

### Parental gate
- [ ] "For grown-ups" is announced, then the question, "What is … times …?".
- [ ] Each digit you press is announced, and so is the number entered so far.
- [ ] A wrong answer is announced, and so is the new question.

### Today and All games
- [ ] "Hi, Robin!" is heard first, then each activity card as one button: its kind (Review, New skill, Your choice), its title and its minutes.
- [ ] H and the landmarks move between the main parts in a sensible order.

### A game (Hop Line)
- [ ] The question is read when a new item appears, without moving focus by hand.
- [ ] On the number line slider, each arrow press says where the frog is and how many hops.
- [ ] Hop, Back and Land are buttons with those names. Feedback (right, nearly, a hint) is announced once, not repeated.
- [ ] The progress ("Question 2 of 8") can be found.
- [ ] Pause opens "Paused" with focus inside. "Keep playing" returns to the game where you were.

### Breaks and the end of a session
- [ ] "Time for a stretch" is announced as a dialog, with its two choices.
- [ ] "You did it!" is announced when a session ends.
- [ ] "That's all for today" is announced on Today when the day's time is used up.

### The grown-ups' settings
- [ ] The dialog is announced as "Settings for Robin".
- [ ] Each switch says its name and whether it is on or off, and changes are announced.
- [ ] Setting a picture PIN tells you which step you are on (choose, then confirm).

## Parent dashboard

- [ ] Sign-in: "Sign in to Learnofun for families", then each account as a button.
- [ ] Overview: each child is a heading, and their links say which child they are for ("Edit profile for Ari").
- [ ] Profile form: each field says its label and hint. An error is announced and tied to its field.
- [ ] Goals and time: each menu and radio group says its label, and "saved" or an error is announced after saving.
- [ ] Progress: each skill's status is read as a word (Mastered, Strong, Building, …), never only as a colour or shape. "Early signal" is heard where it shows.
- [ ] Sessions: each session's summary is read as plain counts, and "Question by question" opens and is announced as expanded.
- [ ] Plan: each feature is read with whether the family's plan includes it.

## Everywhere

- [ ] Try once with the Language menu (Developer tools, in the corner) on "en-XB", right to left: reading order still follows the screen.
- [ ] Nothing is read twice, and decorative pictures are not read at all.
- [ ] Turn on reduced motion in the system settings: nothing important is lost.

When you're done, note anything that didn't sound right; each item becomes a fix.
