'use client';

import Link from 'next/link';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { api } from '@/lib/api';
import { errorMessage, money } from '@/lib/format';
import type { Order, Table, TableStatus } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Empty, ErrorNote, Loading, PageHeader } from '@/components/ui';
import { useToast } from '@/components/toast';

const STATUS: Record<TableStatus, { label: string; bar: string; text: string }> = {
  available: { label: 'Free', bar: 'bg-free', text: 'text-free' },
  occupied: { label: 'Seated', bar: 'bg-seated', text: 'text-[#8a600a]' },
  reserved: { label: 'Reserved', bar: 'bg-reserved', text: 'text-reserved' },
};

function Floor() {
  const scope = useScope();
  const { restaurant } = useSession();
  const notify = useToast();
  const tables = useFetch<Table[]>(`${scope}/tables`, 10000);
  const takeaways = useFetch<Order[]>(`${scope}/orders?status=open`, 10000);
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
          <Link href="/pos/takeaway" className="inline-flex h-10 items-center rounded-md bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-deep">
            New takeaway
          </Link>
        }
      />

      {!tables.data?.length ? (
        <Empty title="No tables yet">An admin can add tables under Tables.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-6">
          {tables.data.map((t) => {
            const s = STATUS[t.status];
            return (
              <div key={t._id} className="group relative overflow-hidden rounded-lg bg-panel shadow-[0_1px_0_var(--color-line)]">
                <span className={`absolute inset-x-0 top-0 h-1.5 ${s.bar}`} aria-hidden />
                <Link href={`/pos/table/${t._id}`} className="block px-4 pb-4 pt-5 hover:bg-white">
                  <p className="text-5xl font-black leading-none tracking-tight [font-stretch:62%]">{t.name}</p>
                  <p className={`mt-3 text-sm font-semibold ${s.text}`}>{s.label}</p>
                  <p className="text-sm text-ink-soft">
                    {t.currentOrder
                      ? `Order #${t.currentOrder.orderNumber}, ${money(t.currentOrder.total, restaurant?.currency)}`
                      : `${t.seats} seats`}
                  </p>
                </Link>
                {t.status !== 'occupied' && (
                  <button
                    onClick={() => toggleReserved(t)}
                    className="absolute right-2 top-3 rounded px-2 py-1 text-xs font-medium text-ink-soft hover:bg-steel-deep hover:text-ink"
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
          <h2 className="mb-3 text-lg font-bold">Open takeaways</h2>
          <div className="flex flex-wrap gap-2">
            {openTakeaways.map((o) => (
              <Link key={o._id} href={`/pos/order/${o._id}`} className="rounded-md bg-panel px-4 py-3 hover:bg-white">
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
