import type { Metadata, Viewport } from 'next';
import { Archivo, Courier_Prime } from 'next/font/google';
import { SessionProvider } from '@/lib/session';
import { ToastProvider } from '@/components/toast';
import { RealtimeProvider } from '@/lib/realtime';
import './globals.css';

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'] });
const courier = Courier_Prime({ variable: '--font-courier', subsets: ['latin'], weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Counter — Restaurant POS',
  description: 'Orders, tables and kitchen tickets for your restaurants',
};

export const viewport: Viewport = { themeColor: '#1e2b33' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${archivo.variable} ${courier.variable} h-full antialiased`}>
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
