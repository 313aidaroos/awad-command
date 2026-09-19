import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWAD COMMAND',
  description: 'Private AI command center for the Apixis family of companies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Press+Start+2P&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased scanlines">{children}</body>
    </html>
  );
}
