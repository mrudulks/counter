'use client';

import Link from 'next/link';
import { useSession } from '@/lib/session';
import type { Role } from '@/lib/types';
import { Empty } from './ui';

/** Renders children only for allowed roles and, when `scoped`, once a restaurant is active. */
export function Guard({ roles, scoped = true, children }: { roles: Role[]; scoped?: boolean; children: React.ReactNode }) {
  const { user, restaurant } = useSession();
  if (!user) return null;

  if (!roles.includes(user.role)) {
    return <Empty title="This page isn’t available for your role">Use the menu to go to a page you can work in.</Empty>;
  }
  if (scoped && !restaurant) {
    return (
      <Empty title="Pick a restaurant first">
        {user.role === 'superadmin' ? (
          <>
            Choose one from <Link href="/restaurants" className="font-semibold text-teal underline">Restaurants</Link> to work in it.
          </>
        ) : (
          'Your account isn’t linked to a restaurant. Ask your administrator to fix it.'
        )}
      </Empty>
    );
  }
  return <>{children}</>;
}
