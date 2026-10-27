import type { ParentSessionResponse } from '@learnofun/contracts';
import { Button, useI18n } from '@learnofun/ui-kit';
import { useId, type ReactNode } from 'react';
import { LoadState } from '../shared/LoadState';
import { Navigate, NavLink, useLocation } from '../shared/navigation';
import { useParentSession } from './parent-session';
import { CONTROL_CLASSES, PAGE_CLASSES, WORDMARK_CLASSES } from './classes';

/** The dashboard's pages, in the order of its navigation. */
const PAGES = [
  { to: '/parent', key: 'parent.nav.home', end: true },
  { to: '/parent/plan', key: 'parent.nav.plan', end: false },
] as const;

/**
 * Every signed-in page of the parent dashboard: the name, the family switcher when the parent
 * belongs to more than one family, the navigation and the way to sign out. Signed out, it goes to
 * the mock sign-in (ADR 0025).
 */
export function ParentLayout({ children }: { children: ReactNode }) {
  const { session } = useParentSession();
  const location = useLocation();
  // Back here after signing in: the page asked for, with its query string.
  const next = new URLSearchParams({ next: `${location.pathname}${location.search}` });

  return (
    <LoadState result={session}>
      {({ session: signedIn }) =>
        signedIn ? (
          <SignedIn session={signedIn}>{children}</SignedIn>
        ) : (
          <Navigate to={`/parent/login?${next.toString()}`} />
        )
      }
    </LoadState>
  );
}

function SignedIn({ session, children }: { session: ParentSessionResponse; children: ReactNode }) {
  const { t } = useI18n();
  const { familyId, chooseFamily, signOut } = useParentSession();
  const switcherId = useId();

  return (
    <div className="flex flex-col min-block-dvh [&_a]:text-action" data-testid="parent-root">
      <header className="flex flex-wrap items-center gap-4 border-be border-line bg-surface-raised px-5 py-3">
        <p className={WORDMARK_CLASSES}>{t('parent.wordmark')}</p>
        {session.families.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={switcherId}>{t('parent.family.switch')}</label>
            <select
              className={CONTROL_CLASSES}
              id={switcherId}
              value={familyId}
              onChange={(event) => {
                chooseFamily(event.target.value);
              }}
            >
              {session.families.map(({ family, ownerName }) => (
                <option key={family.id} value={family.id}>
                  {t('parent.family.name', { owner: ownerName })}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="ms-auto flex flex-wrap items-center gap-2 text-ink-muted">
          <span>{t('parent.account.signedInAs', { name: session.account.displayName })}</span>
          <Button
            variant="secondary"
            onClick={() => {
              void signOut();
            }}
          >
            {t('parent.account.signOut')}
          </Button>
        </div>
      </header>
      <nav aria-label={t('parent.nav.label')}>
        <ul className="m-0 flex list-none flex-wrap gap-2 px-5 py-2">
          {PAGES.map((page) => (
            <li key={page.to}>
              <NavLink
                to={page.to}
                end={page.end}
                className="inline-flex items-center rounded-md px-3 font-label text-action no-underline min-block-target-family hover:underline aria-[current=page]:bg-ui-selected aria-[current=page]:text-ui-on-selected aria-[current=page]:underline aria-[current=page]:underline-offset-[0.2em]"
              >
                {t(page.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className={PAGE_CLASSES}>{children}</main>
    </div>
  );
}
