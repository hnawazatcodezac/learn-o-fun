# Learnofun — Product & Technical Plan

Oct 19, 2026 · @Hamid Nawaz · Draft for review

## Summary

Build Learnofun as a TypeScript modular monolith on PostgreSQL with a web-first Play app, and put all adaptive logic in one shared, deterministic learning core that runs on both the device and the server. By week 16, after six weeks of foundations, a vertical slice proves the full loop; public launch follows   at about seven months with maths and early English for ages 3–8, in one market.

### The eight decisions that matter most

1. **One codebase, one language.** A TypeScript monorepo, a modular monolith API, PostgreSQL and managed cloud services. No Kubernetes, microservices or message brokers until a measured need appears.
2. **Web-first Play app.** React with PixiJS and Rive for rich games, offline-tolerant, wrapped for the app stores in Phase 3.
3. **Games implement a small contract.** The platform owns session flow, grading, hints, accessibility, localization and telemetry. Activities are configuration, so most new learning experiences need no new code.
4. **Evidence, not scores.** Learning data is an append-only event log interpreted by one weighting rule set, so hints, retries and repeated questions cannot inflate mastery.
5. **Explainable adaptation.** Elo-style ability estimates, rule-based mastery gates, a window-based in-session policy and a prerequisite-aware planner. Every decision carries a reason code, and every policy version must pass simulated-learner tests before release.
6. **Separate concepts stay separate.** Tenant, region, market, locale, learning language, curriculum, grade, experience band and learning level are distinct fields.
7. **One data region now.** New regional cells only when law or contract requires; Saudi Arabia is the likely first.
8. **Safety by omission.** Children never hold credentials and never meet other users, ads, trackers or paywalls.

### Needed from you before Phase 1

The launch market and language, the team (especially a learning designer), whether a web-only launch is acceptable, and confirmation of maths for ages 6–8 as the first slice. The full list is in section 12.1.

## 1. Product breakdown

Learnofun is three user-facing apps on top of eight platform modules. The games are the visible part; the learning engine and the content system are what make it a platform rather than a game collection.

| Module | Serves | Responsibility | In first release |
| --- | --- | --- | --- |
| Play app | Children | Profile picker, today's plan, activity library, game sessions, rewards; works through short connectivity drops | Yes |
| Family dashboard | Parents | Child profiles, goals, controls, progress by skill, explained recommendations, billing | Yes, core views |
| Studio | Staff: educators, translators, ops | Author, review and publish content, curricula, translations, plans and prices | Content-as-code with preview first; web studio later |
| Identity, family and consent | Everyone | Parent accounts, family tenant, child profiles, devices, roles, consent records | Yes |
| Catalog and content | Everyone | Skill graph, activities, items and item templates, assets, localized variants, versioned releases | Yes |
| Game runtime | Children, game developers | Game shell, session engine, game module contract, item types and graders | Yes |
| Learning engine | Children, parents | Evidence processing, learner model, in-session policy, long-term planner, explanations | Yes, v1 models |
| Insights | Parents | Progress summaries, skill maps, weekly digest | Basic |
| Entitlements and billing | Parents, staff | Plans, regional prices, subscriptions, feature gates enforced by the API | Free tier plus one paid plan |
| Regional configuration | Everyone | Markets, locales, curricula, age bands, legal policy sets, data residency | One market live; structure for more |
| Ops and analytics | Staff | Audit log, audited support access, observability, privacy-safe product analytics | Minimal |

### Core journeys

1. **Parent onboarding:** sign up, give consent, add a child (nickname, birth month and year, learning language, optional grade), pick goals, hand the device over in child mode.
2. **First play:** the child picks an avatar and plays a short, game-like placement activity (never called a test) that finds a starting point per subject.
3. **Daily loop:** a "Today" plan of three cards (one review, one new skill, one free choice), a session, an end-on-success celebration. Evidence updates the learner model.
4. **Weekly loop:** the parent gets a digest: what was practised, what is now strong, what comes next and why.

### What children never see

Failure screens, rankings against other children, ads, purchase prompts, links out of the app, chat or any contact with other users. Anything that leaves child mode sits behind a parental gate.

## 2. Recommended architecture

Build a TypeScript modular monolith on PostgreSQL, with a web-first Play app and all learning logic in one shared, pure TypeScript package that runs identically in the browser and on the server. This gives a small team one language, one deployable and one database, while keeping clean seams for later extraction.

&#91;embedded content: system architecture · 3 apps, 1 regional cell, global CDN\]

Devices run games and the learning core locally and sync events to the API. Content flows one way, from Studio through the CDN into every cell; personal data never leaves its cell.

### 2.1 Components

- **Play app.** React and TypeScript app built with Next.js (App Router) as a static export and styled with Tailwind CSS on the design-system tokens, installable as a PWA with a Serwist service worker. Every game and play screen is a client component; Next.js is never the backend. Wrapped with Capacitor for the App Store and Google Play in Phase 3. UI-like games render with DOM and SVG; scene-heavy games use PixiJS (WebGL 2D); characters animate with Rive. A service worker caches game bundles and content; learning events queue in IndexedDB so a dropped connection never loses work.
- **Family dashboard.** React app on Next.js, sharing the design system and its Tailwind theme. It is fully authenticated and calls the API from the browser, so it needs no server rendering: it is a static export too, in one app with the Play app (ADR 0007, ADR 0042).
- **Studio.** Internal React app for content, curricula, translations and plans, built in Phase 3. Until then content lives in the repository (2.4).
- **Marketing site.** Static, localized site deployed separately. It is the only place marketing analytics may run, and only with consent.
- **API.** Node.js modular monolith on Fastify. Contracts are Zod schemas; OpenAPI and typed clients are generated from them.
- **Worker.** Same codebase, separate process. Runs learner-model updates, session close-out, weekly digests, retention and deletion jobs, and content release ingestion. The job queue lives in PostgreSQL (pg-boss or Graphile Worker), so there is no Redis or Kafka to operate yet.
- **PostgreSQL.** One regional primary with a standby. Holds transactional data, the append-only learning event log (partitioned by month) and JSONB content payloads.
- **Object storage and CDN.** Game bundles, immutable content releases, audio and images.
- **External services.** Payments (Stripe first), transactional email, error tracking with PII scrubbing, and a translation management system.

### 2.2 Module boundaries inside the API

