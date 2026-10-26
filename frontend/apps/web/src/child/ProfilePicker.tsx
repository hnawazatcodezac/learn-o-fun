import { PICTURE_PIN_LENGTH, type PinPicture, type ProfileSummary } from '@learnofun/contracts';
import {
  AVATARS,
  Avatar,
  Button,
  Dialog,
  PicturePinPad,
  isAvatarId,
  useI18n,
} from '@learnofun/ui-kit';
import { useEffect, useId, useState } from 'react';
import { useNavigate } from '../shared/navigation';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { LoadState } from '../shared/LoadState';
import { useChildMode } from './child-mode';
import { ChildGate } from './ChildGate';
import { ChildScreen } from './ChildScreen';
import { DEFAULT_BAND } from './config';
import { childApi } from './sync';

/** After this many wrong tries, the PIN dialog suggests asking a grown-up. */
const MISSES_BEFORE_HELP = 3;

/**
 * Who's playing? (plan 8.1): each child on the device by avatar and nickname. A profile with a
 * picture PIN asks for it first (ADR 0018). The way to the parent dashboard is behind the
 * parental gate (CLAUDE.md rule 6).
 */
export function ProfilePicker() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { choose } = useChildMode();
  const profiles = useApi(childApi.profiles);
  const [unlocking, setUnlocking] = useState<ProfileSummary>();
  const [gateOpen, setGateOpen] = useState(false);
  const headingId = useId();
  const title = t('child.title');

  useEffect(() => {
    document.title = title;
  }, [title]);

  const enter = (childId: string) => {
    choose(childId);
    void navigate('/today');
  };

  return (
    <ChildScreen band={DEFAULT_BAND}>
      <main className="placeholder" data-testid="child-root">
        <div className="placeholder__row">
          <div
            className="placeholder__shape placeholder__shape--child"
            data-testid="placeholder-shape"
            aria-hidden="true"
          />
          <h1 className="placeholder__title">{title}</h1>
        </div>
        <section className="placeholder__section" aria-labelledby={headingId}>
          <h2 id={headingId} className="placeholder__subtitle">
            {t('child.profiles.title')}
          </h2>
          <LoadState result={profiles}>
            {(data) => (
              <ul className="profile-picker">
                {data.profiles.map((profile) => (
                  <li key={profile.id}>
                    <button
                      type="button"
                      className="profile-picker__choice"
                      onClick={() => {
                        if (profile.hasPicturePin) setUnlocking(profile);
                        else enter(profile.id);
                      }}
                    >
                      <span className="profile-picker__avatar">
                        <Avatar id={isAvatarId(profile.avatarId) ? profile.avatarId : AVATARS[0]} />
                      </span>
                      <span className="profile-picker__name" data-user-content>
                        {profile.nickname}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </LoadState>
          <Button
            variant="secondary"
            onClick={() => {
              setGateOpen(true);
            }}
          >
            {t('child.picker.grownUps')}
          </Button>
        </section>
      </main>
      <ChildGate
        band={DEFAULT_BAND}
        open={gateOpen}
        onPass={() => {
          setGateOpen(false);
          void navigate('/parent');
        }}
        onCancel={() => {
          setGateOpen(false);
        }}
      />
      {unlocking && (
        <PinEntry
          profile={unlocking}
          onUnlocked={() => {
            enter(unlocking.id);
          }}
          onClose={() => {
            setUnlocking(undefined);
          }}
        />
      )}
    </ChildScreen>
  );
}

/** Asks for a profile's picture PIN, which the API checks (ADR 0018). */
function PinEntry({
  profile,
  onUnlocked,
  onClose,
}: {
  profile: ProfileSummary;
  onUnlocked: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState<PinPicture[]>([]);
  const [checking, setChecking] = useState(false);
  const [misses, setMisses] = useState(0);
  const [message, setMessage] = useState<string>();
  const title = t('child.picker.pinTitle', { nickname: profile.nickname });

  const change = (next: PinPicture[]) => {
    setPin(next);
    if (next.length < PICTURE_PIN_LENGTH) return;
    setChecking(true);
    api.unlockProfile(profile.id, next).then(
      ({ unlocked }) => {
        setChecking(false);
        if (unlocked) {
          onUnlocked();
          return;
        }
        setPin([]);
        setMisses(misses + 1);
        setMessage(
          t(misses + 1 >= MISSES_BEFORE_HELP ? 'child.picker.pinHelp' : 'child.picker.pinWrong'),
        );
      },
      () => {
        setChecking(false);
        setPin([]);
        setMessage(t('child.picker.pinUnavailable'));
      },
    );
  };

  return (
    <Dialog open title={title} onClose={onClose}>
      <div className="pin-entry">
        <p>{t('child.picker.pinPrompt')}</p>
        <PicturePinPad value={pin} onChange={change} label={title} disabled={checking} />
        {message && (
          <p className="pin-entry__message" role="alert">
            {message}
          </p>
        )}
      </div>
    </Dialog>
  );
}
