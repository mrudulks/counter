'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/session';
import { NAV } from '@/components/nav';
import { Loading } from '@/components/ui';
import { OrderNotifier } from '@/components/OrderNotifier';
import { useRealtimeStatus } from '@/lib/realtime';

const ROLE_LABEL = { superadmin: 'Super admin', admin: 'Admin', staff: 'Floor staff', kitchen: 'Kitchen' };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, restaurant, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const live = useRealtimeStatus();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) return <Loading />;

  const items = NAV.filter((n) => n.roles.includes(user.role) && (!n.scoped || restaurant));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 z-30 bg-ink text-steel lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:pb-4 lg:pt-6">
          <div className="min-w-0">
            <Link href="/" className="block text-2xl font-black tracking-tight [font-stretch:70%]">
              Counter
            </Link>
            <p className="truncate text-sm text-steel/70">
              {restaurant?.name ?? (user.role === 'superadmin' ? 'No restaurant selected' : '—')}
            </p>
            {restaurant && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-steel/60" title="Orders update instantly while live">
                <span className={`h-2 w-2 rounded-full ${live ? 'bg-free' : 'bg-seated'}`} aria-hidden />
                {live ? 'Live updates on' : 'Reconnecting…'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1 text-sm lg:hidden">
            <Link href="/account" className="rounded-md px-3 py-1.5 text-steel/80 hover:bg-white/10">Account</Link>
            <button onClick={logout} className="rounded-md px-3 py-1.5 text-steel/80 hover:bg-white/10">Sign out</button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3" aria-label="Main">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
                  active ? 'bg-steel text-ink' : 'text-steel/80 hover:bg-white/10 hover:text-steel'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 px-5 py-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="text-sm text-steel/70">{ROLE_LABEL[user.role]}</p>
          <div className="mt-3 flex gap-3 text-sm">
            <Link href="/account" className="text-steel/80 underline-offset-2 hover:underline">Account</Link>
            <button onClick={logout} className="text-steel/80 underline-offset-2 hover:underline">Sign out</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      {restaurant && <OrderNotifier />}
    </div>
  );
}