| Module | Owns |
| --- | --- |
| identity | Parent accounts, credentials, sessions, devices, staff roles |
| family | Tenants, child profiles, settings, goals, family members |
| consent | Policy versions, consent records, verification evidence |
| catalog | Skills, curricula, activities, published content releases (read-mostly) |
| sessions | Session lifecycle, event ingest, authoritative grading |
| learner | Evidence, skill states, mastery, review schedule |
| planner | Recommendations and their explanations |
| insights | Parent-facing summaries and digests |
| commerce | Plans, regional prices, subscriptions, entitlements |
| regional | Markets, locales, age-band and grade schemes, legal policy sets |
| admin | Staff access, audit log, support tooling |

Modules call each other only through public interfaces or in-process domain events, never each other's tables. A dependency linter fails the build when a boundary is crossed. Event ingest is the most likely module to be extracted into its own service, and only when load proves it necessary.

### 2.3 The shared learning core

`packages/learning-core` holds pure functions with no I/O: item graders, evidence rules, the learner-model update, the in-session policy, planner scoring and the explanation builder. The Play app runs it for instant feedback and offline adaptation; the API runs the same code to re-grade answers authoritatively and to rebuild learner state. All randomness is seeded, so any session can be replayed exactly. This package is the single most important decision for making adaptation testable and explainable.

### 2.4 Content management

Start with content as code. Skills, curriculum mappings, activities, item templates and authored items live as YAML or JSON in the repository, validated by Zod schemas in CI and previewed in a local sandbox. A content CLI publishes each approved state as an immutable, versioned content release to the CDN and registers it in the database. Git gives review, diffs, history and rollback for free. UI strings live in the repo and sync with the translation management system. The Studio app comes when non-developers author at volume, and it writes the same schemas.

### 2.5 Hosting

