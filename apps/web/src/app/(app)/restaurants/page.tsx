'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { errorMessage } from '@/lib/format';
import type { Restaurant } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { RestaurantForm } from '@/components/RestaurantForm';
import { Button, Empty, ErrorNote, Loading, Modal, PageHeader } from '@/components/ui';
import { useToast } from '@/components/toast';

function Restaurants() {
  const { restaurant: active, setRestaurant } = useSession();
  const router = useRouter();
  const notify = useToast();
  const list = useFetch<Restaurant[]>('/restaurants');
  const [editing, setEditing] = useState<Restaurant | 'new' | null>(null);

  function workIn(r: Restaurant) {
    setRestaurant(r);
    router.push('/dashboard');
  }

  async function remove(r: Restaurant) {
    if (!confirm(`Delete ${r.name}? This permanently removes its team, menu, tables and every order.`)) return;
    try {
      await api(`/restaurants/${r._id}`, 'DELETE');
      if (active?._id === r._id) setRestaurant(null);
      notify(`${r.name} deleted`);
      list.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Restaurants"
        subtitle="Pick a restaurant to run its floor, kitchen, menu and team."
        actions={<Button onClick={() => setEditing('new')}>Add restaurant</Button>}
      />

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorNote message={list.error} />
      ) : !list.data?.length ? (
        <Empty title="No restaurants yet">
          <p>Add your first restaurant, then create an admin for it under Team.</p>
          <Button className="mt-4" onClick={() => setEditing('new')}>Add restaurant</Button>
        </Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {list.data.map((r) => {
            const isActive = active?._id === r._id;
            return (
              <li key={r._id} className={`rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)] p-5 ${isActive ? 'ring-2 ring-brand' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">{r.name}</h2>
                    <p className="text-sm text-ink-soft">{r.address || 'No address added'}</p>
                  </div>
                  {!r.isActive && <span className="rounded bg-chili/10 px-2 py-0.5 text-xs font-semibold text-chili">Inactive</span>}
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  {r.currency}, {r.taxPercent}% tax{r.phone && `, ${r.phone}`}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => workIn(r)} disabled={isActive}>
                    {isActive ? 'Working here' : 'Work in this restaurant'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-chili hover:text-chili" onClick={() => remove(r)}>Delete</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add restaurant' : 'Edit restaurant'}>
        {editing !== null && (
          <RestaurantForm
            restaurant={editing === 'new' ? null : editing}
            allowActiveToggle
            onSaved={(saved) => {
              setEditing(null);
              list.reload();
              if (active?._id === saved._id) setRestaurant(saved);
            }}
          />
        )}
      </Modal>
    </>
  );
}

export default function Page() {
  return (
    <Guard roles={['superadmin']} scoped={false}>
      <Restaurants />
    </Guard>
  );
}
