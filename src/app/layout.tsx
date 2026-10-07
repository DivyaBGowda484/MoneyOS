import type { Metadata, Viewport } from 'next';
import '@carbon/styles/css/styles.css';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'MoneyOS — Smart Personal Finance for India',
  description: 'Fast, clean personal finance web app in Indian Rupees (₹) with voice entry, OCR bills, salary planner, investments & family IPO tracker.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0f62fe',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
