import React from 'react';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Login | Lino's Panificadora",
  description: "Faça login no sistema da Lino's Panificadora",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
