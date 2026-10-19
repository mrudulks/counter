'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { errorMessage, money } from '@/lib/format';
import type { MenuItem, Order, OrderItem, PaymentMethod, Table } from '@/lib/types';
import { Button, ErrorNote, Input, Loading, Modal, VegMark } from './ui';
import { StatusPill } from './StatusPill';
import { useToast } from './toast';

interface DraftLine {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

type Props =
  | { mode: 'new'; table: Table | null } // table null = takeaway
  | { mode: 'existing'; orderId: string };

export function OrderScreen(props: Props) {
  const scope = useScope()!;
  const { restaurant } = useSession();
  const currency = restaurant?.currency ?? 'INR';
  const router = useRouter();
  const notify = useToast();

  const menu = useFetch<MenuItem[]>(`${scope}/menu`);
  const existing = useFetch<Order>(props.mode === 'existing' ? `${scope}/orders/${props.orderId}` : null, 8000);
  const order = existing.data;

  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set((menu.data ?? []).map((m) => m.category)))],
    [menu.data],
  );
  const visible = (menu.data ?? []).filter(
    (m) =>
      (category === 'All' || m.category === category) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase())),
  );

  const draftTotal = draft.reduce((s, l) => s + l.menuItem.price * l.quantity, 0);
  const isOpen = props.mode === 'new' || order?.status === 'open';
  const table = props.mode === 'new' ? props.table : order?.table;
  const title = table ? table.name : 'Takeaway';

  function add(item: MenuItem) {
    setDraft((d) => {
      const found = d.find((l) => l.menuItem._id === item._id && !l.notes);
      if (found) return d.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      return [...d, { menuItem: item, quantity: 1, notes: '' }];
    });
  }

  function changeQty(index: number, delta: number) {
    setDraft((d) =>
      d.flatMap((l, i) => (i !== index ? [l] : l.quantity + delta <= 0 ? [] : [{ ...l, quantity: l.quantity + delta }])),
    );
  }

  async function run<T>(key: string, fn: () => Promise<T>, success?: string) {
    setBusy(key);
    try {
      const result = await fn();
      if (success) notify(success);
      return result;
    } catch (err) {
      notify(errorMessage(err), 'error');
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  async function sendToKitchen() {
    const items = draft.map((l) => ({ menuItem: l.menuItem._id, quantity: l.quantity, notes: l.notes || undefined }));
    if (props.mode === 'new') {
      const created = await run(
        'send',
        () =>
          api<Order>(`${scope}/orders`, 'POST', {
            type: props.table ? 'dine-in' : 'takeaway',
            table: props.table?._id,
            items,
          }),
        'Sent to kitchen',
      );
      if (created) router.replace(`/pos/order/${created._id}`);
    } else {
      const updated = await run(
        'send',
        () => api<Order>(`${scope}/orders/${props.orderId}/items`, 'POST', { items }),
        'Added items sent to kitchen',
      );
      if (updated) {
        existing.setData(updated);
        setDraft([]);
      }
    }
  }

  async function updateItem(item: OrderItem, body: Partial<Pick<OrderItem, 'status' | 'quantity'>>) {
    const updated = await run(item._id, () => api<Order>(`${scope}/orders/${order!._id}/items/${item._id}`, 'PATCH', body));
    if (updated) existing.setData(updated);
  }

  async function serveAllReady() {
    const ready = order!.items.filter((i) => i.status === 'ready');
    for (const item of ready) await updateItem(item, { status: 'served' });
  }

  async function cancelOrder() {
    if (!confirm('Cancel this whole order? Items not yet served will be voided.')) return;
    const updated = await run('cancel', () => api<Order>(`${scope}/orders/${order!._id}/cancel`, 'POST'), 'Order cancelled');
    if (updated) router.push('/floor');
  }

  async function pay(method: PaymentMethod) {
    const updated = await run(
      'pay',
      () => api<Order>(`${scope}/orders/${order!._id}/complete`, 'POST', { paymentMethod: method }),
      `Paid by ${method.toUpperCase()}. ${title} is free again.`,
    );
    if (updated) {
      setPayOpen(false);
      router.push('/floor');
    }
  }

  if (menu.loading || (props.mode === 'existing' && existing.loading && !order)) return <Loading />;
  if (menu.error) return <ErrorNote message={menu.error} />;
  if (props.mode === 'existing' && !order) return <ErrorNote message={existing.error ?? 'Order not found'} />;

  const readyCount = order?.items.filter((i) => i.status === 'ready').length ?? 0;
  const unservedCount = order?.items.filter((i) => ['pending', 'preparing', 'ready'].includes(i.status)).length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6 pb-20 xl:grid-cols-[1fr_24rem] xl:pb-0">
      {/* Menu */}
      <section aria-label="Menu" className={`min-w-0 ${isOpen ? '' : 'pointer-events-none opacity-40'}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={() => router.push('/floor')} className="text-sm text-ink-soft hover:text-ink">
              Back to floor
            </button>
            <h1 className="text-4xl font-black tracking-tight [font-stretch:70%]">{title}</h1>
          </div>
          <Input
            type="search"
            placeholder="Find a dish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-56"
            aria-label="Find a dish"
          />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categories">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                category === c ? 'bg-ink text-steel' : 'bg-panel text-ink hover:bg-steel-deep'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="py-10 text-center text-ink-soft">
            {menu.data?.length ? 'No dishes match that search.' : 'The menu is empty. An admin can add dishes under Menu.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
            {visible.map((m) => {
              const inDraft = draft.filter((l) => l.menuItem._id === m._id).reduce((s, l) => s + l.quantity, 0);
              return (
                <button
                  key={m._id}
                  disabled={!m.isAvailable}
                  onClick={() => add(m)}
                  className="relative flex min-h-24 flex-col justify-between rounded-md border border-line bg-panel p-3 text-left transition-colors hover:border-teal hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="flex items-start gap-2 font-semibold leading-snug">
                    <VegMark veg={m.isVeg} />
                    <span className="-mt-0.5">{m.name}</span>
                  </span>
                  <span className="mt-2 text-sm text-ink-soft">
                    {m.isAvailable ? money(m.price, currency) : 'Sold out'}
                  </span>
                  {inDraft > 0 && (
                    <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-teal px-1.5 text-xs font-bold text-white">
                      {inDraft}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Ticket */}
      <aside id="ticket" className="min-w-0 scroll-mt-36 lg:scroll-mt-6 xl:sticky xl:top-8 xl:self-start" aria-label="Order">
        <div className="ticket px-5 pb-6 pt-7">
          <div className="flex items-baseline justify-between border-b border-dashed border-ink/30 pb-3">
            <p className="text-lg font-bold">{order ? `#${String(order.orderNumber).padStart(4, '0')}` : 'New order'}</p>
            <p className="text-sm">{order?.status === 'open' || !order ? title : order.status.toUpperCase()}</p>
          </div>

          {order && order.items.length > 0 && (
            <ul className="divide-y divide-dashed divide-ink/20">
              {order.items.map((item) => (
                <li key={item._id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className={item.status === 'cancelled' ? 'text-ink-soft line-through' : ''}>
                      {item.quantity}× {item.name}
                    </p>
                    <p className="shrink-0">{money(item.price * item.quantity, currency)}</p>
                  </div>
                  {item.notes && <p className="text-sm text-ink-soft">“{item.notes}”</p>}
                  {order.status === 'open' && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 font-sans">
                      <StatusPill status={item.status} />
                      {item.status === 'ready' && (
                        <button onClick={() => updateItem(item, { status: 'served' })} disabled={busy === item._id} className="text-xs font-semibold text-teal underline">
                          Mark served
                        </button>
                      )}
                      {item.status === 'pending' && (
                        <>
                          <button onClick={() => updateItem(item, { quantity: item.quantity + 1 })} disabled={!!busy} className="text-xs font-semibold text-ink-soft underline" aria-label={`One more ${item.name}`}>+1</button>
                          {item.quantity > 1 && (
                            <button onClick={() => updateItem(item, { quantity: item.quantity - 1 })} disabled={!!busy} className="text-xs font-semibold text-ink-soft underline" aria-label={`One less ${item.name}`}>−1</button>
                          )}
                          <button onClick={() => updateItem(item, { status: 'cancelled' })} disabled={!!busy} className="text-xs font-semibold text-chili underline">
                            Void
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isOpen && (
            <div className={order?.items.length ? 'mt-3 border-t-2 border-ink/70 pt-3' : 'pt-3'}>
              {draft.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-soft">
                  {order ? 'Tap dishes to add more to this order.' : 'Tap dishes on the left to start the order.'}
                </p>
              ) : (
                <>
                  <p className="mb-1 text-sm font-bold">Not sent yet</p>
                  <ul>
                    {draft.map((l, i) => (
                      <li key={`${l.menuItem._id}-${i}`} className="py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate">{l.menuItem.name}</span>
                          <span className="flex items-center gap-1 font-sans">
                            <button onClick={() => changeQty(i, -1)} className="h-8 w-8 rounded border border-line bg-white text-lg leading-none" aria-label={`One less ${l.menuItem.name}`}>−</button>
                            <span className="w-6 text-center font-semibold tabular-nums">{l.quantity}</span>
                            <button onClick={() => changeQty(i, 1)} className="h-8 w-8 rounded border border-line bg-white text-lg leading-none" aria-label={`One more ${l.menuItem.name}`}>+</button>
                          </span>
                        </div>
                        {noteFor === `${i}` ? (
                          <Input
                            autoFocus
                            className="mt-1 h-8 font-sans"
                            placeholder="e.g. less spicy"
                            value={l.notes}
                            onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))}
                            onBlur={() => setNoteFor(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setNoteFor(null)}
                          />
                        ) : (
                          <button onClick={() => setNoteFor(`${i}`)} className="text-xs text-ink-soft underline">
                            {l.notes ? `“${l.notes}”` : 'Add note'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button size="lg" className="mt-3 w-full font-sans" onClick={sendToKitchen} busy={busy === 'send'}>
                    Send to kitchen ({money(draftTotal, currency)})
                  </Button>
                </>
              )}
            </div>
          )}

          {order && (
            <dl className="mt-4 space-y-1 border-t border-dashed border-ink/30 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal, currency)}</dd></div>
              <div className="flex justify-between"><dt>Tax ({restaurant?.taxPercent ?? 0}%)</dt><dd>{money(order.tax, currency)}</dd></div>
              <div className="flex justify-between pt-1 text-lg font-bold"><dt>Total</dt><dd>{money(order.total, currency)}</dd></div>
              {order.paymentMethod && <div className="flex justify-between text-ink-soft"><dt>Paid by</dt><dd>{order.paymentMethod.toUpperCase()}</dd></div>}
            </dl>
          )}
        </div>

        {order?.status === 'open' && (
          <div className="mt-4 space-y-2">
            {readyCount > 0 && (
              <Button variant="secondary" className="w-full" onClick={serveAllReady} disabled={!!busy}>
                Mark {readyCount} ready {readyCount === 1 ? 'item' : 'items'} served
              </Button>
            )}
            <Button size="lg" className="w-full" onClick={() => setPayOpen(true)} disabled={unservedCount > 0 || draft.length > 0}>
              Take payment of {money(order.total, currency)}
            </Button>
            {unservedCount > 0 && (
              <p className="text-center text-sm text-ink-soft">
                {unservedCount} {unservedCount === 1 ? 'item is' : 'items are'} still with the kitchen or waiting to be served.
              </p>
            )}
            <Button variant="ghost" className="w-full text-chili hover:text-chili" onClick={cancelOrder} busy={busy === 'cancel'}>
              Cancel order
            </Button>
          </div>
        )}
      </aside>

      {/* On narrow screens the ticket sits below the menu; keep a way to reach it */}
      {(draft.length > 0 || order) && (
        <a
          href="#ticket"
          className="fixed inset-x-4 bottom-4 z-20 flex h-14 items-center justify-between rounded-md bg-ink px-5 font-semibold text-steel shadow-xl xl:hidden"
        >
          <span>{draft.length ? `${draft.reduce((s, l) => s + l.quantity, 0)} not sent yet` : 'View order'}</span>
          <span>{money((order?.total ?? 0) + draftTotal, currency)}</span>
        </a>
      )}

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Collect ${money(order?.total ?? 0, currency)}`}>
        <p className="mb-4 text-ink-soft">How is the guest paying?</p>
        <div className="grid grid-cols-3 gap-2">
          {(['cash', 'card', 'upi'] as PaymentMethod[]).map((m) => (
            <Button key={m} size="lg" variant="secondary" onClick={() => pay(m)} disabled={busy === 'pay'}>
              {m === 'upi' ? 'UPI' : m[0].toUpperCase() + m.slice(1)}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
