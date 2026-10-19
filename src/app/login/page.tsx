'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HOME_BY_ROLE, useSession } from '@/lib/session';
import { errorMessage } from '@/lib/format';
import { Button, ErrorNote, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const { login, user, ready } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(HOME_BY_ROLE[user.role]);
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password);
      router.replace(HOME_BY_ROLE[u.role]);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_28rem]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-steel lg:flex lg:flex-col lg:justify-between">
        <p className="text-3xl font-black [font-stretch:70%]">Counter</p>
        <div className="relative">
          <p className="max-w-lg text-6xl font-black leading-[0.95] tracking-tight [font-stretch:68%]">
            Take the order. Fire it to the kitchen. Close the table.
          </p>
          <p className="mt-6 max-w-md text-lg text-steel/70">
            One screen for the floor, one for the pass, and one for whoever runs the place.
          </p>
        </div>
        <div className="ticket absolute right-16 top-28 w-56 rotate-3 p-5 text-sm text-ink" aria-hidden>
          <p className="flex justify-between font-bold"><span>#0142</span><span>T4</span></p>
          <p className="mt-3">2× Paneer Tikka</p>
          <p>1× Dal Makhani</p>
          <p>3× Butter Naan</p>
          <p className="mt-3 text-ink-soft">no onion on the tikka</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="text-2xl font-black [font-stretch:70%] lg:hidden">Counter</p>
            <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-ink-soft">Use the email your manager set up for you.</p>
          </div>
          {error && <ErrorNote message={error} />}
          <Field label="Email">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" busy={busy}>
            Sign in
          </Button>
        </form>
      </section>
    </div>
  );
}
