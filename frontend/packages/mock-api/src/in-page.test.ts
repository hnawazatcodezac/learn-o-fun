import { CatalogResponse } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { NORMAL_CONTROLS, type MockControls } from './controls';
import { seedData } from './data';
import { MockDatabase } from './database';
import { createHandlers } from './handlers';
import { createInPageFetch } from './in-page';
import { memoryStorage } from './storage';

const BASE = 'http://192.168.1.20:5173/play/hop-line-add-within-20';

/** An in-page fetch over the mock data, and a record of what it sent on to the network. */
function setup(controls: MockControls = NORMAL_CONTROLS) {
  const passedOn: string[] = [];
  const pageFetch: typeof fetch = (input) => {
    passedOn.push(input instanceof Request ? input.url : input.toString());
    return Promise.resolve(new Response('from the network'));
  };
  const handlers = createHandlers({
    db: new MockDatabase(seedData, memoryStorage()),
    controls: () => controls,
  });
  return { fetch: createInPageFetch(handlers, pageFetch, BASE), passedOn };
}

describe('createInPageFetch', () => {
  it('answers /api requests from the mock data, without the network', async () => {
    const { fetch, passedOn } = setup();

    const response = await fetch('/api/catalog');

    expect(response.status).toBe(200);
    expect(CatalogResponse.parse(await response.json()).itemTemplates).toHaveLength(6);
    expect(passedOn).toEqual([]);
  });

  it('takes requests with a body, such as starting a session', async () => {
    const { fetch } = setup();

    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'not-a-uuid' }),
    });

    // The mock API checked the body against the contract and refused it.
    expect(response.status).toBe(400);
  });

  it('sends everything outside /api on to the network', async () => {
    const { fetch, passedOn } = setup();

    expect(await (await fetch('/src/main.tsx')).text()).toBe('from the network');
    expect(passedOn).toEqual(['/src/main.tsx']);
  });

  it('fails like a real request when the mock API is set to offline', async () => {
    const { fetch } = setup({ ...NORMAL_CONTROLS, failure: 'offline' });

    await expect(fetch('/api/catalog')).rejects.toThrow(TypeError);
  });
});
