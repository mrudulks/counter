'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { useSession } from '@/lib/session';
import { useRealtimeStatus } from '@/lib/realtime';
import { NAV } from '@/components/nav';
import { Loading } from '@/components/ui';
import { OrderNotifier } from '@/components/OrderNotifier';

const ROLE_LABEL = { superadmin: 'Super admin', admin: 'Admin', staff: 'Floor staff', kitchen: 'Kitchen' };

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-extrabold text-white">C</span>
      <span className="text-lg font-extrabold tracking-tight">Counter</span>
    </Link>
  );
}

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
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 z-30 border-b border-line bg-panel lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-6 lg:pb-5 lg:pt-6">
          <Logo />
          <div className="flex items-center gap-1 lg:hidden">
            <Link href="/account" className="rounded-lg p-2 text-ink-soft hover:bg-steel-deep" aria-label="Account">
              <UserRound className="h-5 w-5" />
            </Link>
            <button onClick={logout} className="rounded-lg p-2 text-ink-soft hover:bg-steel-deep" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {restaurant && (
          <div className="mx-4 mb-3 hidden rounded-xl bg-steel px-3 py-2.5 lg:mx-4 lg:block">
            <p className="truncate text-sm font-semibold">{restaurant.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft" title="Orders update instantly while live">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-free' : 'bg-seated'}`} aria-hidden />
              {live ? 'Live updates on' : 'Reconnecting…'}
            </p>
          </div>
        )}

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-4" aria-label="Main">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-steel hover:text-ink'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-line p-4 lg:block">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-ink-soft">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/account" className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs font-medium text-ink-soft hover:text-ink">
              <UserRound className="h-3.5 w-3.5" aria-hidden /> Account
            </Link>
            <button onClick={logout} className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs font-medium text-ink-soft hover:text-chili">
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      {restaurant && <OrderNotifier />}
    </div>
  );
}
