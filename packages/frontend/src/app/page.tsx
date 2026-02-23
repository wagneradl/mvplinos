'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Root page — redirects based on auth state and role type.
 * INTERNO users → /dashboard (admin area)
 * CLIENTE users → /portal/dashboard (portal area)
 * Not authenticated → /login
 */
export default function RootPage() {
  const { isAuthenticated, usuario, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    const isCliente = usuario?.papel?.tipo === 'CLIENTE';
    router.replace(isCliente ? '/portal/dashboard' : '/dashboard');
  }, [isAuthenticated, usuario, loading, router]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
