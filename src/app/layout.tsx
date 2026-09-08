import type { Metadata } from 'next';
import { Geist_Mono, Inter_Tight } from 'next/font/google';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-ui',
  weight: ['200', '300', '400', '500'],
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-num',
});

export const metadata: Metadata = {
  title: 'AWAD COMMAND',
  description: 'Private 3D AI command center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
