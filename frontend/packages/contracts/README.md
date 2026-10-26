# @learnofun/contracts

Zod schemas, with exported TypeScript types of the same names, for everything that crosses a boundary. The mock API validates every request, response and the mock data file against them. Plan sections 3, 4.4, 5.1, 5.2, 6.2 and 6.4.

| File                 | Schemas                                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `common.ts`          | `Uuidv7`, `ContentId` (ADR 0009), `Timestamp` (UTC, ending in Z), `IsoDate`, `Locale`, `Market`, `TimeZone`, `SemVer`, `LocalizedText`                                                                                                                |
| `bands.ts`           | `ExperienceBand` (ADR 0005)                                                                                                                                                                                                                           |
| `family.ts`          | `ParentAccount`, `Family`, `FamilyMember`, `FamilyRole`                                                                                                                                                                                               |
| `child.ts`           | `ChildProfile` (ADR 0010), `ChildProfileInput`, `PROFILE_AGES` and `ageInMonth` (ADR 0026), `PlaySettings`, `TimeLimits`, their defaults and steps, `SubjectBalance` with `equalBalance` and `balanceFor` (ADR 0027), `ChildSettings`, `LearningGoal` |
| `market.ts`          | `MarketConfig`, `GradeScheme`, `Grade` (plan 7.4, ADR 0026), `AgeBand` and `bandForAge` (ADR 0027)                                                                                                                                                    |
| `skills.ts`          | `SubjectId`, `Strand`, `Skill`, `SkillPrerequisite`, `SkillGraph` (rejects unknown skills and strands, and cycles)                                                                                                                                    |
| `items.ts`           | the eight item types, `Item`, `ItemResponse`, `Misconception`, `Instruction`                                                                                                                                                                          |
| `game.ts`            | `GameManifest`, `AssetRef`, `MessageKey`, `SignalDeclaration`                                                                                                                                                                                         |
| `activity.ts`        | `Activity`, `ItemSource`, `Mode`, `Tier`                                                                                                                                                                                                              |
| `events.ts`          | the 11 learning events, `LearningEvent`, `EventBatch`                                                                                                                                                                                                 |
| `session.ts`         | `LearningSession`, `SessionStatus`                                                                                                                                                                                                                    |
| `learner.ts`         | `SkillState`, `SkillStatus`                                                                                                                                                                                                                           |
| `recommendations.ts` | `Recommendation`, `RecommendationReason`, `SessionReason`, `TodayCard`, `ReasonEvidence`                                                                                                                                                              |
| `entitlements.ts`    | `Features`, `Entitlements`                                                                                                                                                                                                                            |
| `templates.ts`       | `ItemTemplate`, `ItemTemplates` (ADR 0015)                                                                                                                                                                                                            |
| `api.ts`             | Every request and response body under `/api`, among them the dashboard's progress (`ChildProgressResponse`, ADR 0028), `ApiError` and its codes                                                                                                       |

```ts
import { ChildProfile } from '@learnofun/contracts';

const result = ChildProfile.safeParse(data); // result.error names the field and the problem
```

Pure: no browser or Node APIs, no clock, no randomness. May import no other Learnofun package.

`src/testing.ts` holds helpers for the tests; it is not exported.
