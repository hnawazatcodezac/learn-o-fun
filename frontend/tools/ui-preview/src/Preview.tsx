import { LOCALES, PSEUDO_LOCALES, pickLocale } from '@learnofun/i18n';
import { AppearanceProvider, TEXT_SCALES, THEMES, useI18n } from '@learnofun/ui-kit';
import { useEffect, useState } from 'react';
import { BANDS, COMPONENTS } from './matrix';
import { readParams, writeParams, type PreviewParams } from './params';
import { PreviewContext } from './PreviewContext';
import { PREVIEWS } from './previews';
import { ToolbarSelect } from './ToolbarSelect';

/** A checkbox and its words, as tall as the toolbar's menus. */
const TOGGLE_CLASSES = 'flex min-block-ui-tool-control items-center gap-2';

const CHECKBOX_CLASSES = 'm-0 inline-ui-tool-check block-ui-tool-check';

const PREVIEW_LOCALES = [...LOCALES, ...PSEUDO_LOCALES];

export function Preview() {
  const { t, locale, changeLocale, format } = useI18n();
  const [params, setParams] = useState(() => readParams(window.location.search));
  const title = t('dev.preview.title');
  const Component = PREVIEWS[params.component];

  useEffect(() => {
    document.title = title;
  }, [title]);

  const update = (change: Partial<PreviewParams>) => {
    const next = { ...params, ...change };
    setParams(next);
    writeParams(next);
  };

  return (
    <AppearanceProvider
      band={params.band === 'parent' ? undefined : params.band}
      theme={params.theme}
      reducedMotion={params.reducedMotion}
      textScale={params.textScale}
      font={params.font}
    >
      <header
        className="flex flex-wrap items-end gap-4 border-be border-line-strong bg-surface-raised px-5 py-3 text-size-ui-small [&[hidden]]:hidden"
        hidden={!params.showToolbar}
      >
        <ToolbarSelect
          label={t('dev.preview.controls.component')}
          value={params.component}
          options={COMPONENTS.map((id) => ({
            value: id,
            label: t(`dev.preview.components.${id}`),
          }))}
          onChange={(component) => {
            update({ component });
          }}
        />
        <ToolbarSelect
          label={t('dev.preview.controls.band')}
          value={params.band}
          options={BANDS.map((id) => ({ value: id, label: t(`dev.preview.bands.${id}`) }))}
          onChange={(band) => {
            update({ band });
          }}
        />
        <ToolbarSelect
          label={t('dev.preview.controls.theme')}
          value={params.theme}
          options={THEMES.map((id) => ({ value: id, label: t(`dev.preview.themes.${id}`) }))}
          onChange={(theme) => {
            update({ theme });
          }}
        />
        <ToolbarSelect
          label={t('dev.localeSwitcher.label')}
          value={locale}
          options={PREVIEW_LOCALES.map((id) => ({
            value: id,
            label: t(`dev.localeSwitcher.locales.${id}`),
          }))}
          onChange={(next) => {
            changeLocale(pickLocale(next, { allowPseudo: true }));
          }}
        />
        <ToolbarSelect
          label={t('dev.preview.controls.textSize')}
          value={String(params.textScale)}
          options={TEXT_SCALES.map((scale) => ({
            value: String(scale),
            label: format.number(scale, { style: 'percent' }),
          }))}
          onChange={(value) => {
            update({ textScale: TEXT_SCALES.find((scale) => String(scale) === value) ?? 1 });
          }}
        />
        <label className={TOGGLE_CLASSES}>
          <input
            type="checkbox"
            className={CHECKBOX_CLASSES}
            checked={params.font === 'dyslexia'}
            onChange={(event) => {
              update({ font: event.target.checked ? 'dyslexia' : 'default' });
            }}
          />
          {t('dev.preview.controls.dyslexiaFont')}
        </label>
        <label className={TOGGLE_CLASSES}>
          <input
            type="checkbox"
            className={CHECKBOX_CLASSES}
            checked={params.reducedMotion}
            onChange={(event) => {
              update({ reducedMotion: event.target.checked });
            }}
          />
          {t('dev.preview.controls.reducedMotion')}
        </label>
      </header>
      <main className="px-5 py-6" data-testid="preview-stage">
        <h1 className="mbs-0 mbe-5 text-size-ui-title">
          {t(`dev.preview.components.${params.component}`)}
        </h1>
        <PreviewContext value={{ params, update }}>
          {/* Remount on a locale change, so previews holding text in state show the new locale. */}
          <Component key={locale} />
        </PreviewContext>
      </main>
    </AppearanceProvider>
  );
}
