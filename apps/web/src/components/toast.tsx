'use client';

import { createContext, useCallback, useContext, useState } from 'react';

/** ok/error answer the user's own action; notice is news from someone else (realtime). */
type Tone = 'ok' | 'error' | 'notice';
interface Toast {
  id: number;
  message: string;
  title?: string;
  tone: Tone;
}

type Notify = (message: string, tone?: Tone, title?: string) => void;

const ToastContext = createContext<Notify>(() => {});

const DURATION: Record<Tone, number> = { ok: 3500, error: 5000, notice: 8000 };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback<Notify>(
    (message, tone = 'ok', title) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-4), { id, message, title, tone }]);
      setTimeout(() => dismiss(id), DURATION[tone]);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end xl:bottom-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            onClick={() => dismiss(t.id)}
            className={`toast-in pointer-events-auto w-full max-w-sm cursor-pointer rounded-md px-4 py-3 text-sm shadow-lg sm:w-80 ${
              t.tone === 'error'
                ? 'bg-chili font-medium text-white'
                : t.tone === 'notice'
                  ? 'border-l-4 border-seated bg-paper text-ink'
                  : 'bg-ink font-medium text-steel'
            }`}
          >
            {t.title && <p className="font-bold">{t.title}</p>}
            <p className={t.tone === 'notice' ? 'mt-0.5 font-ticket' : ''}>{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
