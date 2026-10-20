'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Minus, NotebookPen, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useScope, useSession } from '@/lib/session';
import { useFetch } from '@/lib/useFetch';
import { useOrderEvents } from '@/lib/realtime';
import { errorMessage, money } from '@/lib/format';
import type { MenuItem, Order, OrderItem, PaymentMethod, Table } from '@/lib/types';
import { Button, Card, DishImage, ErrorNote, Input, Loading, Modal, VegMark } from './ui';
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

function Stepper({ value, onMinus, onPlus, label, disabled }: { value: number; onMinus: () => void; onPlus: () => void; label: string; disabled?: boolean }) {
  return (
    <span className="inline-flex h-8 items-center rounded-lg border border-line bg-white">
      <button onClick={onMinus} disabled={disabled} className="flex h-full w-8 items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40" aria-label={`One less ${label}`}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button onClick={onPlus} disabled={disabled} className="flex h-full w-8 items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40" aria-label={`One more ${label}`}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export function OrderScreen(props: Props) {
  const scope = useScope()!;
  const { restaurant } = useSession();
  const currency = restaurant?.currency ?? 'INR';
  const router = useRouter();
  const notify = useToast();

  const menu = useFetch<MenuItem[]>(`${scope}/menu`);
  const existing = useFetch<Order>(props.mode === 'existing' ? `${scope}/orders/${props.orderId}` : null, 30000);
  const order = existing.data;

  useOrderEvents((e) => {
    if (props.mode === 'existing' && e.order._id === props.orderId) existing.setData(e.order);
  });

  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<number | null>(null);

  const imageById = useMemo(() => new Map((menu.data ?? []).map((m) => [m._id, m.image])), [menu.data]);
  const categories = useMemo(
    () => ['All', ...Array.from(new Set((menu.data ?? []).map((m) => m.category)))],
    [menu.data],
  );
  const visible = (menu.data ?? []).filter(
    (m) =>
      (category === 'All' || m.category === category) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase())),
  );

  const draftCount = draft.reduce((s, l) => s + l.quantity, 0);
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
    const itemIds = order!.items.filter((i) => i.status === 'ready').map((i) => i._id);
    const updated = await run('serve', () =>
      api<Order>(`${scope}/orders/${order!._id}/items/status`, 'POST', { itemIds, status: 'served' }),
    );
    if (updated) existing.setData(updated);
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
    <div className="grid grid-cols-1 gap-6 pb-20 xl:grid-cols-[1fr_23rem] xl:pb-0">
      {/* Menu */}
      <Card className={`min-w-0 p-4 sm:p-5 ${isOpen ? '' : 'pointer-events-none opacity-50'}`}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={() => router.push('/floor')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-soft hover:text-ink" aria-label="Back to floor">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold">{title}</h1>
          <label className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
            <Input type="search" placeholder="Search menu items…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search menu items" />
          </label>
        </div>

        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Categories">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                category === c ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-steel hover:text-ink'
              }`}
            >
              {c === 'All' ? 'All items' : c}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-ink-soft">
            {menu.data?.length ? 'No dishes match that search.' : 'The menu is empty. An admin can add dishes under Menu.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {visible.map((m) => {
              const inDraft = draft.filter((l) => l.menuItem._id === m._id).reduce((s, l) => s + l.quantity, 0);
              return (
                <button
                  key={m._id}
                  disabled={!m.isAvailable}
                  onClick={() => add(m)}
                  className={`group relative flex flex-col rounded-2xl border bg-white p-2.5 text-left transition-all hover:shadow-[var(--shadow-card)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                    inDraft ? 'border-brand ring-2 ring-brand/15' : 'border-line hover:border-brand/40'
                  }`}
                >
                  <DishImage src={m.image} alt={m.name} className="aspect-[4/3] w-full rounded-xl" />
                  <span className="mt-2.5 flex items-start gap-1.5 px-1 text-sm font-semibold leading-snug">
                    <VegMark veg={m.isVeg} />
                    <span className="-mt-0.5 line-clamp-2">{m.name}</span>
                  </span>
                  <span className="mt-auto flex items-center justify-between px-1 pt-2">
                    <span className="text-sm font-bold text-brand">{m.isAvailable ? money(m.price, currency) : 'Sold out'}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white" aria-hidden>
                      <Plus className="h-4 w-4" />
                    </span>
                  </span>
                  {inDraft > 0 && (
                    <span className="absolute right-4 top-4 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white shadow">
                      {inDraft}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Current order */}
      <aside id="ticket" className="min-w-0 scroll-mt-36 lg:scroll-mt-6 xl:sticky xl:top-8 xl:self-start" aria-label="Current order">
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{order ? `Order #${order.orderNumber}` : 'Current order'}</h2>
              {order?.createdBy && <p className="text-xs text-ink-soft">Taken by {order.createdBy.name}</p>}
            </div>
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${order && order.status !== 'open' ? 'bg-steel-deep text-ink-soft' : 'bg-free/10 text-free'}`}>
              {order && order.status !== 'open' ? order.status[0].toUpperCase() + order.status.slice(1) : title}
            </span>
          </div>

          {order && order.items.length > 0 && (
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((item) => (
                <li key={item._id} className="flex gap-3 py-3">
                  <DishImage src={imageById.get(item.menuItem)} alt={item.name} className="h-12 w-12 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${item.status === 'cancelled' ? 'text-ink-soft line-through' : ''}`}>
                        {item.quantity}× {item.name}
                      </p>
                      <p className="shrink-0 text-sm font-semibold">{money(item.price * item.quantity, currency)}</p>
                    </div>
                    {item.notes && <p className="text-xs text-ink-soft">“{item.notes}”</p>}
                    {order.status === 'open' && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusPill status={item.status} />
                        {item.status === 'ready' && (
                          <button onClick={() => updateItem(item, { status: 'served' })} disabled={busy === item._id} className="text-xs font-semibold text-brand hover:underline">
                            Mark served
                          </button>
                        )}
                        {item.status === 'pending' && (
                          <>
                            <Stepper
                              value={item.quantity}
                              label={item.name}
                              disabled={!!busy}
                              onMinus={() => (item.quantity > 1 ? updateItem(item, { quantity: item.quantity - 1 }) : updateItem(item, { status: 'cancelled' }))}
                              onPlus={() => updateItem(item, { quantity: item.quantity + 1 })}
                            />
                            <button onClick={() => updateItem(item, { status: 'cancelled' })} disabled={!!busy} className="rounded-lg p-1.5 text-chili hover:bg-chili/10" aria-label={`Void ${item.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isOpen && (
            <div className={order?.items.length ? 'mt-2 border-t border-dashed border-line pt-4' : 'mt-4'}>
              {draft.length === 0 ? (
                <p className="rounded-xl bg-steel px-4 py-6 text-center text-sm text-ink-soft">
                  {order ? 'Tap dishes to add another round.' : 'Tap dishes to start the order.'}
                </p>
              ) : (
                <>
                  <p className="mb-1 text-xs font-semibold text-brand">Not sent yet</p>
                  <ul className="divide-y divide-line">
                    {draft.map((l, i) => (
                      <li key={`${l.menuItem._id}-${i}`} className="py-3">
                        <div className="flex items-center gap-3">
                          <DishImage src={l.menuItem.image} alt={l.menuItem.name} className="h-12 w-12 shrink-0 rounded-xl" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{l.menuItem.name}</p>
                            <p className="text-xs text-ink-soft">{money(l.menuItem.price, currency)}</p>
                          </div>
                          <Stepper value={l.quantity} label={l.menuItem.name} onMinus={() => changeQty(i, -1)} onPlus={() => changeQty(i, 1)} />
                          <button onClick={() => changeQty(i, -l.quantity)} className="rounded-lg p-1.5 text-chili hover:bg-chili/10" aria-label={`Remove ${l.menuItem.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {noteFor === i ? (
                          <Input
                            autoFocus
                            className="mt-2 h-8"
                            placeholder="e.g. less spicy"
                            value={l.notes}
                            onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))}
                            onBlur={() => setNoteFor(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setNoteFor(null)}
                          />
                        ) : (
                          <button onClick={() => setNoteFor(i)} className="mt-1.5 flex items-center gap-1 pl-[3.75rem] text-xs text-ink-soft hover:text-brand">
                            {l.notes ? `“${l.notes}”` : <><NotebookPen className="h-3 w-3" aria-hidden /> Add note</>}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button size="lg" className="mt-3 w-full" onClick={sendToKitchen} busy={busy === 'send'}>
                    Send {draftCount} to kitchen ({money(draftTotal, currency)})
                  </Button>
                </>
              )}
            </div>
          )}

          {order && (
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd className="text-ink">{money(order.subtotal, currency)}</dd></div>
              <div className="flex justify-between text-ink-soft"><dt>Tax ({restaurant?.taxPercent ?? 0}%)</dt><dd className="text-ink">{money(order.tax, currency)}</dd></div>
              <div className="flex justify-between border-t border-dashed border-line pt-3 text-base font-bold"><dt>Total</dt><dd>{money(order.total, currency)}</dd></div>
              {order.paymentMethod && <div className="flex justify-between text-ink-soft"><dt>Paid by</dt><dd>{order.paymentMethod.toUpperCase()}</dd></div>}
            </dl>
          )}

          {order?.status === 'open' && (
            <div className="mt-5 space-y-2">
              {readyCount > 0 && (
                <Button variant="secondary" className="w-full" onClick={serveAllReady} busy={busy === 'serve'}>
                  Mark {readyCount} ready {readyCount === 1 ? 'item' : 'items'} served
                </Button>
              )}
              <Button size="lg" className="w-full" onClick={() => setPayOpen(true)} disabled={unservedCount > 0 || draft.length > 0}>
                Take payment of {money(order.total, currency)}
              </Button>
              {unservedCount > 0 && (
                <p className="text-center text-xs text-ink-soft">
                  {unservedCount} {unservedCount === 1 ? 'item is' : 'items are'} still with the kitchen or waiting to be served.
                </p>
              )}
              <Button variant="ghost" className="w-full text-chili hover:text-chili" onClick={cancelOrder} busy={busy === 'cancel'}>
                Cancel order
              </Button>
            </div>
          )}
        </Card>
      </aside>

      {/* On narrow screens the order panel sits below the menu; keep a way to reach it */}
      {(draft.length > 0 || order) && (
        <a href="#ticket" className="fixed inset-x-4 bottom-4 z-20 flex h-14 items-center justify-between rounded-2xl bg-brand px-5 font-semibold text-white shadow-xl shadow-brand/30 xl:hidden">
          <span>{draft.length ? `${draftCount} not sent yet` : 'View order'}</span>
          <span>{money((order?.total ?? 0) + draftTotal, currency)}</span>
        </a>
      )}

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Collect ${money(order?.total ?? 0, currency)}`}>
        <p className="mb-4 text-sm text-ink-soft">How is the guest paying?</p>
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
