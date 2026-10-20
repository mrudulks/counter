'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { errorMessage } from '@/lib/format';
import type { Role, User } from '@/lib/types';
import { Guard } from '@/components/Guard';
import { Button, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select, Toggle } from '@/components/ui';
import { useToast } from '@/components/toast';

const ROLE_INFO: Record<Exclude<Role, 'superadmin'>, string> = {
  admin: 'Runs this restaurant: menu, tables, team and reports',
  staff: 'Takes orders, serves dishes and collects payment',
  kitchen: 'Works the kitchen rail and marks dishes ready',
};
const ROLE_NAME = { admin: 'Admin', staff: 'Floor staff', kitchen: 'Kitchen' };

function MemberEditor({ member, onDone }: { member: User | null; onDone: () => void }) {
  const scope = useScope();
  const notify = useToast();
  const [form, setForm] = useState({
    name: member?.name ?? '',
    email: member?.email ?? '',
    password: '',
    role: (member?.role ?? 'staff') as keyof typeof ROLE_INFO,
    isActive: member?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { password, ...rest } = form;
      const body = password ? form : rest;
      if (member) await api(`${scope}/users/${member._id}`, 'PATCH', body);
      else await api(`${scope}/users`, 'POST', body);
      notify(member ? 'Team member saved' : `${form.name} can now sign in`);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote message={error} />}
      <Field label="Full name">
        <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Email" hint="They sign in with this.">
        <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label={member ? 'New password' : 'Password'} hint={member ? 'Leave blank to keep their current password.' : 'At least 6 characters. Share it with them in person.'}>
        <Input type="password" required={!member} minLength={6} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </Field>
      <Field label="Role" hint={ROLE_INFO[form.role]}>
        <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as keyof typeof ROLE_INFO })}>
          {Object.entries(ROLE_NAME).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </Field>
      {member && <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Can sign in" />}
      <Button type="submit" className="w-full" busy={busy}>{member ? 'Save team member' : 'Add team member'}</Button>
    </form>
  );
}

function Team() {
  const scope = useScope();
  const { user: me } = useSession();
  const notify = useToast();
  const team = useFetch<User[]>(`${scope}/users`);
  const [editing, setEditing] = useState<User | 'new' | null>(null);

  async function remove(u: User) {
    if (!confirm(`Remove ${u.name}? They will no longer be able to sign in.`)) return;
    try {
      await api(`${scope}/users/${u._id}`, 'DELETE');
      notify(`${u.name} removed`);
      team.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Everyone who can sign in to this restaurant."
        actions={<Button onClick={() => setEditing('new')}>Add team member</Button>}
      />
      {team.loading ? (
        <Loading />
      ) : team.error ? (
        <ErrorNote message={team.error} />
      ) : !team.data?.length ? (
        <Empty title="No one on the team yet">
          <p>Start with an admin who will run this restaurant day to day.</p>
          <Button className="mt-4" onClick={() => setEditing('new')}>Add team member</Button>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Sign-in</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {team.data.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.name}{u._id === me?._id && <span className="font-normal text-ink-soft"> (you)</span>}</p>
                    <p className="text-ink-soft">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">{ROLE_NAME[u.role as keyof typeof ROLE_NAME] ?? u.role}</td>
                  <td className="px-4 py-3">{u.isActive ? 'Allowed' : <span className="text-chili">Disabled</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(u)}>Edit</Button>
                    {u._id !== me?._id && (
                      <Button size="sm" variant="ghost" className="ml-1 text-chili hover:text-chili" onClick={() => remove(u)}>Remove</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add team member' : 'Edit team member'}>
        {editing !== null && (
          <MemberEditor
            member={editing === 'new' ? null : editing}
            onDone={() => {
              setEditing(null);
              team.reload();
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
      <Team />
    </Guard>
  );
}
