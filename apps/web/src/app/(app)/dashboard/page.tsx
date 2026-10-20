'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Armchair, Clock, ShoppingBag, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { useOrderEvents } from '@/lib/realtime';
import { money } from '@/lib/format';
import type { Stats, Table } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Card, ErrorNote, Loading, PageHeader } from '@/components/ui';

function Trend({ now, before, format }: { now: number; before: number; format: (n: number) => string }) {
  if (before === 0 && now === 0) return <span className="text-ink-soft">No sales yet today or yesterday</span>;
  if (before === 0) return <span className="text-ink-soft">Nothing by this time yesterday</span>;
  const pct = ((now - before) / before) * 100;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1">
      <span className={`flex items-center gap-0.5 font-semibold ${up ? 'text-free' : 'text-chili'}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {Math.abs(pct).toFixed(1)}%
      </span>
      <span className="text-ink-soft">vs {format(before)} by now yesterday</span>
    </span>
  );
}

function StatCard({ icon: Icon, tint, label, value, foot }: { icon: LucideIcon; tint: string; label: string; value: React.ReactNode; foot: React.ReactNode }) {
  return (
    <Card className="flex gap-4 p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
        <div className="mt-1 text-xs">{foot}</div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const scope = useScope();
  const { restaurant } = useSession();
  const currency = restaurant?.currency;
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
  const diff = s.ordersToday - s.ordersYesterday;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          tint="bg-brand-soft text-brand"
          label="Today’s sales"
          value={money(s.revenueToday, currency)}
          foot={<Trend now={s.revenueToday} before={s.revenueYesterday} format={(n) => money(n, currency)} />}
        />
        <StatCard
          icon={ShoppingBag}
          tint="bg-reserved/10 text-reserved"
          label="Paid orders"
          value={s.ordersToday}
          foot={
            <span className={diff > 0 ? 'text-free' : diff < 0 ? 'text-chili' : 'text-ink-soft'}>
              {diff === 0 ? 'Same as by now yesterday' : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than by now yesterday`}
            </span>
          }
        />
        <StatCard
          icon={Clock}
          tint="bg-seated/15 text-[#a86a00]"
          label="Open orders"
          value={<Link href="/orders" className="hover:text-brand">{s.openOrders}</Link>}
          foot={<span className="text-ink-soft">Being cooked or waiting to be paid</span>}
        />
        <StatCard
          icon={Armchair}
          tint="bg-free/10 text-free"
          label="Tables seated"
          value={<>{seated}<span className="text-base font-medium text-ink-soft"> of {total}</span></>}
          foot={
            <span className="text-ink-soft">
              Average bill {s.ordersToday ? money(s.revenueToday / s.ordersToday, currency) : 'not available yet'}
            </span>
          }
        />
      </div>

      <Card className="mt-6 max-w-2xl p-6">
        <h2 className="text-base font-bold">Best sellers today</h2>
        {s.topItems.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nothing sold yet today. Best sellers appear after the first paid order.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {s.topItems.map((t) => (
              <li key={t.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="tabular-nums text-ink-soft">{t.quantity} sold</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-steel-deep">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${(t.quantity / maxQty) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
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
