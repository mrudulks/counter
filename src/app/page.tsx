'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HOME_BY_ROLE, useSession } from '@/lib/session';
import { Loading } from '@/components/ui';

export default function Home() {
  const { user, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready) router.replace(user ? HOME_BY_ROLE[user.role] : '/login');
  }, [ready, user, router]);

  return <Loading />;
}
