import { Button, useI18n } from '@learnofun/ui-kit';
import { useEffect, useId, useState } from 'react';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { LoadState } from '../shared/LoadState';
import { useNavigate, useQueryParam } from '../shared/navigation';
import { useParentSession } from './parent-session';

/**
 * /parent/login: the mock sign-in (ADR 0025). It lists the fixture accounts and signs in as the
 * one chosen, with no password. Real sign-in, sign-up and consent come with the backend.
 */
export function ParentLogin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const from = useQueryParam('next');
  const { signIn } = useParentSession();
  const accounts = useApi(api.mockAccounts);
  const [failed, setFailed] = useState(false);
  const title = t('parent.login.title');
  const listId = useId();

  useEffect(() => {
    document.title = title;
  }, [title]);

  // Back to the dashboard page that asked for sign-in, if any, and never outside the dashboard.
  const next = from.startsWith('/parent') ? from : '/parent';

  const choose = (accountId: string) => {
    setFailed(false);
    signIn(accountId).then(
      () => {
        void navigate(next, { replace: true });
      },
      () => {
        setFailed(true);
      },
    );
  };

  return (
    <main className="parent-login" data-testid="parent-login">
      <p className="parent-wordmark">{t('parent.wordmark')}</p>
      <h1 className="parent-page__title">{title}</h1>
      <p>{t('parent.login.mockNote')}</p>
      <h2 className="parent-page__heading" id={listId}>
        {t('parent.login.accounts')}
      </h2>
      <LoadState result={accounts}>
        {({ accounts: list }) => (
          <ul className="parent-login__accounts" aria-labelledby={listId}>
            {list.map((account) => (
              <li key={account.id}>
                <Button
                  onClick={() => {
                    choose(account.id);
                  }}
                >
                  {/* The family's own text, never translated. */}
                  <span data-user-content>{account.displayName}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </LoadState>
      {failed && <p role="alert">{t('common.loadError.title')}</p>}
    </main>
  );
}
