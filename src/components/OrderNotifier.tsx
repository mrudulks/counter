'use client';

import { useOrderEvents, type OrderEvent } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { money } from '@/lib/format';
import type { OrderItem } from '@/lib/types';
import { useToast } from './toast';

let audio: AudioContext | null = null;

/** Short two-note chime, like a pass bell. Silently does nothing if audio is blocked. */
function chime() {
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.5);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.5);
    });
  } catch {
    // Autoplay policy or no audio device
  }
}

const list = (items: OrderItem[]) => items.map((i) => `${i.quantity}× ${i.name}`).join(', ');

/** Turns realtime order events from teammates into toasts (and a chime where someone must act). */
export function OrderNotifier() {
  const { user, restaurant } = useSession();
  const notify = useToast();

  useOrderEvents((e: OrderEvent) => {
    if (!user || e.actor.id === user._id) return;

    const { order } = e;
    const where = order.table?.name ?? `Takeaway #${order.orderNumber}`;
    const touched = order.items.filter((i) => e.itemIds?.includes(i._id));
    const cooks = user.role !== 'staff';
    const serves = user.role !== 'kitchen';

    switch (e.type) {
      case 'created':
        if (cooks) {
          notify(list(order.items), 'notice', `New order #${order.orderNumber} for ${where}`);
          chime();
        }
        break;
      case 'items-added':
        if (cooks) {
          notify(list(touched), 'notice', `${where} added to order #${order.orderNumber}`);
          chime();
        }
        break;
      case 'items-updated': {
        const ready = touched.filter((i) => i.status === 'ready');
        const voided = touched.filter((i) => i.status === 'cancelled');
        if (serves && ready.length) {
          notify(list(ready), 'notice', `Ready to serve at ${where}`);
          chime();
        }
        if (cooks && voided.length) notify(list(voided), 'notice', `Voided at ${where}`);
        break;
      }
      case 'completed':
        notify(`${money(order.total, restaurant?.currency)} by ${order.paymentMethod?.toUpperCase()}`, 'notice', `${where} paid, order #${order.orderNumber} done`);
        break;
      case 'cancelled':
        notify(`by ${e.actor.name}`, 'notice', `Order #${order.orderNumber} for ${where} cancelled`);
        break;
    }
  });

  return null;
}
