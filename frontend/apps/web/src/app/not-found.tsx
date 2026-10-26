'use client';

import { usePathname } from 'next/navigation';
import { ChildScreen } from '../child/ChildScreen';
import { DEFAULT_BAND } from '../child/config';
import { NotFound } from '../shared/NotFound';

/** An unknown address. The link stays inside the area it was in: the dashboard, or the child area. */
export default function NotFoundPage() {
  const pathname = usePathname();
  if (pathname === '/parent' || pathname.startsWith('/parent/')) {
    return <NotFound homePath="/parent" />;
  }
  return (
    <ChildScreen band={DEFAULT_BAND}>
      <NotFound homePath="/" />
    </ChildScreen>
  );
}
