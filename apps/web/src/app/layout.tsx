import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { SessionProvider } from '@/lib/session';
import { ToastProvider } from '@/components/toast';
import { RealtimeProvider } from '@/lib/realtime';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Counter — Restaurant POS',
  description: 'Orders, tables and kitchen tickets for your restaurants',
};

export const viewport: Viewport = { themeColor: '#f5f5fa' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>
          <RealtimeProvider>
            <ToastProvider>{children}</ToastProvider>
          </RealtimeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
