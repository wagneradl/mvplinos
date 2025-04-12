import React from 'react';
import { Inter } from 'next/font/google';
import CssBaseline from '@mui/material/CssBaseline';
import { Providers } from '@/components/Providers';
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
        <Providers>
          <CssBaseline />
          <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">Lino&apos;s Panificadora</h1>
                <p className="mt-2 text-sm text-gray-600">Sistema de gerenciamento</p>
              </div>
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
