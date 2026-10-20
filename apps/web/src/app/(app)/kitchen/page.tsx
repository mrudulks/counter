'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useScope } from '@/lib/session';
import { useOrderEvents } from '@/lib/realtime';
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
    <article className={`ticket flex w-72 shrink-0 flex-col overflow-hidden ${late ? 'border-chili/50' : ''} ${isNew ? 'ticket-new' : ''}`} aria-label={`Order ${order.orderNumber}`}>
      <header className={`flex items-center justify-between px-4 py-3 ${late ? 'bg-chili/10' : 'bg-brand-soft'}`}>
        <div>
          <p className="text-lg font-bold">{order.table?.name ?? 'Takeaway'}</p>
          <p className={`flex items-center gap-1 text-xs ${late ? 'font-semibold text-chili' : 'text-ink-soft'}`}>
            <Clock className="h-3 w-3" aria-hidden />
            {clockTime(order.createdAt)}, {age < 1 ? 'just in' : `${age} min`}
            {late && ' (running late)'}
          </p>
        </div>
        <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-ink">#{order.orderNumber}</span>
      </header>

      <ul className="flex-1 space-y-1 p-2">
        {items.map((item) => {
          const next = NEXT[item.status];
          const done = item.status === 'ready';
          return (
            <li key={item._id}>
              <button
                disabled={!next}
                onClick={() => next && onAdvance(order, [item])}
                className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                  done ? 'text-ink-soft' : 'hover:bg-steel'
                } ${item.status === 'preparing' ? 'bg-seated/10' : ''}`}
              >
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-md text-sm font-bold ${done ? 'bg-steel-deep line-through' : 'bg-ink text-white'}`}>{item.quantity}</span>
                <span className="flex-1">
                  <span className={`block text-[15px] leading-6 ${done ? 'line-through' : 'font-semibold'}`}>{item.name}</span>
                  {item.notes && <span className="block text-xs font-medium text-[#a86a00]">↳ {item.notes}</span>}
                </span>
                <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                  done ? 'bg-free/15 text-free' : next?.to === 'ready' ? 'bg-brand text-white' : 'border border-line bg-white text-ink'
                }`}>
                  {done ? 'Ready' : next!.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {order.notes && <p className="mx-4 border-t border-dashed border-line pt-2 text-sm">Note: {order.notes}</p>}

      {bulk && (
        <button
          onClick={() => onAdvance(order, bulk.items)}
          className="m-3 mt-1 h-11 rounded-xl bg-brand text-sm font-semibold text-white shadow-sm shadow-brand/25 hover:bg-brand-deep"
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
  const orders = useFetch<Order[]>(`${scope}/orders?status=open`, 30000);
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

  function upsert(order: Order) {
    orders.setData((all) => {
      if (!all) return all;
      if (order.status !== 'open') return all.filter((o) => o._id !== order._id);
      return all.some((o) => o._id === order._id) ? all.map((o) => (o._id === order._id ? order : o)) : [...all, order];
    });
  }

  useOrderEvents((e) => upsert(e.order));

  async function advance(order: Order, items: OrderItem[]) {
    // Items passed together always share a status (one dish, or a "Start all" / "All ready" group)
    const next = NEXT[items[0].status];
    if (!next) return;
    try {
      upsert(
        await api<Order>(`${scope}/orders/${order._id}/items/status`, 'POST', {
          itemIds: items.map((i) => i._id),
          status: next.to,
        }),
      );
    } catch (err) {
      notify(errorMessage(err), 'error');
      orders.reload();
    }
  }

  if (orders.loading) return <Loading />;

  const waiting = tickets.reduce((s, o) => s + o.items.filter((i) => i.status === 'pending').length, 0);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kitchen</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {tickets.length ? `${tickets.length} on the rail, ${waiting} not started` : 'Nothing on the rail'}. Tap a dish to move it along.
          </p>
        </div>
        {orders.error && <ErrorNote message={`Lost connection: ${orders.error}`} />}
      </div>

      {tickets.length === 0 ? (
        <div className="mx-4 rounded-2xl border-2 border-dashed border-line bg-panel/60 py-20 text-center text-ink-soft sm:mx-6 lg:mx-8">
          New orders will drop onto the rail as soon as the floor sends them.
        </div>
      ) : (
        <div className="flex items-start gap-4 overflow-x-auto px-4 pb-8 sm:px-6 lg:px-8">
          {tickets.map((o) => (
            <Ticket key={o._id} order={o} isNew={fresh.has(o._id)} onAdvance={advance} />
          ))}
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
