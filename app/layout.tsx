import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TradeWithNine Challenge Dashboard',
  description: 'Local dashboard for TradeWithNine trading challenges'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
