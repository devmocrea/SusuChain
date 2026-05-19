import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'susuchain',
  description: 'A new Celo blockchain project',
  other: {
    'talentapp:project_verification': '1f6d642eee89f69a3ea7295e40bc0b45d4c03f087149147f1f373d6908a81f7a1c7bd54fc05283cab1f93697da218a7b364183a14489cb83c174e9fd79e9b31f'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}