Use one cloud provider and managed services only: serverless containers (AWS ECS Fargate or Google Cloud Run), managed PostgreSQL with multi-zone failover, object storage with a CDN, and infrastructure as code (Terraform or OpenTofu). Production and staging live in separate accounts. No Kubernetes at this stage. Pick the provider once the launch market is confirmed: AWS, Azure and Google Cloud all run Gulf regions today, and [AWS says its first Saudi region is on track for December 2026](https://www.channelinsider.com/infrastructure/news-aws-cloud-region-launch-emea-saudi-arabia/).

### 2.6 Repository layout

```
apps/      play · family · studio · api · worker · site
packages/  contracts · learning-core · game-sdk · games/<game-id> · ui-kit · i18n · content · config
tools/     simulator · content-cli · game-sandbox
```

One pnpm monorepo with Turborepo. `contracts` holds every schema shared across the wire: API, learning events, content, game manifests.

### 2.7 Operations

OpenTelemetry for traces and logs, error tracking with PII scrubbing, and two service-level objectives from day one: no accepted learning event is ever lost, and API p95 latency stays under 300 ms.

## 3. Core domain model

The model has eight bounded contexts. Its most important property is that nine concepts usually lumped together (tenant, region, market, locale, language, curriculum, grade, experience band and learning level) are stored separately, so each can change without the others.

### 3.1 The separations that matter

| Concept | Meaning | Stored on | Example |
| --- | --- | --- | --- |
| Tenant | Security boundary that owns personal data | Family (later also School) | The Khan family |
| Region | Where that tenant's personal data physically lives | Family.homeRegion | `eu-1`, `me-1` |
| Market | Country whose law, prices and defaults apply | Family.market (ISO 3166) | AE, GB |
| Locale | UI language and formatting preference (BCP 47) | Account; ChildProfile.uiLocale | en-GB, ar-AE |
| Learning language | Language a child's content is delivered in | ChildProfile.learningLanguage | English for a child in Dubai |
| Curriculum | Standards framework that progress maps to | ChildProfile.curriculumId | England National Curriculum |
| Grade | School year within that curriculum's grade scheme | ChildProfile.grade, optional | Year 3 |
| Experience band | Presentation tier: reading load, interaction style, session length | Derived from age and reading level | Early Primary |
| Learning level | Where the child actually is, skill by skill | SkillState | Multiplication: building |

Region and market are linked only through configuration: each market names its allowed regions. A child's UI locale and learning language can differ, which matters for bilingual families and for children learning English abroad.

### 3.2 Contexts and entities

| Context | Entities | Data scope |
| --- | --- | --- |
| Identity and access | Account, Credential, Device, StaffUser, Role | Regional |
| Family | Family, FamilyMember (owner, guardian, caregiver), ChildProfile, ChildSettings, LearningGoal | Tenant, regional |
| Consent and privacy | PolicyVersion, ConsentRecord, DataRequest (export, delete) | Tenant, regional |
| Curriculum and skills | Subject, Strand, Skill, SkillPrerequisite, CurriculumFramework, GradeScheme, Grade, Standard, StandardSkillMap, AgeBandScheme | Global |
| Content and games | Game, Activity, ItemTemplate, Item, Misconception, Asset, LocalizedText, ContentRelease, MarketAvailability | Global |
| Learning | LearningSession, LearningEvent, Attempt, EvidenceObservation, SkillState, Recommendation, Award | Tenant, regional |
| Commerce | Plan, PlanPrice, Entitlement, Subscription, BillingCustomer | Plan catalog global; subscriptions tenant |
| Regional configuration | Market, Region, Locale, LegalPolicySet, MarketDefaults | Global |

### 3.3 Key relationships

- A Family has many ChildProfiles and many FamilyMembers; an Account can belong to more than one Family, which covers parents in separate households.
- Skills form a directed acyclic graph through SkillPrerequisite edges. A Skill maps to many Standards across curricula through StandardSkillMap, which carries a coverage strength.
- A **Game** is a mechanic plus its code. An **Activity** is a configured use of a game: target skills, item source, modes, age bands, artwork theme. Recommendations point at Activities, and new Activities need no code.
- An Item comes from an ItemTemplate (generated) or is authored directly. It assesses one or more Skills, and each wrong option can link to a Misconception.
- A LearningSession belongs to one ChildProfile and one Activity, and records the game version, content release and policy version it ran on. LearningEvents belong to a session; Attempts and EvidenceObservations are derived from them.
- There is exactly one SkillState per child and skill, holding the ability estimate, uncertainty, mastery status and next review date.
- A Subscription links a Family to a Plan; Entitlements are computed from the plan plus any overrides.

### 3.4 Modelling rules

- Every tenant table has a non-null `family_id` and a row-level security policy.
- IDs are UUIDv7. Sessions and events get their IDs on the device, which makes retries idempotent.
- Timestamps are `timestamptz` in UTC. Families and children carry an IANA time zone; a child's "learning day" is computed in their zone.
- Content is referenced by ID plus release, so old sessions stay interpretable after content changes.
- Store birth year and month, not full date of birth, unless a market requires more.
- Deleting a child removes their personal data and learning history; only aggregate statistics with no identifiers survive.

## 4. Adaptive learning design

Adaptation runs as three loops over one learner model: an in-session policy that picks the next item and level of support, a per-skill learner model that turns weighted evidence into ability and mastery, and a planner that decides what to practise across days. All three are deterministic, versioned and tested against simulated learners before any child sees them. Every number below is a starting default stored in configuration, to be tuned with a learning designer and real data.

&#91;embedded content: adaptive learning · 3 loops around 1 learner model\]

The policy reads the learner model to choose each item; answers flow into the event log, become weighted evidence and update the model; the planner reads the model to set the next session.

### 4.1 The learner model

Each child has one SkillState per skill, holding two different things.

**Ability (θ) with uncertainty (σ).** An Elo-style rating, a method with a long track record in adaptive maths practice for children. Each item has a difficulty *b*, seeded from authored features (number size, carrying, distractor similarity) and recalibrated offline from pooled data. After each piece of evidence:

```latex
P = c + (1 - c)\,\frac{1}{1 + e^{-(\theta - b)}} \qquad \theta' = \theta + K(\sigma)\, w\, (x - P)
```

Here *x* is 1 for correct and 0 for wrong, *c* is the guessing floor (0.5 for a two-option item), *w* is the evidence weight from 5.3, and *K* shrinks as σ shrinks, so early evidence moves the estimate more than late evidence.

**Mastery status.** A rule-based gate over the evidence, never the rating alone. Statuses run Not started → Exploring → Building → Strong → Mastered, plus Review due. Mastered requires all of:

- predicted success at the skill's mastery difficulty of at least 0.85, with σ under the skill's threshold;
- at least 8 full-weight observations on at least 6 distinct items;
- evidence from at least 2 sessions on 2 different days;
- at least 4 correct in the 5 most recent full-weight observations;
- for skills flagged as broad, evidence from at least 2 different activities.

This is how "success in one game is not mastery of a subject" is enforced in code.

**Retention.** A mastered skill is scheduled for review at expanding intervals (3, 7, 21, then 60 days). A successful review extends the interval. A failed review sets Review due and lowers θ modestly; it never resets the skill to Not started. Once enough review data exists, swap the fixed ladder for a fitted memory model.

### 4.2 In-session adaptation

After every response the session engine asks the policy for the next step. The policy sees the target skills, current θ and σ, a rolling window of the last 5 responses per skill, support used so far, time elapsed and the experience-band settings. It returns a decision: next item, support action and a reason code.

1. **Aim for a success zone.** Pick items whose predicted success sits in the band for the mode and experience band: 0.80–0.90 in Practice for ages 3–5, 0.70–0.85 in Practice for older children, 0.60–0.80 in Challenge.
2. **Change difficulty on windows, never single answers.** Step up after 3 of the last 4 correct on first try; step down after 2 consecutive errors on the same skill, or 3 wrong out of the last 5. At least 2 items must pass between changes.
3. **Climb a support ladder per item.** First error: encouraging feedback and a retry. Second: a game-specific hint, such as highlighting the number line. Third: a worked "show me", after which the item counts as supported and play moves on. Three attempts is the ceiling.
4. **Step back, then forward.** After 2 supported items in a row, insert one scaffold item from a prerequisite skill, then one bridge item, then return to the target. When the wrong answer is linked to a misconception (answering 10 to 7 × 3 suggests adding), the explanation targets that misconception.
5. **Re-ask once, later.** A missed item returns once after 2–3 other items. Getting it right then earns learning credit, not fresh mastery evidence.
6. **Guard against loops.** No more than 3 scaffold items in a row or 30% of a session. No item repeats within a session except the planned re-ask. If accuracy stays under 40% after scaffolding, end the block on an easy success, switch activity and flag the skill for the planner.
7. **Notice disengagement.** Wrong answers faster than plausible reading time, repeated skips or long idle periods trigger an offered break or a change of activity, never a penalty.
8. **Shape the session.** Warm up with 1–2 review items, run the core block with a review item about every 5 items, and always end on a success. Length comes from the experience band and the parent's limits.

**Practice and Challenge.** Practice offers hints, retries and explanations. Challenge removes hints, allows one attempt, and gives every answer full evidence weight. Timers appear only for skills marked as fluency skills and only from age 7. Lives never appear below age 6.

### 4.3 The long-term planner

The planner runs after each session and once a day.

1. **Gather candidates:** reviews that are due; frontier skills (prerequisites Strong or Mastered, skill not yet mastered); skills still Building; skills named in parent goals; gaps found at placement.
2. **Score them** on goal alignment, readiness, review urgency, gap severity, variety across subjects and mechanics, recency and the child's favourite games. Weights are per experience band.
3. **Apply constraints:** the parent's subject balance, at most one new skill a day for ages 3–5, and entitlements. Children never see locked content or upgrade prompts; upgrades are offered to parents only.
4. **Pick an activity** for each chosen skill, preferring a mechanic the child has not recently used for that skill.
5. **Publish Today:** three cards, one review, one new or frontier skill and one free choice.

**Placement.** A short, game-like activity per subject walks the skill graph adaptively, starting from the age or grade expectation and stepping up or down like a binary search. It produces starting estimates with high uncertainty. Reassessment happens when evidence conflicts (a mastered skill fails review twice) or about every 8 weeks per subject.

**Temporary difficulty or persistent gap.** One poor session is temporary difficulty and changes nothing beyond the next session. A skill still Building after at least 3 sessions on 2 or more days, despite support, is a persistent gap. The planner then checks its prerequisites: if one is weak, it schedules that first; if not, it tries a different representation or mechanic.

### 4.4 Explanations parents can read

Every recommendation and status change stores reason codes, the evidence that triggered it and the policy version. Parent-facing text comes from localized templates filled with that evidence.

| Reason code | What the parent reads |
| --- | --- |
| FRONTIER\_READY | Sara is starting multiplication because she has shown strong understanding of repeated addition: 14 of 16 first tries correct over 4 sessions. |
| REVIEW\_DUE | We're revisiting number bonds to 10. Sara mastered them three weeks ago, and a quick review helps them stick. |
| PREREQ\_SUPPORT | Two-digit subtraction was tricky this week, so we're practising place value, which it builds on. |
| PARENT\_GOAL | You asked us to focus on reading this month. |
| DIFFICULTY\_STEP | Shown in session detail: easier questions after two misses in a row, back to the target level after three correct. |

The wording uses growth language (building, getting stronger, ready for more) and never words like weak, failing or behind. Statuses describe skills, not children. When evidence is below the minimum, the dashboard says "early signal". Children are never compared with other children.

### 4.5 Safeguards

- Adaptation uses only answers, timing, hints and skips. No camera, microphone, location or free text.
- Parents can pin a goal, pause a subject, or mark a skill "learned at school". That last one triggers a short check rather than a blind status change.
- Policy changes are reviewed by a learning designer before release. Experiments only compare variants that are both believed to be good; none withholds learning from a group of children.

### 4.6 Proving it works before children see it

- **Learner simulator.** Synthetic children with known true ability per skill, plus learning rate, slip, guess, forgetting and disengagement parameters. Every policy version runs against thousands of them in CI.
- **Release gates.** Initial targets: false-mastery rate (mastered while true ability is below threshold) under 5%; scaffold-loop sessions under 2%; at least 70% of items inside the success zone; fewer than 1 streak of 3 consecutive errors per session on average. Items-to-mastery is tracked and compared between versions.
- **Replay.** Because events are the source of truth and the core is deterministic, a new policy can be replayed over anonymized real histories to compare its decisions before rollout.
- **Golden scenarios.** Hand-written cases such as "three wrong, then four right" with the exact decisions and reason codes expected.

## 5. Learning evidence and measurement

An append-only event log is the single source of truth. Accuracy, mastery, game scores and parent insights are all projections computed from it by one shared rule set, so every game means the same thing by "correct", "attempted" and "mastered", however different its mechanics.

### 5.1 Event model

Every event carries an ID generated on the device, a per-session sequence number, the device timestamp and a schema version. The core events:

| Event | Key fields |
| --- | --- |
| session\_started | activity and version, content release, mode, policy version |
| item\_presented | item, skills, difficulty, role: target, scaffold, bridge, review, re-ask or warm-up |
| response\_submitted | attempt number, response, latency, support level so far |
| hint\_shown, explanation\_shown | level, misconception targeted |
| item\_skipped | — |
| session\_paused, session\_resumed | reason: backgrounded, navigated away, parent gate |
| session\_completed, session\_ended | reason |
| game\_signal | whitelisted, typed game-specific telemetry; never free text |

Devices send events in batches. The API stores them raw, re-grades each response with the shared grader (the server's verdict is authoritative), and the worker derives Attempts and EvidenceObservations and updates SkillStates.

### 5.2 Canonical definitions

| Measure | Definition |
| --- | --- |
| Items presented | Items shown to the child |
| Items attempted | Items with at least one response |
| Items skipped | Items the child chose to skip |
| Items abandoned | Items presented with no response before the session ended |
| First-try accuracy | Items correct on the first attempt without help ÷ items attempted. The headline accuracy everywhere. |
| Eventual success | Items eventually answered correctly ÷ items attempted |
| Supported rate | Items where any hint or worked example was used ÷ items attempted |
| Learning credit | Items wrong at first and right later. Celebrated as perseverance; never counted as mastery. |
| Game score | Stars or points a game shows. For motivation only; never used in any learning measure. |
| Session status | Completed, ended early, interrupted (resumable for 24 hours) or expired |
| Time on task | Active time only; idle periods over 30 seconds and backgrounded time are excluded |

### 5.3 Evidence weights

| Observation | Weight toward ability and mastery |
| --- | --- |
| First attempt, no help, item not seen in the last 14 days | 1.0 |
| First attempt after a hint | 0.5 if correct, 1.0 if wrong |
| Second or later attempt on the same item | 0, recorded and earns learning credit |
| Planned re-ask later in the session | 0.3 |
| Item already seen in the last 14 days | 0.3 |
| Scaffold item | 1.0 toward its own prerequisite skill, 0 toward the target skill |
| Skip | No ability update; feeds the disengagement rule |
| Response time | Never affects mastery. Feeds a separate fluency flag only for skills marked as fluency skills, ages 7 and up. |

A child who answers wrong twice and then right gets encouragement and learning credit, the history keeps all three attempts, and mastery moves only on the first attempt. Replaying easy items cannot inflate mastery, because repeats weigh 0.3 and mastery requires distinct items.

### 5.4 Interruptions and integrity

- **Offline.** Events queue on the device and flush on reconnect with backoff. The device holds a learner snapshot, so adaptation keeps working offline.
- **Leaving a game.** Backgrounding or navigating away pauses the session. It can resume on the same device within 24 hours; after that the server closes it as interrupted.
- **Partial sessions.** Every answer given counts as evidence. Rewards tied to completion are granted only on completion.
- **Duplicates and late arrivals.** Device-generated event IDs make retries harmless. A late batch for an older session triggers a recompute of the affected SkillStates from the log.
- **Concurrency.** A session belongs to one device. SkillState updates are serialized per child in the worker, so two devices cannot corrupt each other.
- **Tampering.** The server re-grades every response; the device's verdict is only for instant feedback.
- **Model upgrades.** SkillStates can be rebuilt from history under a new policy version. Past explanations keep the version that produced them.

### 5.5 Storage and retention

Events sit in monthly partitions. Raw events are kept for a period set by each market's policy (18 months is a reasonable starting default), then compacted into observations and aggregates. Everything about a child is deleted when the parent deletes the profile or the account.

## 6. Game development framework

A game is a small module that renders items in its own world and turns interaction into a typed response. The platform supplies everything else: session flow, adaptation, grading, hints, audio, accessibility, localization, pause and resume, rewards and telemetry. That split lets a new game ship in weeks while each game keeps mechanics of its own.

The planned games, grouped by subject with ages, skills and release phase, are in the [Game library](game-library.md).

### 6.1 Three layers

- **Game shell (platform).** Loading, layout, pause menu, sound, music, voice and motion settings, progress strip, shared feedback and celebration overlays, hint button, exit through the parental gate, audio manager, input abstraction (touch, mouse, keyboard, switch access), accessibility layer and error boundary.
- **Session engine (platform, headless).** Lives in `learning-core`. Runs the loop: asks the policy for the next step, pulls items from a bank or generator, grades responses and emits events.
- **Game module (per game).** Renders one item at a time and reports what the child did.

### 6.2 The contract

```ts
export interface GameManifest {
  id: string;
  version: string;                       // semver, recorded on every session
  itemTypes: ItemTypeId[];               // item types this game can render
  experienceBands: ExperienceBand[];
  inputModes: ('tap' | 'drag' | 'keyboard' | 'switch')[];
  accessibility: { screenReader: 'full' | 'partial'; colourIndependent: boolean };
  flow: 'engine' | 'self';               // see 6.3
  assets: AssetRef[];
  strings: MessageKey[];
}

export interface GameModule {
  manifest: GameManifest;
  mount(ctx: GameContext, root: HTMLElement): GameInstance;
}

export interface GameInstance {
  present(item: PresentedItem): Promise<void>;   // calls ctx.respond(...) when the child answers
  feedback(result: GradeResult, support: SupportAction): Promise<void>;
  pause(): void;
  resume(): void;
  destroy(): void;
}

// GameContext provides respond(), t() for strings, audio, assets, a seeded rng,
// settings (reducedMotion, sound, textScale), signal() for typed telemetry,
// and, for self-driven games, observe() to report evidence directly.
```

### 6.3 Two kinds of game

- **Engine-driven**, the default. The session engine decides what comes next; the game renders it. Examples: number-line jumps, phonics sound matching, sorting, spelling builders.
- **Self-driven**, for simulations, coding puzzles and creative play where the game must own its flow. These still emit lifecycle events and report evidence through `ctx.observe({ skill, outcome, support })`. Creative activities report participation, not correctness, and never feed mastery.

### 6.4 Item types and graders

Item types are shared across games. Each has a Zod schema, a pure grader in `learning-core`, and optional misconception codes on wrong options.

| Item type | Response | Grading notes |
| --- | --- | --- |
| choice | Option IDs | Single or multiple; wrong options may carry misconception codes |
| numeric | Number | Tolerance and accepted forms, such as equivalent fractions |
| placement | Position on a line or grid | Tolerance narrows as difficulty rises |
| match or sort | Pairs or buckets | Partial credit configurable |
| sequence | Ordered list | Positional or adjacency scoring |
| build or spell | Tokens | Locale-aware word lists |
| audio choice | Option IDs | For pre-readers; prompt is spoken |
| program | Instruction list | Graded by running a small simulator |

Because items are not tied to one game, the same item can appear in several games. That is how the "evidence from two different activities" mastery rule is met without writing new content.

### 6.5 Content generation

- **Parametric templates** for maths and logic: constraints plus difficulty features produce endless fresh items, which defeats memorisation. Every generated item can be rebuilt from its seed.
- **Authored item banks** for literacy, comprehension and science, with editorial review.
- **Localized templates:** word problems draw on market-specific name pools, currencies and units; spelling uses locale word lists, so en-GB and en-US children are not marked wrong for each other's spelling.
- **AI-assisted drafting** of items, distractors and translations inside the authoring pipeline, always human-reviewed before release. No live generative AI in front of children at launch.

### 6.6 Design system

Each experience band has its own theme. Ages 3–5: no reading required, spoken instructions everywhere, large touch targets of about 64 px, tap and drag only. Ages 6–8: short text with audio. Ages 12–18: a mature, non-cartoon look, because teenagers abandon products that feel childish. One character system animated with Rive, one sound library and one set of feedback phrases keep every game recognisably Learnofun.

### 6.7 Definition of done for every game

- [ ] Learning objective, target skills, and a note on why the mechanic itself embodies the concept rather than wrapping a quiz in a reward
- [ ] Playtested with at least 5 children in the target band, with findings fixed
- [ ] Loads in under 3 seconds on a mid-range tablet over 4G, holds 60 fps, game bundle under 1.5 MB excluding shared runtime and audio
- [ ] Works offline after first load; survives pause, resume and rotation
- [ ] Keyboard and switch operable, screen-reader support declared, no colour-only cues, reduced motion respected (a colour-recognition game offers an alternative activity for colour-blind children)
- [ ] No hard-coded strings; passes pseudo-locale and right-to-left pseudo-locale checks
- [ ] Passes the conformance suite

### 6.8 Tooling

- **Game sandbox:** load any game with any item, experience band, locale, motion setting or simulated learner, with hot reload.
- **Conformance suite:** checks lifecycle events, pause and resume, string catalog use, minimum viewport, keyboard reachability, automated accessibility rules and performance budgets.
- **Visual regression:** Playwright screenshots across bands and locales.
- **Scaffold command:** `create-game` generates the manifest, contract stubs, tests and sandbox stories, so AI-assisted development spends its effort on the mechanic, not on plumbing.

## 7. Internationalization and regional strategy

Build the multilingual and multi-market plumbing now, prove it with pseudo-locales rather than real translations, and make each later language or market mostly configuration plus content work, not code changes.

### 7.1 Interface text

- ICU MessageFormat catalogs per locale, covering plurals, gender and select, with keys in code. FormatJS or i18next with ICU support; choose in the first spike.
- Fallback chains per locale, for example en-AE → en → default.
- All formatting through the browser's `Intl` APIs: numbers, dates, plurals, lists, relative time and units. The numeral system is a market setting, because some Gulf schools teach with Arabic-Indic digits.
- A translation management system syncs with the repo, and translators get screenshots from visual regression runs for context.
- A lint rule fails the build on string literals in UI code.

### 7.2 Right-to-left readiness, without Arabic yet

- CSS logical properties only (`margin-inline-start`, never `margin-left`), enforced by a style linter.
- `dir` is set from the locale at the root, and every icon is marked as mirroring or not.
- A right-to-left pseudo-locale (English words, RTL direction, lengthened strings) runs in CI and visual regression, so layouts are proven RTL-safe before any Arabic is written.
- Each game scene declares a direction policy. A story path may mirror; a maths number line may not. Which convention Gulf classrooms use is a question for Gulf educators before that launch.

Deferred until the Gulf launch: Arabic translations, Arabic fonts, Arabic voice recordings, Arabic literacy content and Gulf curriculum mappings.

### 7.3 Educational content localization

| Content kind | Strategy | Example |
| --- | --- | --- |
| Language-neutral skills: most maths and logic | One item model; wording, audio and context localized | 7 × 3 shown with local coins |
| Language-specific skills: phonics, spelling, grammar, reading | A separate skill subgraph per learning language, written by native-language educators, not translated | English phonics and Arabic letter-sound skills are different graphs |
| Cultural context: names, foods, holidays, imagery | Market variant pools, reviewed for appropriateness | Name pools and food items per market |

Every localized item and audio file moves through draft, in review and approved before it can enter a release. Early-years core phrases use recorded voices, because warmth and clarity matter most for pre-readers; the long tail uses reviewed neural text-to-speech. Literacy games use school-style letterforms such as the single-storey a.

### 7.4 Curricula and grades

- Curriculum frameworks, grade schemes and standards are data. Skills are curriculum-neutral and link to standards through StandardSkillMap.
- Progress can therefore be shown against a child's own curriculum ("Year 3 maths: 14 of 22 standards strong") without any game knowing curricula exist.
- Age bands and grade schemes are configured per market: England's Reception year is ages 4–5, US kindergarten ages 5–6.
- The experience band comes from age plus reading level, not age alone: a 7-year-old who cannot yet read gets the audio-first presentation.
- I suggest keeping your five bands as defaults but treating 3–5 carefully: a 3-year-old and a 5-year-old differ sharply in motor control and attention, so early-years games need settings for both ends of the band.

### 7.5 Regional configuration

| Setting | Scope | Notes |
| --- | --- | --- |
| Time zone | Family and child | IANA zones; a child's learning day uses their zone |
| Date, number and currency formats | Locale | Through `Intl` |
| Numeral system | Market | Latin or Arabic-Indic digits |
| Measurement units | Market | Metric or imperial in word problems |
| Prices and currency | Market | One PlanPrice per market and currency |
| Content availability | Market | MarketAvailability on activities |
| Age bands, grade scheme, default curriculum | Market | Configuration |
| Consent rules, consent age, retention periods, allowed regions and processors | LegalPolicySet per market | Reviewed by counsel before launch |

### 7.6 Multi-region infrastructure

Use regional cells, starting with exactly one.

- **A cell** is the API, worker, PostgreSQL and object storage in one cloud region. It holds the personal data of every family homed there.
- **The global layer** holds only non-personal data: content releases on the CDN (replicated to every cell), the plan catalog, and a small directory mapping a hashed parent email to a home region so logins route correctly. No child data is global.
- **Launch** with one multi-zone cell near the launch market, point-in-time recovery, and daily encrypted backups to a second region the market's rules allow. Initial targets: data loss under 5 minutes and recovery within 4 hours.
- **Add a cell** only for a hard reason: a residency rule, a contract that requires in-country storage, or measured latency harm. Games run on the device, so latency rarely forces it.
- **Saudi Arabia** is the likely first second cell. The PDPL does not impose blanket localization, but it limits transfers out of the Kingdom to approved conditions, treats remote access as a transfer, and the regulator has not yet published its list of adequate countries ([Chambers practice guide, March 2026](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/saudi-arabia)). An in-Kingdom cell is probably the simplest compliant path; confirm with counsel.
- **No per-country deployments by default.** Markets share a cell whenever their rules allow.

## 8. Security, privacy and child safety

The strongest safety decision is what we do not build: no contact between users, no user content shared with others, no ads, and no third-party trackers in the child experience. On top of that sit parent-owned accounts, least-privilege child sessions, two independent walls between families, minimal data collection and consent rules set per market.

### 8.1 Accounts and access

- Only parents, and guardians or caregivers they invite, have credentials: passkeys, email magic links, or Google and Apple sign-in. Account owners get multi-factor authentication.
- Children never have credentials. A parent switches a device into child mode, and the device receives a child-scoped token. It can read the catalog and that one child's learner snapshot, and write that child's learning events. It cannot see family settings, billing or siblings.
- Children pick their profile by avatar; siblings sharing a device can each add a picture PIN.
- A parental gate guards leaving child mode, settings, purchases and external links. From age 9 the gate is a parent PIN or device biometrics, because arithmetic gates stop young children but not older ones.
- Roles: **owner** (billing, deletion), **guardian** (full child management), **caregiver** (can start child mode; no billing or data export).

### 8.2 Tenant isolation

- Authorization lives in one policy module that every endpoint calls. PostgreSQL row-level security, keyed on the requesting family, is the second wall.
- An automated test suite calls every endpoint with another family's token and expects a refusal.
- Object storage keys are prefixed by family and served through short-lived signed URLs.
- Staff reach family data only through a support tool that requires a stated reason, grants time-boxed access and writes an audit log. Support staff never query production databases directly.

### 8.3 Data minimization

| Data | Collected | Purpose |
| --- | --- | --- |
| Parent name, email, country | Yes | Account, consent, market rules |
| Payment details | Held by the payment provider only | Billing |
| Child nickname | Yes; need not be a real name | Display |
| Child birth year and month | Yes | Experience band and age-based legal rules |
| Answers, timings, hints, skips | Yes | Adaptive learning |
| First-party install ID | Yes | Offline sync and child mode |
| Child full date of birth, photo, voice, location, contacts, school | No | Not needed |
| Third-party advertising or analytics IDs in the child app | Never | — |

Any future voice feature, such as reading aloud, should process speech on the device by default and require explicit parental consent. The amended US COPPA rule now counts voiceprints among biometric identifiers that are personal information ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)).

