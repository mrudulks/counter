'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import type { Restaurant } from '@/lib/types';
import { Button, ErrorNote, Field, Input, Toggle } from './ui';
import { useToast } from './toast';

export function RestaurantForm({
  restaurant,
  allowActiveToggle,
  onSaved,
}: {
  restaurant: Restaurant | null;
  allowActiveToggle?: boolean;
  onSaved: (r: Restaurant) => void;
}) {
  const notify = useToast();
  const [form, setForm] = useState({
    name: restaurant?.name ?? '',
    address: restaurant?.address ?? '',
    phone: restaurant?.phone ?? '',
    currency: restaurant?.currency ?? 'INR',
    taxPercent: String(restaurant?.taxPercent ?? 5),
    isActive: restaurant?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      ...form,
      currency: form.currency.toUpperCase(),
      taxPercent: Number(form.taxPercent),
      ...(allowActiveToggle ? {} : { isActive: undefined }),
    };
    try {
      const saved = restaurant
        ? await api<Restaurant>(`/restaurants/${restaurant._id}`, 'PATCH', body)
        : await api<Restaurant>('/restaurants', 'POST', body);
      notify(restaurant ? 'Restaurant saved' : `${saved.name} added`);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote message={error} />}
      <Field label="Name">
        <Input required value={form.name} onChange={set('name')} autoFocus />
      </Field>
      <Field label="Address">
        <Input value={form.address} onChange={set('address')} />
      </Field>
      <Field label="Phone">
        <Input value={form.phone} onChange={set('phone')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency" hint="3-letter code, e.g. INR, USD">
          <Input required maxLength={3} value={form.currency} onChange={set('currency')} />
        </Field>
        <Field label="Tax %">
          <Input required type="number" min={0} max={100} step="0.01" value={form.taxPercent} onChange={set('taxPercent')} />
        </Field>
      </div>
      {allowActiveToggle && (
        <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Restaurant is active" />
      )}
      <Button type="submit" className="w-full" busy={busy}>
        {restaurant ? 'Save restaurant' : 'Add restaurant'}
      </Button>
    </form>
  );
}
