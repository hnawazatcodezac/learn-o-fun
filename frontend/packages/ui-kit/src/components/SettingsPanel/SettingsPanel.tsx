import type { PlaySettings } from '@learnofun/contracts';
import { useId } from 'react';
import { TEXT_SCALES } from '../../appearance/AppearanceProvider';
import { useI18n } from '../../i18n/useI18n';
import { Switch } from '../Switch/Switch';

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
    <div className="lf-settings">
      <fieldset className="lf-settings__group">
        <legend className="lf-settings__legend">{t('ui.settings.groups.sound')}</legend>
        <Switch label={t('ui.settings.sound')} checked={value.sound} onChange={set('sound')} />
        <Switch label={t('ui.settings.music')} checked={value.music} onChange={set('music')} />
        <Switch label={t('ui.settings.voice')} checked={value.voice} onChange={set('voice')} />
      </fieldset>

      <fieldset className="lf-settings__group">
        <legend className="lf-settings__legend">{t('ui.settings.groups.play')}</legend>
        <Switch label={t('ui.settings.timers')} checked={value.timers} onChange={set('timers')} />
        <Switch
          label={t('ui.settings.reducedMotion')}
          checked={value.reducedMotion}
          onChange={set('reducedMotion')}
        />
      </fieldset>

      <fieldset className="lf-settings__group">
        <legend className="lf-settings__legend">{t('ui.settings.groups.reading')}</legend>
        <fieldset className="lf-choice">
          <legend className="lf-choice__legend">{t('ui.settings.textSize')}</legend>
          <div className="lf-choice__options">
            {TEXT_SCALES.map((scale) => (
              <label key={scale} className="lf-choice__option">
                <input
                  type="radio"
                  className="lf-choice__input"
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