### 8.4 Consent and transparency

- Parental consent is captured before any child data is collected. Each ConsentRecord stores the policy version, method, evidence reference and time; a material policy change re-prompts according to each market's rules.
- The verifiable consent method is chosen per market. A paid signup gives a natural verification step; free-tier families need a separate method. The amended COPPA rule adds new methods, including a text-message option for operators that do not disclose children's data to third parties ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)).
- Parents can see what is collected, export it, and delete a child or the whole account. Backups expire on a fixed schedule so deletions eventually reach them.
- Children get a short privacy notice in language suited to their age.

### 8.5 Security baseline

- TLS everywhere, encryption at rest, secrets in the cloud secret manager with rotation.
- Dependency, container, secret and static-analysis scanning in CI.
- A threat model before the beta, an external penetration test before public launch and yearly after.
- Rate limits on authentication and event ingest.
- A written information security program (now also a COPPA requirement) and a breach runbook with each market's notification deadline.

### 8.6 Accessibility

- Family dashboard: WCAG 2.2 AA.
- Play app: WCAG 2.2 AA wherever it applies, plus the game definition of done. Settings for sound, music, voice, motion, text size, high contrast, a dyslexia-friendly font, and timers off.
- Every instruction is available as audio and as captioned text.
- Each release is checked with keyboard, switch access and screen readers.

