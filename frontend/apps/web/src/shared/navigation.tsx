'use client';

import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useCallback, useEffect, type ComponentProps } from 'react';

/**
 * The app's navigation, on Next.js's router (ADR 0042). The screens call it as they called the
 * router before, so a move to another page reads the same everywhere. A static export has no
 * route segments with runtime IDs: an ID travels in the query string, read with `useQueryParam`.
 */

/** Goes to another page of the app, or replaces the current one in the history. */
export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string, { replace = false }: { replace?: boolean } = {}) => {
      if (replace) router.replace(to);
      else router.push(to);
    },
    [router],
  );
}

/** The query string, as `const [search] = useSearchParams()`. */
export function useSearchParams() {
  return [useNextSearchParams()] as const;
}

/** One value from the query string, such as the `?id=` of the child a page is about. */
export function useQueryParam(name: string): string {
  return useNextSearchParams().get(name) ?? '';
}

/** The path and query string of the page on screen. */
export function useLocation() {
  const pathname = usePathname();
  const search = useNextSearchParams().toString();
  return { pathname, search: search ? `?${search}` : '' };
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string };

/** A link to another page of the app. */
export function Link({ to, ...props }: LinkProps) {
  return <NextLink href={to} {...props} />;
}

/**
 * A navigation link that says when it is the page on screen (`aria-current="page"`): only on that
 * exact page with `end`, else on it and on the pages below it.
 */
export function NavLink({ to, end = false, ...props }: LinkProps & { end?: boolean }) {
  const pathname = usePathname();
  const current = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return <NextLink href={to} aria-current={current ? 'page' : undefined} {...props} />;
}

/** Replaces the page on screen with another as soon as it is shown. */
export function Navigate({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return null;
}
