import { z } from 'zod';
import { checkUnique, ContentId, SemVer } from './common';
import { ExperienceBand } from './bands';
import { ItemTypeId } from './items';

export const INPUT_MODES = ['tap', 'drag', 'keyboard', 'switch'] as const;
export const InputMode = z.enum(INPUT_MODES);

export const AssetRef = z.object({
  id: ContentId,
  kind: z.enum(['image', 'audio', 'animation', 'font']),
  path: z.string().min(1),
});

/** A key in the i18n catalogs, such as `games.hopLine.instructions`. */
export const MessageKey = z.string().regex(/^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9-]+)+$/, {
  error: 'Expected a message key such as games.hopLine.title',
});

/**
 * Game-specific telemetry a game may send in `game_signal` events (plan 5.1). Only listed
 * signals are accepted, and values are numbers or true/false, never free text.
 */
export const SignalDeclaration = z.object({
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, { error: 'Expected a camelCase signal name' }),
  kind: z.enum(['number', 'boolean']),
});

/** What a game is and can do (plan 6.2). The version is recorded on every session. */
export const GameManifest = z
  .object({
    id: ContentId,
    version: SemVer,
    /** The item types this game can render. Self-driven games may render none. */
    itemTypes: z.array(ItemTypeId),
    experienceBands: z.array(ExperienceBand).min(1),
    inputModes: z.array(InputMode).min(1),
    accessibility: z.object({
      screenReader: z.enum(['full', 'partial']),
      colourIndependent: z.boolean(),
    }),
    /** 'engine': the session engine decides what comes next. 'self': the game owns its flow (plan 6.3). */
    flow: z.enum(['engine', 'self']),
    assets: z.array(AssetRef),
    strings: z.array(MessageKey),
    signals: z.array(SignalDeclaration).default([]),
  })
  .superRefine((manifest, context) => {
    if (manifest.flow === 'engine' && manifest.itemTypes.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'An engine-driven game renders at least one item type',
        path: ['itemTypes'],
      });
    }
    for (const mode of ['keyboard', 'switch'] as const) {
      if (!manifest.inputModes.includes(mode)) {
        context.addIssue({
          code: 'custom',
          message: `Every game must be ${mode} operable (.claude/rules/games.md)`,
          path: ['inputModes'],
        });
      }
    }
    checkUnique(manifest.itemTypes, context, (type) => `Item type ${type}`, ['itemTypes']);
    checkUnique(manifest.assets, context, (asset) => `Asset ${asset.id}`, ['assets']);
    checkUnique(manifest.signals, context, (signal) => `Signal ${signal.name}`, ['signals']);
  });

export type InputMode = z.infer<typeof InputMode>;
export type AssetRef = z.infer<typeof AssetRef>;
export type MessageKey = z.infer<typeof MessageKey>;
export type SignalDeclaration = z.infer<typeof SignalDeclaration>;
export type GameManifest = z.infer<typeof GameManifest>;
