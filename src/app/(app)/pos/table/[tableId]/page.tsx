'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useScope } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import type { Table } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { OrderScreen } from '@/components/OrderScreen';
import { ErrorNote, Loading } from '@/components/ui';

function TableOrder() {
  const { tableId } = useParams<{ tableId: string }>();
  const scope = useScope();
  const router = useRouter();
  const tables = useFetch<Table[]>(`${scope}/tables`);
  const table = tables.data?.find((t) => t._id === tableId);

  // A table with an open order goes straight to that order
  useEffect(() => {
    if (table?.currentOrder) router.replace(`/pos/order/${table.currentOrder._id}`);
  }, [table, router]);

  if (tables.loading || table?.currentOrder) return <Loading />;
  if (!table) return <ErrorNote message={tables.error ?? 'Table not found'} />;
  return <OrderScreen mode="new" table={table} />;
}

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin', 'staff']}>
      <TableOrder />
    </Guard>
  );
}
