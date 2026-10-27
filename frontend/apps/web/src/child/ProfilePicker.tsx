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
import { PLACEHOLDER_CLASSES, PLACEHOLDER_TITLE_CLASSES } from '../shared/page-classes';
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
    navigate('/today');
  };

  return (
    <ChildScreen band={DEFAULT_BAND}>
      <main className={PLACEHOLDER_CLASSES} data-testid="child-root">
        <div className="flex items-center gap-5">
          <div
            className="flex-none rounded-full bg-sun block-ui-placeholder-shape inline-ui-placeholder-shape"
            data-testid="placeholder-shape"
            aria-hidden="true"
          />
          <h1 className={PLACEHOLDER_TITLE_CLASSES}>{title}</h1>
        </div>
        <section className="mbs-6 flex flex-col items-center gap-3" aria-labelledby={headingId}>
          <h2 id={headingId} className="m-0 text-size-ui-heading">
            {t('child.profiles.title')}
          </h2>
          <LoadState result={profiles}>
            {(data) => (
              // Who's playing? Each child is one large button: avatar above nickname.
              <ul className="m-0 flex list-none flex-wrap justify-center gap-5 p-0">
                {data.profiles.map((profile) => (
                  <li key={profile.id}>
                    <button
                      type="button"
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-ui border-2 border-line-strong bg-surface-raised p-3 font-inherit text-ink min-inline-ui-profile-choice hover:border-ui-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
                      onClick={() => {
                        if (profile.hasPicturePin) setUnlocking(profile);
                        else enter(profile.id);
                      }}
                    >
                      <span className="block-ui-profile-avatar inline-ui-profile-avatar">
                        <Avatar id={isAvatarId(profile.avatarId) ? profile.avatarId : AVATARS[0]} />
                      </span>
                      <span className="font-label" data-user-content>
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
          navigate('/parent');
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
      <div className="flex flex-col gap-3 [&_p]:m-0">
        <p>{t('child.picker.pinPrompt')}</p>
        <PicturePinPad value={pin} onChange={change} label={title} disabled={checking} />
        {message && (
          <p className="font-label" role="alert">
            {message}
          </p>
        )}
      </div>
    </Dialog>
  );
}
