'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, CircularProgress } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';

/**
 * AdminLayout — layout com sidebar fixa + nav completa para papéis INTERNOS.
 * Verifica autenticação e redireciona conforme o tipo de papel.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, usuario, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Redirecionar CLIENTE para o portal
    if (usuario?.papel?.tipo === 'CLIENTE') {
      router.replace('/portal/dashboard');
      return;
    }

    setChecked(true);
  }, [isAuthenticated, usuario, loading, router]);

  // Loading state
  if (loading || !checked) {
    return (
      <>
        <CssBaseline />
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
      </>
    );
  }

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Navigation />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: { xs: 7, sm: 2 },
            px: { xs: 2, sm: 3 },
            pb: 4,
            width: '100%',
            overflow: 'auto',
          }}
        >
          <Container
            maxWidth="lg"
            sx={{
              my: 2,
              height: '100%',
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>
    </>
  );
}
