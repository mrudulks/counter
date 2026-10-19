'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { errorMessage, money } from '@/lib/format';
import type { MenuItem } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Button, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Toggle, VegMark } from '@/components/ui';
import { useToast } from '@/components/toast';

type Draft = Omit<MenuItem, '_id' | 'price'> & { price: string };
const BLANK: Draft = { name: '', description: '', category: '', price: '', isVeg: true, isAvailable: true };

function MenuEditor({ item, categories, onDone }: { item: MenuItem | null; categories: string[]; onDone: () => void }) {
  const scope = useScope();
  const notify = useToast();
  const [form, setForm] = useState<Draft>(item ? { ...item, price: String(item.price) } : BLANK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: Number(form.price),
      isVeg: form.isVeg,
      isAvailable: form.isAvailable,
    };
    try {
      if (item) await api(`${scope}/menu/${item._id}`, 'PATCH', body);
      else await api(`${scope}/menu`, 'POST', body);
      notify(item ? 'Dish saved' : `${form.name} added to the menu`);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote message={error} />}
      <Field label="Dish name">
        <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Input required list="menu-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Starters" />
          <datalist id="menu-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Price">
          <Input required type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </Field>
      </div>
      <Field label="Description" hint="Optional. Helps new staff answer guests’ questions.">
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-6">
        <Toggle checked={form.isVeg} onChange={(v) => setForm({ ...form, isVeg: v })} label="Vegetarian" />
        <Toggle checked={form.isAvailable} onChange={(v) => setForm({ ...form, isAvailable: v })} label="Available to order" />
      </div>
      <Button type="submit" className="w-full" busy={busy}>{item ? 'Save dish' : 'Add dish'}</Button>
    </form>
  );
}

function Menu() {
  const scope = useScope();
  const { restaurant } = useSession();
  const notify = useToast();
  const menu = useFetch<MenuItem[]>(`${scope}/menu`);
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    (menu.data ?? []).forEach((m) => map.set(m.category, [...(map.get(m.category) ?? []), m]));
    return [...map.entries()];
  }, [menu.data]);

  async function toggleAvailable(m: MenuItem) {
    try {
      await api(`${scope}/menu/${m._id}`, 'PATCH', { isAvailable: !m.isAvailable });
      notify(m.isAvailable ? `${m.name} marked sold out` : `${m.name} is back on`);
      menu.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  }

  async function remove(m: MenuItem) {
    if (!confirm(`Delete ${m.name} from the menu? Past orders keep their record of it.`)) return;
    try {
      await api(`${scope}/menu/${m._id}`, 'DELETE');
      notify(`${m.name} deleted`);
      menu.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="Mark a dish sold out and it disappears from the order screen until you turn it back on."
        actions={<Button onClick={() => setEditing('new')}>Add dish</Button>}
      />

      {menu.loading ? (
        <Loading />
      ) : menu.error ? (
        <ErrorNote message={menu.error} />
      ) : grouped.length === 0 ? (
        <Empty title="The menu is empty">
          <Button className="mt-2" onClick={() => setEditing('new')}>Add your first dish</Button>
        </Empty>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2 text-xl font-bold">
                {category} <span className="text-base font-normal text-ink-soft">({items.length})</span>
              </h2>
              <ul className="divide-y divide-line rounded-lg bg-panel">
                {items.map((m) => (
                  <li key={m._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <VegMark veg={m.isVeg} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${m.isAvailable ? '' : 'text-ink-soft line-through'}`}>{m.name}</p>
                      {m.description && <p className="truncate text-sm text-ink-soft">{m.description}</p>}
                    </div>
                    <p className="w-24 text-right font-semibold tabular-nums">{money(m.price, restaurant?.currency)}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleAvailable(m)}>
                        {m.isAvailable ? 'Mark sold out' : 'Make available'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-chili hover:text-chili" onClick={() => remove(m)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add dish' : 'Edit dish'}>
        {editing !== null && (
          <MenuEditor
            item={editing === 'new' ? null : editing}
            categories={grouped.map(([c]) => c)}
            onDone={() => {
              setEditing(null);
              menu.reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}

export default function Page() {
  return (
    <Guard roles={['superadmin', 'admin']}>
      <Menu />
    </Guard>
  );
}
