'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { UtensilsCrossed } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-sm shadow-brand/25 hover:bg-brand-deep',
  secondary: 'bg-panel text-ink border border-line hover:border-brand/40 hover:text-brand',
  ghost: 'text-ink-soft hover:bg-steel-deep hover:text-ink',
  danger: 'bg-chili text-white hover:bg-[#c93a3f]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  busy?: boolean;
}

export function Button({ variant = 'primary', size = 'md', busy, className = '', children, disabled, ...rest }: ButtonProps) {
  const sizes = { sm: 'h-8 px-3 text-sm rounded-lg', md: 'h-10 px-4 text-sm rounded-xl', lg: 'h-12 px-6 text-[15px] rounded-xl' };
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${sizes[size]} ${className}`}
    >
      {busy ? 'Working…' : children}
    </button>
  );
}

const inputClass =
  'h-10 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} {...rest} className={`${inputClass} ${className}`} />;
});

export function Select({ className = '', ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={`${inputClass} ${className}`} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl bg-panel p-0 text-ink shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="-m-1 rounded p-1 text-ink-soft hover:text-ink" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-panel/60 px-6 py-14 text-center">
      <p className="text-base font-semibold">{title}</p>
      {children && <div className="mt-2 text-ink-soft">{children}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-10 text-center text-ink-soft">{label}</p>;
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl border border-chili/30 bg-chili/10 px-4 py-3 text-sm text-chili">{message}</p>;
}

export function VegMark({ veg }: { veg: boolean }) {
  // The standard Indian food-labelling mark: green square-dot for veg, red for non-veg
  return (
    <span
      title={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border-[1.5px] ${veg ? 'border-free' : 'border-chili'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? 'bg-free' : 'bg-chili'}`} />
    </span>
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-panel shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

/** Dish photo, or a neutral placeholder when the dish has none (or the image fails to load). */
export function DishImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-steel-deep ${className}`}>
      <UtensilsCrossed className="absolute inset-0 m-auto h-1/3 w-1/3 text-ink-soft/30" aria-hidden />
      {src && (
        // Images live on the restaurant's own R2 domain, unknown at build time, so next/image isn't used
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="relative h-full w-full object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </div>
  );
}
