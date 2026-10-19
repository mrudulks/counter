'use client';

import { Guard } from '@/components/Guard';
import { OrderScreen } from '@/components/OrderScreen';

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin', 'staff']}>
      <OrderScreen mode="new" table={null} />
    </Guard>
  );
}
