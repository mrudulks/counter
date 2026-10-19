'use client';

import { useParams } from 'next/navigation';
import { Guard } from '@/components/Guard';
import { OrderScreen } from '@/components/OrderScreen';

export default function Page() {
  const { orderId } = useParams<{ orderId: string }>();
  return (
    <Guard roles={['superadmin', 'admin', 'staff']}>
      <OrderScreen key={orderId} mode="existing" orderId={orderId} />
    </Guard>
  );
}
