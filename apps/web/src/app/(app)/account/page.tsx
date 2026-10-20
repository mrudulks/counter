'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { errorMessage } from '@/lib/format';
import { Button, ErrorNote, Field, Input, PageHeader } from '@/components/ui';
import { useToast } from '@/components/toast';

export default function AccountPage() {
  const { user } = useSession();
  const notify = useToast();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/me/password', 'PATCH', { currentPassword, newPassword });
      notify('Password changed');
      setCurrent('');
      setNew('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Your account" subtitle={user ? `${user.name}, ${user.email}` : undefined} />
      <form onSubmit={submit} className="max-w-md space-y-4 rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)] p-6">
        <h2 className="text-lg font-bold">Change password</h2>
        {error && <ErrorNote message={error} />}
        <Field label="Current password">
          <Input type="password" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 6 characters.">
          <Input type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
        </Field>
        <Button type="submit" busy={busy}>Change password</Button>
      </form>
    </>
  );
}
