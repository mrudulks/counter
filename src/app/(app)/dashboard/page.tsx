'use client';

import Link from 'next/link';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { useOrderEvents } from '@/lib/realtime';
import { money } from '@/lib/format';
import type { Stats, Table } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { ErrorNote, Loading, PageHeader } from '@/components/ui';

function Dashboard() {
  const scope = useScope();
  const { restaurant } = useSession();
  const stats = useFetch<Stats>(`${scope}/orders/stats/summary`, 30000);
  const tables = useFetch<Table[]>(`${scope}/tables`, 30000);
  useOrderEvents((e) => {
    if (e.type === 'items-updated') return;
    stats.reload();
    tables.reload();
  });

  if (stats.loading) return <Loading />;
  if (stats.error || !stats.data) return <ErrorNote message={stats.error ?? 'Could not load today’s numbers'} />;

  const s = stats.data;
  const seated = tables.data?.filter((t) => t.status === 'occupied').length ?? 0;
  const total = tables.data?.length ?? 0;
  const maxQty = Math.max(1, ...s.topItems.map((t) => t.quantity));

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg bg-ink p-6 text-steel">
          <p className="text-steel/70">Takings so far</p>
          <p className="mt-1 text-6xl font-black tracking-tight [font-stretch:65%] sm:text-7xl">
            {money(s.revenueToday, restaurant?.currency)}
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
            <div>
              <dt className="text-sm text-steel/70">Paid orders</dt>
              <dd className="text-2xl font-bold">{s.ordersToday}</dd>
            </div>
            <div>
              <dt className="text-sm text-steel/70">Open now</dt>
              <dd className="text-2xl font-bold">
                <Link href="/orders" className="hover:underline">{s.openOrders}</Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-steel/70">Tables seated</dt>
              <dd className="text-2xl font-bold">
                {seated}<span className="text-base font-medium text-steel/60"> of {total}</span>
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-steel/60">
            Average bill {s.ordersToday ? money(s.revenueToday / s.ordersToday, restaurant?.currency) : 'not available yet'}
          </p>
        </section>

        <section className="rounded-lg bg-panel p-6">
          <h2 className="text-lg font-bold">Best sellers today</h2>
          {s.topItems.length === 0 ? (
            <p className="mt-4 text-ink-soft">Nothing sold yet today. Best sellers appear after the first paid order.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {s.topItems.map((t) => (
                <li key={t.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t.name}</span>
                    <span className="tabular-nums text-ink-soft">{t.quantity} sold</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-steel-deep">
                    <div className="h-2 rounded-full bg-teal" style={{ width: `${(t.quantity / maxQty) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin']}>
      <Dashboard />
    </Guard>
  );
}
