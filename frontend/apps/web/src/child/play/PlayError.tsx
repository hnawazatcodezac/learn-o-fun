import { Button, useI18n } from '@learnofun/ui-kit';
import { Component, type ReactNode } from 'react';
import { useNavigate } from '../../shared/navigation';

/** Shown when a game stops working: no blame and no detail, just the way back. */
export function PlayError({ exitTo }: { exitTo: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center [&_p]:m-0"
      role="alert"
      data-testid="play-error"
    >
      <p className="text-size-ui-heading font-label">{t('child.play.error.title')}</p>
      <p>{t('child.play.error.body')}</p>
      <Button
        autoFocus
        onClick={() => {
          navigate(exitTo);
        }}
      >
        {t('child.play.leave')}
      </Button>
    </div>
  );
}

interface PlayErrorBoundaryProps {
  exitTo: string;
  children: ReactNode;
}

/** Catches a render error around the game shell and shows the way back (plan 6.1). */
export class PlayErrorBoundary extends Component<PlayErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? <PlayError exitTo={this.props.exitTo} /> : this.props.children;
  }
}
