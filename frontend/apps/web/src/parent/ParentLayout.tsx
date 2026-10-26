import type { ParentSessionResponse } from '@learnofun/contracts';
import { Button, useI18n } from '@learnofun/ui-kit';
import { useId, type ReactNode } from 'react';
import { LoadState } from '../shared/LoadState';
import { Navigate, NavLink, useLocation, useNavigate } from '../shared/navigation';
import { useParentSession } from './parent-session';

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
  const navigate = useNavigate();
  const { familyId, chooseFamily, signOut } = useParentSession();
  const switcherId = useId();

  return (
    <div className="parent-shell" data-testid="parent-root">
      <header className="parent-header">
        <p className="parent-wordmark">{t('parent.wordmark')}</p>
        {session.families.length > 1 && (
          <div className="parent-header__family">
            <label htmlFor={switcherId}>{t('parent.family.switch')}</label>
            <select
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
        <div className="parent-header__account">
          <span>{t('parent.account.signedInAs', { name: session.account.displayName })}</span>
          <Button
            variant="secondary"
            onClick={() => {
              void signOut().then(() => navigate('/parent/login'));
            }}
          >
            {t('parent.account.signOut')}
          </Button>
        </div>
      </header>
      <nav className="parent-nav" aria-label={t('parent.nav.label')}>
        <ul>
          {PAGES.map((page) => (
            <li key={page.to}>
              <NavLink to={page.to} end={page.end} className="parent-nav__link">
                {t(page.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="parent-page">{children}</main>
    </div>
  );
}
