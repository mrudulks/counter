'use client';

import { useSession } from '@/lib/session';
import { Guard } from '@/components/Guard';
import { RestaurantForm } from '@/components/RestaurantForm';
import { PageHeader } from '@/components/ui';

function Settings() {
  const { restaurant, setRestaurant, user } = useSession();
  return (
    <>
      <PageHeader title="Settings" subtitle="Details printed on bills and used for tax." />
      <div className="max-w-lg rounded-lg bg-panel p-6">
        <RestaurantForm
          key={restaurant!._id}
          restaurant={restaurant}
          allowActiveToggle={user?.role === 'superadmin'}
          onSaved={setRestaurant}
        />
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin']}>
      <Settings />
    </Guard>
  );
}
