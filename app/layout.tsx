import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DAT.co Monitor',
  description: 'Monitor Strategy\'s Premium to NAV and mNAV over time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
