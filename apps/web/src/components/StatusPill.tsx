import type { ItemStatus } from '@/lib/types';

const STYLES: Record<ItemStatus, string> = {
  pending: 'bg-steel-deep text-ink',
  preparing: 'bg-seated/20 text-[#7a5509]',
  ready: 'bg-free text-white',
  served: 'bg-transparent text-ink-soft border border-line',
  cancelled: 'bg-transparent text-chili line-through',
};

const LABELS: Record<ItemStatus, string> = {
  pending: 'Sent',
  preparing: 'Cooking',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
};

export function StatusPill({ status }: { status: ItemStatus }) {
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>{LABELS[status]}</span>
  );
}
