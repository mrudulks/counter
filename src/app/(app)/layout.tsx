import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { Loading } from '@/components/ui';

// Everything under (app) is client-rendered behind sign-in; Suspense lets
// the URL-reading hooks resolve at runtime instead of blocking prerender.
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <Suspense fallback={<Loading />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
