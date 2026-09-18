import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWAD COMMAND',
  description: 'Private 3D AI command center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
