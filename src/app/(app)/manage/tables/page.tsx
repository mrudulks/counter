'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useScope } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { errorMessage } from '@/lib/format';
import type { Table } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Button, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader } from '@/components/ui';
import { useToast } from '@/components/toast';

function TableEditor({ table, onDone }: { table: Table | null; onDone: () => void }) {
  const scope = useScope();
  const notify = useToast();
  const [name, setName] = useState(table?.name ?? '');
  const [seats, setSeats] = useState(String(table?.seats ?? 4));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { name, seats: Number(seats) };
      if (table) await api(`${scope}/tables/${table._id}`, 'PATCH', body);
      else await api(`${scope}/tables`, 'POST', body);
      notify(table ? 'Table saved' : `${name} added`);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Table name" hint="Short, e.g. T5 or Patio 2">
          <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Seats">
          <Input required type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" className="w-full" busy={busy}>{table ? 'Save table' : 'Add table'}</Button>
    </form>
  );
}

function Tables() {
  const scope = useScope();
  const notify = useToast();
  const tables = useFetch<Table[]>(`${scope}/tables`);
  const [editing, setEditing] = useState<Table | 'new' | null>(null);

  async function remove(t: Table) {
    if (!confirm(`Delete ${t.name}?`)) return;
    try {
      await api(`${scope}/tables/${t._id}`, 'DELETE');
      notify(`${t.name} deleted`);
      tables.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  }

  const seats = (tables.data ?? []).reduce((s, t) => s + t.seats, 0);

  return (
    <>
      <PageHeader
        title="Tables"
        subtitle={tables.data?.length ? `${tables.data.length} tables, ${seats} seats in total` : undefined}
        actions={<Button onClick={() => setEditing('new')}>Add table</Button>}
      />
      {tables.loading ? (
        <Loading />
      ) : tables.error ? (
        <ErrorNote message={tables.error} />
      ) : !tables.data?.length ? (
        <Empty title="No tables yet">
          <Button className="mt-2" onClick={() => setEditing('new')}>Add your first table</Button>
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {tables.data.map((t) => (
            <li key={t._id} className="rounded-lg bg-panel p-4">
              <p className="text-4xl font-black [font-stretch:62%]">{t.name}</p>
              <p className="text-sm text-ink-soft">{t.seats} seats</p>
              <div className="mt-3 flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-chili hover:text-chili" onClick={() => remove(t)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add table' : 'Edit table'}>
        {editing !== null && (
          <TableEditor
            table={editing === 'new' ? null : editing}
            onDone={() => {
              setEditing(null);
              tables.reload();
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
      <Tables />
    </Guard>
  );
}