### 8.7 Healthy use

Daily time limits default on and parents adjust them. Break reminders, no endless feeds, no notifications sent to children, and streaks that never punish a missed day. These defaults also anticipate the UAE requirement that parental tools offer usage limits and mandatory breaks.

### 8.8 Regional legal considerations

| Market | Instrument | What it means for Learnofun | Status |
| --- | --- | --- | --- |
| United States | [COPPA Rule, amended 2025](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule) | Verifiable parental consent before collecting from under-13s; written security program; written retention policy; biometric identifiers are personal information | Compliance required since 22 April 2026 |
| EU and UK | GDPR; UK Age Appropriate Design Code | Parental consent below each country's digital consent age (13–16 in the EU, 13 in the UK); impact assessment; high-privacy defaults; child-friendly notices | In force |
| EU | [AI Act, as amended by the Digital Omnibus](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/) | High-risk duties for stand-alone Annex III systems, which include some education uses, now start 2 December 2027. Whether adaptive assessment in a home app is in scope needs a legal view; a school product is more exposed | Classify before EU school sales |
| UAE | [Federal Decree-Law No. 26 of 2025 on Child Digital Safety](https://www.clydeco.com/en/insights/2026/01/uae-issues-landmark-child-digital-safety-law) | Under-13 data only with verifiable parental consent, easy withdrawal and clear notices; no targeted advertising; age verification proportionate to risk; parental tools with time limits and breaks; education platforms may be exempted by Cabinet decision | In force since 1 January 2026; compliance due January 2027 |
| Saudi Arabia | [PDPL and Transfers Regulation](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/saudi-arabia) | Guardian consent for minors; transfers out of the Kingdom need adequacy or safeguards; regulator notified of breaches within 72 hours | Actively enforced |
| App stores | Apple Kids category, Google Play Families policy | No third-party analytics or ads in the child app; parental gates before links and purchases | Applies when native apps ship |

None of this is legal advice. Each launch market needs a review by local counsel before launch.

## 9. Subscriptions and entitlements

Plans are data that grant feature keys; the API checks keys, never plan names; payment providers sit behind one adapter. Pricing and packaging can then change without code changes.

| Entitlement key | Free | Premium (example) |
| --- | --- | --- |
| `children.max` | 1 | 4 |
| `activities.tier` | free | premium |
| `insights.detail` | basic | full |
| `digest.weekly` | off | on |
| `goals.custom` | off | on |

- **Pricing.** One PlanPrice per market, currency and billing interval, plus trials and promotions. Support staff can apply family-level overrides.
- **Enforcement.** Creating a session checks the activity's tier against the family's entitlements. The insights API shapes its response by `insights.detail`. The planner recommends only activities the family can use. Game bundles on the CDN can stay public; what is enforced is the valuable part: sessions, evidence and insights.
- **Children never meet a paywall.** Locked content is hidden in child mode, and upgrade prompts appear only in the family dashboard.
- **Downgrades lose nothing.** Learning history is kept; extra child profiles become read-only rather than deleted.
- **Providers.** Stripe for web first, behind a `BillingProvider` interface. App Store and Google Play billing when native apps ship, since stores generally require their own billing for in-app digital subscriptions. Regional providers for local payment methods, such as Saudi mada cards, when the Gulf launches. Provider webhooks drive a subscription state machine that recomputes entitlements.
- **Schools later.** A school is another tenant kind with seat-based plans; the model already allows it, but nothing is built until demand is proven.

## 10. Development roadmap

Build one complete vertical slice before widening anything: one subject, one age band, three games, and the full loop from parent signup to an explained recommendation. Public launch follows in about seven months, in one market and in English. Durations assume a core team of four to six people (two full-stack engineers, one or two game developers, a designer-animator and a part-time learning designer) and should be re-estimated once the team is known.

&#91;embedded content: roadmap · 6 phases, 3 gates\]

Each gate is a go/no-go review. Scope widens only after the slice shows that children come back and parents understand the explanations.

### 10.1 What the first public release contains

| Capability | First public release | Later |
| --- | --- | --- |
| Subjects and ages | Maths for ages 3–8; English early literacy for 6–8 | Logic, science, coding, arts; ages 9–18 |
| Platforms | Web app installable on tablets and laptops | iOS and Android store apps in Phase 3 |
| Markets and languages | One market, English; right-to-left proven by pseudo-locale | Second market in Phase 3; Arabic in Phase 4 |
| Adaptive learning | Full in-session policy, ability plus mastery gates, fixed review ladder, planner, explanations, simulator in CI | Calibrated item difficulties; fitted memory model |
| Family dashboard | Profiles, goals, controls, skill map, explained recommendations, weekly digest, invited guardians | Deeper analytics; curriculum progress views for more curricula |
| Content tooling | Content as code, content CLI, local preview | Studio web app |
| Commerce | Free tier and one premium plan on Stripe | Store billing, regional payment methods, school plans |
| Infrastructure | One regional cell | Gulf cell |
| Operations | Audited support tool, observability, backups | Full operations console |

### 10.2 Deliberately deferred

Microservices, Kubernetes, Redis or Kafka, machine-learned learner models, social features of any kind, user-generated content, live generative AI for children, school accounts, and any market beyond the first two. Each has a trigger for revisiting it, recorded in section 11.

## 11. Major technical decisions

Sixteen decisions shape everything else. Each is chosen for a small team that must ship a polished product and still support adaptive learning and several markets; each names the signal that should reopen it.

| Decision | Recommendation | Main alternatives | Why, and when to revisit |
| --- | --- | --- | --- |
| System shape | Modular monolith with lint-enforced boundaries | Microservices; serverless functions | One deployable and real transactions for a small team. Revisit when one module needs independent scaling or its own team. |
| Language | TypeScript end to end | Python, Go, Kotlin or .NET backend | The same learning core runs on device and server; one set of shared contracts; one hiring profile. Python may join later for offline data science, never in the request path. |
| Child app technology | Web with DOM/SVG, PixiJS and Rive; Capacitor for store apps | Unity; Flutter; React Native; fully native | Most learning interactions are UI-like; the web gives strong accessibility, text, i18n and RTL handling, instant updates and small downloads. Unity is heavy on the web and weak with screen readers. Revisit if a game needs 3D or physics that cannot hold 60 fps on target tablets. |
| Frontend framework | Next.js (App Router) and React: the Play app and Family dashboard as one static export, the website with server rendering and static generation | React + Vite single-page apps beside a separate static site; Remix | One framework for the child app, the parent dashboard and the public website, with SEO for the website. A static export keeps the child app offline and wrappable with Capacitor, and Next.js is never the backend. Revisit if a static export blocks an offline or app-store requirement (ADR 0042). |
| Styling | Tailwind CSS v4 with its theme generated from the design tokens, and only token values allowed | Hand-written CSS on token custom properties; CSS-in-JS | Fast, consistent styling that can only use design-system values, with logical utilities for right to left. Revisit if the generated theme cannot express a design-system value (ADR 0043). |
| Database | PostgreSQL, shared schema, `family_id` plus row-level security | Database per tenant; MongoDB; DynamoDB | Relational integrity for families, consent and billing; JSONB for content; partitions for events. Revisit when event analytics outgrow partitions, by adding a columnar store beside it. |
| Learning data | Append-only events with rebuildable projections | Storing only scores and current state | Auditability, replay, offline merge, and recomputation under better models. |
| Learner model | Elo-style ability plus rule-based mastery gates | Bayesian knowledge tracing; IRT only; deep knowledge tracing | Explainable, works from day one without training data, cheap to run, and item difficulties can be learned. Deep models need data and cannot explain themselves. Revisit after about six months of real data, by replaying alternatives. |
| Where adaptation runs | On the device with the shared core; the server re-grades and owns state | Server decides every item | No latency, works offline, one implementation. |
| Content management | Content as code, Studio app later | Headless CMS such as Contentful, Sanity or Strapi | Learning content needs typed schemas, graders, generator parameters, skill mappings and releases, which a generic CMS fights. Revisit when non-developers author weekly. |
| API style | REST with OpenAPI generated from Zod | GraphQL; tRPC | Serves web, native and future school integrations, with typed clients and cacheable responses. |
| Authentication | Maintained auth library in our regional database: passkeys, magic links, Google and Apple | Managed identity provider such as Auth0, Cognito or Clerk | Keeps parent data in-region with no extra processor; children have no credentials anyway. Confirm in the Phase 0 spike; switch to a regionally hosted managed provider if the security review prefers it. |
| Hosting | Managed containers and managed PostgreSQL on one major cloud, with infrastructure as code | Kubernetes; developer platforms such as Render or Fly | Gulf regions, compliance attestations and low operations load. Developer platforms offer far fewer regions. |
| Multi-region | One cell now; residency-ready design; new cells only for legal need | One global database; a deployment per country | Meets residency rules later without per-country sprawl. Revisit at the Saudi launch or for a contract requiring in-country storage. |
| Background jobs | Queue in PostgreSQL | Redis with BullMQ; SQS; Kafka | One less system to run. Revisit when job throughput strains the database. |
| Analytics | First-party events only; no third-party SDKs in the child app | Third-party product analytics SDKs | Required by children's privacy law and app-store kids' rules. |

## 12. Risks and open questions

The biggest risk is not technical: high-quality games, items, audio and localization are expensive to produce, and content will limit growth long before servers do. The open questions below should be answered before Phase 1 starts, because they change scope, legal work and infrastructure.

### 12.1 Open questions

- [ ] **Launch market and language.** This drives legal review, cloud region, curriculum mapping and pricing. Working assumption: one English-speaking market.
- [ ] **Company location and payments.** Where is the company incorporated, and does Stripe support it?
- [ ] **Web or store apps at launch.** Will parents in the launch market accept an installable web app, or do they expect App Store and Google Play from day one? Store apps would move Capacitor work into Phase 2.
- [ ] **Team.** Who is on it, is there a learning designer or experienced teacher, and will art and animation be in-house or outsourced?
- [ ] **First slice.** Confirm maths for ages 6–8.
- [ ] **Curriculum at launch.** Must progress map to a national curriculum at launch, or is skill-based progress enough?
- [ ] **UAE timing.** If the UAE is an early market, its child-data rules and the education exemption need a legal answer before January 2027.
- [ ] **Compliance budget.** Local counsel per market, a consent-verification vendor and a penetration test.
- [ ] **Data from the earlier implementation.** No code is reused, but any real user data it holds still carries obligations: migrate with consent or delete.
- [ ] **Ages 15–18.** Same product, or a separate offering? Teenagers need exam-aligned content and a different tone, and the field is crowded.

### 12.2 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Content production becomes the bottleneck | High | High | Parametric generators, mechanics reused across skills, activities as configuration, a content pipeline from day one, a separate art and audio budget |
| Platform built before children are shown to love the games | Medium | High | Vertical slice with playtests by week 16; a game quality gate before scaling content |
| Adaptive model miscalibrated at the start | High | Medium | Conservative thresholds, high starting uncertainty, simulator gates, monitoring of review failures, learning-designer review |
| Legal requirements misread or changed in a market | Medium | High | Counsel per market, rules held in LegalPolicySet configuration, minimal data by design |
| Age range too wide for one quality bar | High | Medium | Ship ages 3–8 first; separate design language for teens; decide the 15–18 strategy on its own |
| Engagement features drift towards manipulation | Medium | High | Healthy-use rules in the definition of done; no streak punishment; gamification reviewed by the learning designer |
| AI-assisted code and content at volume lower quality | Medium | Medium | Typed contracts, tests, conformance suite, code review, decision records; human review of every child-facing item |
| Right-to-left retrofit becomes expensive | Low with CI checks | Medium | RTL pseudo-locale in CI from the first week |
| App store kids' rules constrain analytics or payments | Medium | Medium | First-party analytics only; purchases on the parent side; store billing planned for Phase 3 |

## 13. Glossary

| Term | Meaning |
| --- | --- |
| Skill | Smallest unit of learning the system tracks, such as "add two numbers within 10" |
| Game | A mechanic plus its code |
| Activity | A configured use of a game that targets specific skills; what children play and the planner recommends |
| Item | One question or task, generated from a template or authored by hand |
| Evidence observation | One weighted data point about one skill, derived from an attempt |
| SkillState | A child's ability, uncertainty, status and next review date for one skill |
| Mastery | The status reached only by passing the gate in 4.1 |
| Experience band | Presentation tier derived from age and reading level |
| Market | Country whose law, prices and defaults apply to a family |
| Region or cell | Where a family's personal data is stored and processed |
| Content release | Immutable, versioned bundle of published content |
| Policy version | Version of the adaptation rules that made a given decision |
