import { PICTURE_PIN_LENGTH, type PicturePin, type PinPicture } from '@learnofun/contracts';
import { Button, Dialog, PicturePinPad, SettingsPanel, useI18n } from '@learnofun/ui-kit';
import { useId, useState } from 'react';
import { useNavigate } from '../shared/navigation';
import { api } from '../api/client';
import { useChildMode } from './child-mode';

/**
 * A child's settings, for a grown-up who has passed the parental gate: play settings, the
 * picture PIN (ADR 0018), more time today (ADR 0022) and the way to the parent dashboard.
 */
export function GrownUpSettings({
  open,
  nickname,
  onClose,
}: {
  open: boolean;
  nickname: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { settings, setSettings } = useChildMode();

  return (
    <Dialog open={open} title={t('child.settings.title', { nickname })} onClose={onClose}>
      {/* Mounted only while open, so the picture PIN steps start fresh each time. */}
      {open && (
        <div className="grown-up-settings">
          <SettingsPanel value={settings} onChange={setSettings} />
          <TimeTodaySettings nickname={nickname} />
          <PicturePinSettings nickname={nickname} />
          <div className="grown-up-settings__actions">
            <Button
              variant="secondary"
              onClick={() => {
                void navigate('/parent');
              }}
            >
              {t('child.settings.parentDashboard')}
            </Button>
            <Button onClick={onClose}>{t('child.settings.done')}</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/**
 * Today's play so far, and the way to allow one more session today: the child's session length
 * again, for today only (ADR 0022).
 */
function TimeTodaySettings({ nickname }: { nickname: string }) {
  const { t } = useI18n();
  const { snapshot, setPlayToday } = useChildMode();
  const headingId = useId();
  const [allowed, setAllowed] = useState<number>();
  const [sending, setSending] = useState(false);
  const data = snapshot.status === 'ready' ? snapshot.data : undefined;
  if (!data) return null;
  const minutes = data.settings.sessionMinutes;
  const { playedSeconds, allowedSeconds } = data.playToday;

  const allow = () => {
    setSending(true);
    api
      .extraTime(data.child.id, minutes)
      .then((next) => {
        setPlayToday(next);
        setAllowed(minutes);
      })
      .catch(() => undefined)
      .finally(() => {
        setSending(false);
      });
  };

  return (
    <section className="grown-up-settings__time" aria-labelledby={headingId}>
      <h3 id={headingId} className="grown-up-settings__heading">
        {t('child.settings.time.title')}
      </h3>
      <p>
        {t('child.settings.time.played', {
          nickname,
          played: Math.floor(playedSeconds / 60),
          allowed: Math.floor(allowedSeconds / 60),
        })}
      </p>
      <p role="status">
        {allowed === undefined
          ? null
          : t('child.settings.time.allowed', { nickname, minutes: allowed })}
      </p>
      <div className="grown-up-settings__actions">
        <Button variant="secondary" disabled={sending} onClick={allow}>
          {t('child.settings.time.allow', { minutes })}
        </Button>
      </div>
    </section>
  );
}

type Step = { kind: 'view' } | { kind: 'choose' } | { kind: 'confirm'; first: PicturePin };

/** Adds, changes or removes the picture PIN: three pictures, chosen twice to be sure. */
function PicturePinSettings({ nickname }: { nickname: string }) {
  const { t } = useI18n();
  const { snapshot, setPicturePin } = useChildMode();
  const headingId = useId();
  const [step, setStep] = useState<Step>({ kind: 'view' });
  const [pin, setPin] = useState<PinPicture[]>([]);
  const [message, setMessage] = useState<string>();
  const hasPin = snapshot.status === 'ready' && snapshot.data?.settings.picturePin !== undefined;

  const start = () => {
    setPin([]);
    setMessage(undefined);
    setStep({ kind: 'choose' });
  };
  const change = (next: PinPicture[]) => {
    setPin(next);
    if (next.length < PICTURE_PIN_LENGTH) return;
    setPin([]);
    if (step.kind === 'choose') {
      setStep({ kind: 'confirm', first: next });
      return;
    }
    if (step.kind !== 'confirm') return;
    if (step.first.join(' ') === next.join(' ')) {
      setPicturePin(next);
      setMessage(t('child.settings.pin.saved'));
      setStep({ kind: 'view' });
    } else {
      setMessage(t('child.settings.pin.mismatch'));
      setStep({ kind: 'choose' });
    }
  };

  return (
    <section className="grown-up-settings__pin" aria-labelledby={headingId}>
      <h3 id={headingId} className="grown-up-settings__heading">
        {t('child.settings.pin.title')}
      </h3>
      {message && <p role="status">{message}</p>}
      {step.kind === 'view' ? (
        <>
          <p>{t(hasPin ? 'child.settings.pin.on' : 'child.settings.pin.off', { nickname })}</p>
          <div className="grown-up-settings__actions">
            <Button variant="secondary" onClick={start}>
              {t(hasPin ? 'child.settings.pin.change' : 'child.settings.pin.add')}
            </Button>
            {hasPin && (
              <Button
                variant="secondary"
                onClick={() => {
                  setPicturePin(undefined);
                  setMessage(t('child.settings.pin.removed'));
                }}
              >
                {t('child.settings.pin.remove')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            {t(step.kind === 'choose' ? 'child.settings.pin.choose' : 'child.settings.pin.confirm')}
          </p>
          <PicturePinPad value={pin} onChange={change} label={t('child.settings.pin.padLabel')} />
          <Button
            variant="secondary"
            onClick={() => {
              setStep({ kind: 'view' });
              setMessage(undefined);
            }}
          >
            {t('child.settings.pin.cancel')}
          </Button>
        </>
      )}
    </section>
  );
}
