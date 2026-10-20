import type { ItemStatus } from '@/lib/types';

const STYLES: Record<ItemStatus, string> = {
  pending: 'bg-steel-deep text-ink-soft',
  preparing: 'bg-seated/15 text-[#a86a00]',
  ready: 'bg-free/15 text-free',
  served: 'bg-transparent text-ink-soft border border-line',
  cancelled: 'bg-chili/10 text-chili line-through',
};

const LABELS: Record<ItemStatus, string> = {
  pending: 'Sent',
  preparing: 'Cooking',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Voided',
};

export function StatusPill({ status }: { status: ItemStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}>{LABELS[status]}</span>
  );
}
