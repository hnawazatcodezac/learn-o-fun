import type { FamilyResponse } from '@learnofun/contracts';
import { useCallback } from 'react';
import { api } from '../api/client';
import { useApi, type ApiResult } from '../api/useApi';
import { useParentSession } from './parent-session';

/** The family the dashboard shows, with its children and what its plan includes. */
export function useFamily(): ApiResult<FamilyResponse> {
  const { familyId } = useParentSession();
  const load = useCallback(
    () =>
      familyId === undefined
        ? Promise.reject(new Error('No family is chosen'))
        : api.family(familyId),
    [familyId],
  );
  return useApi(load);
}
