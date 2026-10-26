import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

const profiles = {
  profiles: [
    {
      id: '0192f4c1-0000-7000-8000-00000000c001',
      nickname: 'Robin',
      avatarId: 'purple-star',
      hasPicturePin: false,
    },
  ],
};

function respondWith(result: Response | Error) {
  const fetchMock = vi.fn(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('returns the response once it matches its contract', async () => {
    respondWith(Response.json(profiles));

    expect(await api.profiles()).toEqual(profiles);
  });

  it('sends JSON for writes', async () => {
    const fetchMock = respondWith(Response.json({ accepted: 0, duplicates: 0 }));

    await api.sendEvents({ events: [] });

    expect(fetchMock).toHaveBeenCalledWith('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"events":[]}',
    });
  });

  it.each([
    ['a network error', new TypeError('Failed to fetch'), 'offline'],
    ['a 500', Response.json({}, { status: 500 }), 'server'],
    ['a 404', Response.json({}, { status: 404 }), 'not-found'],
    ['a 403', Response.json({}, { status: 403 }), 'refused'],
    ['a body that breaks the contract', Response.json({ profiles: 'none' }), 'invalid-response'],
    ['a body that is not JSON', new Response('<html>'), 'invalid-response'],
  ])('turns %s into a %s error', async (_case, result, kind) => {
    respondWith(result);

    await expect(api.profiles()).rejects.toMatchObject({ name: 'ApiRequestError', kind });
  });
});
