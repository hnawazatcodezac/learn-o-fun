import { getResponse, type RequestHandler } from 'msw';

type Fetch = typeof fetch;

const urlOf = (input: Parameters<Fetch>[0]) =>
  input instanceof Request ? input.url : input instanceof URL ? input.href : input;

/**
 * A `fetch` that answers `/api` requests with the mock API's handlers inside the page, and sends
 * everything else on to `pageFetch` (ADR 0017). For where browsers allow no service worker, such
 * as a tablet reaching the development server over plain HTTP. A handler's network error, the
 * offline mode, makes the request fail as a real one would.
 */
export function createInPageFetch(
  handlers: readonly RequestHandler[],
  pageFetch: Fetch,
  base: string,
): Fetch {
  return async (input, init) => {
    if (!new URL(urlOf(input), base).pathname.startsWith('/api/')) return pageFetch(input, init);
    const request = new Request(
      new URL(urlOf(input), base),
      input instanceof Request ? input : init,
    );
    const response = await getResponse([...handlers], request);
    if (!response) return pageFetch(input, init);
    if (response.type === 'error') throw new TypeError('Failed to fetch');
    return response;
  };
}
