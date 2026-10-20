'use client';

import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, uploadFile } from '@/lib/api';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { errorMessage, money } from '@/lib/format';
import type { MenuItem } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Button, Card, DishImage, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Toggle, VegMark } from '@/components/ui';
import { useToast } from '@/components/toast';

type Draft = Omit<MenuItem, '_id' | 'price'> & { price: string };
const BLANK: Draft = { name: '', description: '', category: '', price: '', isVeg: true, isAvailable: true, image: '' };
const ACCEPT = 'image/jpeg,image/png,image/webp';

function ImagePicker({ value, onChange, onBusy }: { value: string; onChange: (url: string) => void; onBusy: (b: boolean) => void }) {
  const scope = useScope();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('Image must be 5 MB or smaller');
    setError(null);
    setUploading(true);
    onBusy(true);
    try {
      const { url } = await uploadFile<{ url: string }>(`${scope}/uploads/menu-image`, file);
      onChange(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      onBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">Photo</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-line hover:border-brand"
          aria-label={value ? 'Change photo' : 'Upload photo'}
        >
          {value ? (
            <DishImage src={value} alt="Dish photo" className="h-full w-full" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-ink-soft">
              <ImagePlus className="h-5 w-5" aria-hidden />
              Upload
            </span>
          )}
          {uploading && <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-semibold">Uploading…</span>}
        </button>
        <div className="space-y-1 text-xs text-ink-soft">
          <p>JPG, PNG or WebP, up to 5 MB. Square or 4:3 photos look best.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => input.current?.click()} className="font-semibold text-brand hover:underline" disabled={uploading}>
              {value ? 'Change photo' : 'Choose photo'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="font-semibold text-chili hover:underline" disabled={uploading}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-chili" role="alert">{error}</p>}
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function MenuEditor({ item, categories, onDone }: { item: MenuItem | null; categories: string[]; onDone: () => void }) {
  const scope = useScope();
  const notify = useToast();
  const [form, setForm] = useState<Draft>(item ? { ...BLANK, ...item, price: String(item.price) } : BLANK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      image: form.image,
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
      <ImagePicker value={form.image} onChange={(image) => setForm((f) => ({ ...f, image }))} onBusy={setUploading} />
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
      <Button type="submit" className="w-full" busy={busy} disabled={uploading}>
        {uploading ? 'Waiting for photo…' : item ? 'Save dish' : 'Add dish'}
      </Button>
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
        subtitle="Mark a dish sold out and it stops being orderable until you turn it back on."
        actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden /> Add dish</Button>}
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
              <h2 className="mb-3 text-base font-bold">
                {category} <span className="font-normal text-ink-soft">({items.length})</span>
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {items.map((m) => (
                  <li key={m._id}>
                    <Card className="flex h-full flex-col p-3">
                      <div className="relative">
                        <DishImage src={m.image} alt={m.name} className={`aspect-[4/3] w-full rounded-xl ${m.isAvailable ? '' : 'grayscale'}`} />
                        {!m.isAvailable && (
                          <span className="absolute left-2 top-2 rounded-md bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">Sold out</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-2 px-1">
                        <p className="flex items-start gap-1.5 font-semibold leading-snug">
                          <VegMark veg={m.isVeg} />
                          <span className="-mt-0.5">{m.name}</span>
                        </p>
                        <p className="shrink-0 font-bold text-brand">{money(m.price, restaurant?.currency)}</p>
                      </div>
                      {m.description && <p className="mt-1 line-clamp-2 px-1 text-sm text-ink-soft">{m.description}</p>}
                      <div className="mt-auto flex items-center gap-1 px-1 pt-3">
                        <Button size="sm" variant="ghost" className="-ml-2" onClick={() => toggleAvailable(m)}>
                          {m.isAvailable ? 'Mark sold out' : 'Make available'}
                        </Button>
                        <span className="ml-auto flex gap-1">
                          <button onClick={() => setEditing(m)} className="rounded-lg p-2 text-ink-soft hover:bg-steel hover:text-brand" aria-label={`Edit ${m.name}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(m)} className="rounded-lg p-2 text-ink-soft hover:bg-chili/10 hover:text-chili" aria-label={`Delete ${m.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      </div>
                    </Card>
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
