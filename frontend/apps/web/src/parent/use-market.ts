import type { MarketConfig } from '@learnofun/contracts';
import { useCallback } from 'react';
import { api } from '../api/client';
import { useApi, type ApiResult } from '../api/useApi';

/** A market's options for child profiles: languages, curriculum and grades (ADR 0026). */
export function useMarket(market: string): ApiResult<MarketConfig> {
  const load = useCallback(() => api.market(market), [market]);
  return useApi(load);
}
