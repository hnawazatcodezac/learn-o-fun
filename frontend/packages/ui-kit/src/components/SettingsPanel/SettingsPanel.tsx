import type { PlaySettings } from '@learnofun/contracts';
import { useId } from 'react';
import { TEXT_SCALES } from '../../appearance/AppearanceProvider';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { COVERING_INPUT_CLASSES } from '../pieces';
import { Switch } from '../Switch/Switch';

const GROUP_CLASSES =
  'lf-settings__group m-0 flex flex-col gap-2 rounded-ui border border-line bg-surface-raised p-4';

const LEGEND_CLASSES = 'lf-settings__legend px-2 font-ui-heading text-ui-heading';

/**
 * An option in a row where exactly one is chosen, such as the text size. The chosen one takes the
 * selected state and is underlined, so it never relies on colour alone.
 */
const OPTION_CLASSES =
  'lf-choice__option relative grid min-block-ui-target min-inline-ui-target cursor-pointer place-items-center rounded-ui border-2 border-line-strong bg-surface-raised px-4 font-ui-label font-label text-ink has-checked:border-ui-selected-border has-checked:bg-ui-selected has-checked:text-ui-on-selected has-checked:underline has-checked:underline-offset-[0.2em] has-focus-visible:shadow-focus-ring has-focus-visible:outline-none';

export interface SettingsPanelProps {
  value: PlaySettings;
  onChange: (next: PlaySettings) => void;
}

/**
 * The child's sound, play and reading settings (plan 8.6). Shown to adults only, behind the
 * parental gate (CLAUDE.md rule 6).
 */
export function SettingsPanel({ value, onChange }: SettingsPanelProps) {
  const { t, format } = useI18n();
  const textSizeName = useId();

  const set =
    <K extends keyof PlaySettings>(key: K) =>
    (next: PlaySettings[K]) => {
      onChange({ ...value, [key]: next });
    };

  return (
    <div className="lf-settings flex flex-col gap-5 max-inline-ui-settings">
      <fieldset className={GROUP_CLASSES}>
        <legend className={LEGEND_CLASSES}>{t('ui.settings.groups.sound')}</legend>
        <Switch label={t('ui.settings.sound')} checked={value.sound} onChange={set('sound')} />
        <Switch label={t('ui.settings.music')} checked={value.music} onChange={set('music')} />
        <Switch label={t('ui.settings.voice')} checked={value.voice} onChange={set('voice')} />
      </fieldset>

      <fieldset className={GROUP_CLASSES}>
        <legend className={LEGEND_CLASSES}>{t('ui.settings.groups.play')}</legend>
        <Switch label={t('ui.settings.timers')} checked={value.timers} onChange={set('timers')} />
        <Switch
          label={t('ui.settings.reducedMotion')}
          checked={value.reducedMotion}
          onChange={set('reducedMotion')}
        />
      </fieldset>

      <fieldset className={GROUP_CLASSES}>
        <legend className={LEGEND_CLASSES}>{t('ui.settings.groups.reading')}</legend>
        <fieldset className="lf-choice m-0 border-0 p-0">
          <legend className="lf-choice__legend mbe-2 p-0">{t('ui.settings.textSize')}</legend>
          <div className="lf-choice__options flex flex-wrap gap-ui-gap">
            {TEXT_SCALES.map((scale) => (
              <label key={scale} className={OPTION_CLASSES}>
                <input
                  type="radio"
                  className={cn('lf-choice__input', COVERING_INPUT_CLASSES)}
                  name={textSizeName}
                  value={scale}
                  checked={value.textScale === scale}
                  onChange={() => {
                    set('textScale')(scale);
                  }}
                />
                <span>{format.number(scale, { style: 'percent' })}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Switch
          label={t('ui.settings.highContrast')}
          checked={value.highContrast}
          onChange={set('highContrast')}
        />
        <Switch
          label={t('ui.settings.dyslexiaFont')}
          checked={value.dyslexiaFont}
          onChange={set('dyslexiaFont')}
        />
      </fieldset>
    </div>
  );
}
