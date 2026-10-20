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
      <section className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg text-brand">C</span>
          Counter
        </p>
        <div className="relative z-10">
          <p className="max-w-lg text-5xl font-extrabold leading-[1.05] tracking-tight">
            Take the order. Fire it to the kitchen. Close the table.
          </p>
          <p className="mt-5 max-w-md text-lg text-white/75">
            One screen for the floor, one for the kitchen, and one for whoever runs the place.
          </p>
        </div>
        <div className="absolute right-12 top-24 w-64 rotate-2 rounded-2xl bg-white p-5 text-sm text-ink shadow-2xl" aria-hidden>
          <div className="flex items-center justify-between">
            <p className="font-bold">Current order</p>
            <span className="rounded-lg bg-free/10 px-2 py-0.5 text-xs font-semibold text-free">T4</span>
          </div>
          {[['2× Paneer Tikka', 'Cooking'], ['1× Dal Makhani', 'Ready'], ['3× Butter Naan', 'Sent']].map(([name, st]) => (
            <div key={name} className="mt-3 flex items-center justify-between">
              <span>{name}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${st === 'Ready' ? 'bg-free/15 text-free' : st === 'Cooking' ? 'bg-seated/15 text-[#a86a00]' : 'bg-steel-deep text-ink-soft'}`}>{st}</span>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10" aria-hidden />
      </section>

      <section className="flex items-center justify-center bg-panel px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="flex items-center gap-2 text-xl font-extrabold lg:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">C</span>Counter</p>
            <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-sm text-ink-soft">Use the email your manager set up for you.</p>
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
