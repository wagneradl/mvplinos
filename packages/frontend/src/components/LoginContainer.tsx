'use client';

import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { Providers } from '@/components/Providers';

export function LoginContainer({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <CssBaseline />
      <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Lino&apos;s Panificadora</h1>
            <p className="mt-2 text-sm text-gray-600">Sistema de gerenciamento</p>
          </div>
          {children}
        </div>
      </div>
    </Providers>
  );
}
