'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useScope } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { clockTime, errorMessage } from '@/lib/format';
import type { ItemStatus, Order, OrderItem } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { ErrorNote, Loading } from '@/components/ui';
import { useToast } from '@/components/toast';

const NEXT: Partial<Record<ItemStatus, { to: ItemStatus; label: string }>> = {
  pending: { to: 'preparing', label: 'Start' },
  preparing: { to: 'ready', label: 'Mark ready' },
};

const KITCHEN_STATES: ItemStatus[] = ['pending', 'preparing', 'ready'];
const LATE_AFTER_MIN = 15;

function minutesSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function Ticket({ order, isNew, onAdvance }: { order: Order; isNew: boolean; onAdvance: (o: Order, items: OrderItem[]) => void }) {
  const items = order.items.filter((i) => KITCHEN_STATES.includes(i.status));
  const age = minutesSince(order.createdAt);
  const late = age >= LATE_AFTER_MIN && items.some((i) => i.status !== 'ready');
  const pending = items.filter((i) => i.status === 'pending');
  const cooking = items.filter((i) => i.status === 'preparing');
  const bulk = pending.length ? { items: pending, label: 'Start all' } : cooking.length ? { items: cooking, label: 'All ready' } : null;

  return (
    <article className={`ticket flex w-72 shrink-0 flex-col px-4 pb-5 pt-6 ${isNew ? 'ticket-new' : ''}`} aria-label={`Order ${order.orderNumber}`}>
      <header className="flex items-baseline justify-between border-b-2 border-ink pb-2">
        <p className="text-2xl font-bold">{order.table?.name ?? 'TAKEAWAY'}</p>
        <p className="text-sm">#{order.orderNumber}</p>
      </header>
      <p className={`mt-1.5 text-sm ${late ? 'font-bold text-chili' : 'text-ink-soft'}`}>
        {clockTime(order.createdAt)}, {age < 1 ? 'just in' : `${age} min`}
        {late && ' (running late)'}
      </p>

      <ul className="mt-3 flex-1 space-y-1">
        {items.map((item) => {
          const next = NEXT[item.status];
          const done = item.status === 'ready';
          return (
            <li key={item._id}>
              <button
                disabled={!next}
                onClick={() => next && onAdvance(order, [item])}
                className={`flex w-full items-start gap-3 rounded px-2 py-2 text-left transition-colors ${
                  done ? 'text-ink-soft' : 'hover:bg-ink/5'
                } ${item.status === 'preparing' ? 'bg-seated/15' : ''}`}
              >
                <span className={`text-xl font-bold leading-6 ${done ? 'line-through' : ''}`}>{item.quantity}</span>
                <span className="flex-1">
                  <span className={`block text-[17px] leading-6 ${done ? 'line-through' : 'font-bold'}`}>{item.name}</span>
                  {item.notes && <span className="block text-sm italic">↳ {item.notes}</span>}
                </span>
                <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 font-sans text-xs font-semibold ${
                  done ? 'bg-free text-white' : next?.to === 'ready' ? 'bg-ink text-paper' : 'border border-ink/40'
                }`}>
                  {done ? 'Ready' : next!.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {order.notes && <p className="mt-3 border-t border-dashed border-ink/30 pt-2 text-sm">Note: {order.notes}</p>}

      {bulk && (
        <button
          onClick={() => onAdvance(order, bulk.items)}
          className="mt-4 h-11 rounded-md bg-ink font-sans text-sm font-semibold text-paper hover:bg-ink/90"
        >
          {bulk.label}
        </button>
      )}
    </article>
  );
}

function Kitchen() {
  const scope = useScope();
  const notify = useToast();
  const orders = useFetch<Order[]>(`${scope}/orders?status=open`, 5000);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const tickets = (orders.data ?? [])
    .filter((o) => o.items.some((i) => i.status === 'pending' || i.status === 'preparing' || i.status === 'ready'))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Mark tickets that appeared since the last poll so they animate in once
  useEffect(() => {
    if (!orders.data) return;
    const ids = new Set(orders.data.map((o) => o._id));
    if (seen.current) {
      const added = [...ids].filter((id) => !seen.current!.has(id));
      if (added.length) setFresh(new Set(added));
    }
    seen.current = ids;
  }, [orders.data]);

  async function advance(order: Order, items: OrderItem[]) {
    try {
      let latest = order;
      for (const item of items) {
        const next = NEXT[item.status];
        if (!next) continue;
        latest = await api<Order>(`${scope}/orders/${order._id}/items/${item._id}`, 'PATCH', { status: next.to });
      }
      orders.setData((all) => all?.map((o) => (o._id === latest._id ? latest : o)) ?? null);
    } catch (err) {
      notify(errorMessage(err), 'error');
      orders.reload();
    }
  }

  if (orders.loading) return <Loading />;

  const waiting = tickets.reduce((s, o) => s + o.items.filter((i) => i.status === 'pending').length, 0);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight [font-stretch:80%]">Kitchen</h1>
          <p className="mt-1 text-ink-soft">
            {tickets.length ? `${tickets.length} on the rail, ${waiting} not started` : 'Nothing on the rail'}. Tap a dish to move it along.
          </p>
        </div>
        {orders.error && <ErrorNote message={`Lost connection: ${orders.error}`} />}
      </div>

      {tickets.length === 0 ? (
        <div className="mx-4 rounded-lg border-2 border-dashed border-line py-20 text-center text-lg text-ink-soft sm:mx-6 lg:mx-10">
          New orders will drop onto the rail as soon as the floor sends them.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-[#b9c3c9] to-[#d3dadd] shadow-inner" aria-hidden />
          <div className="flex items-start gap-4 overflow-x-auto px-4 pb-8 pt-1 sm:px-6 lg:px-10">
            {tickets.map((o) => (
              <Ticket key={o._id} order={o} isNew={fresh.has(o._id)} onAdvance={advance} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin', 'kitchen']}>
      <Kitchen />
    </Guard>
  );
}
