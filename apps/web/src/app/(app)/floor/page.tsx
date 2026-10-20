'use client';

import Link from 'next/link';
import { ShoppingBag, Users } from 'lucide-react';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { useOrderEvents } from '@/lib/realtime';
import { api } from '@/lib/api';
import { errorMessage, money } from '@/lib/format';
import type { Order, Table, TableStatus } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Empty, ErrorNote, Loading, PageHeader } from '@/components/ui';
import { useToast } from '@/components/toast';

const STATUS: Record<TableStatus, { label: string; chip: string; ring: string }> = {
  available: { label: 'Free', chip: 'bg-free/10 text-free', ring: 'hover:border-free/50' },
  occupied: { label: 'Seated', chip: 'bg-seated/15 text-[#a86a00]', ring: 'border-seated/40 hover:border-seated' },
  reserved: { label: 'Reserved', chip: 'bg-reserved/10 text-reserved', ring: 'hover:border-reserved/50' },
};

function Floor() {
  const scope = useScope();
  const { restaurant } = useSession();
  const notify = useToast();
  const tables = useFetch<Table[]>(`${scope}/tables`, 30000);
  const takeaways = useFetch<Order[]>(`${scope}/orders?status=open`, 30000);
  useOrderEvents((e) => {
    if (e.type !== 'items-updated') tables.reload();
    takeaways.reload();
  });

  const openTakeaways = (takeaways.data ?? []).filter((o) => o.type === 'takeaway');

  async function toggleReserved(t: Table) {
    try {
      await api(`${scope}/tables/${t._id}`, 'PATCH', { status: t.status === 'reserved' ? 'available' : 'reserved' });
      tables.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  }

  if (tables.loading) return <Loading />;
  if (tables.error) return <ErrorNote message={tables.error} />;

  const counts = (tables.data ?? []).reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }), {});

  return (
    <>
      <PageHeader
        title="Floor"
        subtitle={`${counts.available ?? 0} free, ${counts.occupied ?? 0} seated, ${counts.reserved ?? 0} reserved`}
        actions={
          <Link href="/pos/takeaway" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm shadow-brand/25 hover:bg-brand-deep">
            <ShoppingBag className="h-4 w-4" aria-hidden /> New takeaway
          </Link>
        }
      />

      {!tables.data?.length ? (
        <Empty title="No tables yet">An admin can add tables under Tables.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-6">
          {tables.data.map((t) => {
            const s = STATUS[t.status];
            return (
              <div key={t._id} className={`group relative rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)] transition-colors ${s.ring}`}>
                <Link href={`/pos/table/${t._id}`} className="block p-4">
                  <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ${s.chip}`}>{s.label}</span>
                  <p className="mt-4 text-3xl font-extrabold tracking-tight">{t.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {t.currentOrder
                      ? `Order #${t.currentOrder.orderNumber}, ${money(t.currentOrder.total, restaurant?.currency)}`
                      : `${t.seats} seats`}
                  </p>
                </Link>
                {t.status !== 'occupied' && (
                  <button
                    onClick={() => toggleReserved(t)}
                    className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-medium text-ink-soft hover:bg-steel hover:text-brand"
                  >
                    {t.status === 'reserved' ? 'Unreserve' : 'Reserve'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {openTakeaways.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-base font-bold">Open takeaways</h2>
          <div className="flex flex-wrap gap-2">
            {openTakeaways.map((o) => (
              <Link key={o._id} href={`/pos/order/${o._id}`} className="rounded-xl border border-line bg-panel px-4 py-3 shadow-[var(--shadow-card)] hover:border-brand/40">
                <span className="font-bold">#{o.orderNumber}</span>
                <span className="ml-3 text-ink-soft">{money(o.total, restaurant?.currency)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin', 'staff']}>
      <Floor />
    </Guard>
  );
}
