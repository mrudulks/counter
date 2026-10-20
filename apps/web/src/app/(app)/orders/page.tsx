'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { useOrderEvents } from '@/lib/realtime';
import { clockTime, money, timeAgo } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Empty, ErrorNote, Loading, PageHeader } from '@/components/ui';

const TABS: { status: OrderStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'completed', label: 'Paid' },
  { status: 'cancelled', label: 'Cancelled' },
];

function progress(o: Order) {
  const live = o.items.filter((i) => i.status !== 'cancelled');
  const ready = live.filter((i) => i.status === 'ready').length;
  const cooking = live.filter((i) => i.status === 'pending' || i.status === 'preparing').length;
  if (ready) return { text: `${ready} ready to serve`, tone: 'text-free font-semibold' };
  if (cooking) return { text: `${cooking} in kitchen`, tone: 'text-[#8a600a]' };
  return { text: 'All served', tone: 'text-ink-soft' };
}

function Orders() {
  const scope = useScope();
  const { restaurant } = useSession();
  const [tab, setTab] = useState<OrderStatus>('open');
  const orders = useFetch<Order[]>(`${scope}/orders?status=${tab}`, tab === 'open' ? 30000 : undefined);
  useOrderEvents(() => orders.reload());

  return (
    <>
      <PageHeader title="Orders" subtitle="Updates live as the floor and kitchen work." />
      <div className="mb-5 inline-flex rounded-xl bg-steel-deep p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.status}
            role="tab"
            aria-selected={tab === t.status}
            onClick={() => setTab(t.status)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === t.status ? 'bg-panel text-brand shadow-sm' : 'text-ink-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {orders.loading ? (
        <Loading />
      ) : orders.error ? (
        <ErrorNote message={orders.error} />
      ) : !orders.data?.length ? (
        <Empty title={tab === 'open' ? 'No open orders' : `No ${TABS.find((t) => t.status === tab)!.label.toLowerCase()} orders yet`}>
          {tab === 'open' && 'Start one from the Floor.'}
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Where</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">{tab === 'open' ? 'Kitchen' : 'Payment'}</th>
                <th className="px-4 py-3 font-medium">Taken</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.data.map((o) => {
                const p = progress(o);
                return (
                  <tr key={o._id} className="hover:bg-white">
                    <td className="px-4 py-3 font-bold">
                      <Link href={`/pos/order/${o._id}`} className="hover:underline">#{o.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-3">{o.table?.name ?? 'Takeaway'}</td>
                    <td className="px-4 py-3">{o.items.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className={`px-4 py-3 ${tab === 'open' ? p.tone : ''}`}>
                      {tab === 'open' ? p.text : (o.paymentMethod?.toUpperCase() ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {tab === 'open' ? timeAgo(o.createdAt) : `${new Date(o.createdAt).toLocaleDateString()} ${clockTime(o.createdAt)}`}
                      {o.createdBy && <span className="block text-xs">by {o.createdBy.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{money(o.total, restaurant?.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin', 'staff']}>
      <Orders />
    </Guard>
  );
}
