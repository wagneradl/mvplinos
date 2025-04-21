'use client';

import { useState, useEffect } from 'react';
import { Box, Container, CircularProgress } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import LoginPage from '@/app/login/page';
import { Navigation } from '@/components/Navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}>
          <CircularProgress />
        </Box>
      </>
    );
  }
  
  return <AppContent>{children}</AppContent>;
}

// Componente interno que será renderizado apenas quando o contexto de autenticação estiver pronto
function AppContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  
  // Mostrar tela de carregamento enquanto verifica a autenticação
  if (loading) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  // Se não estiver autenticado e não estiver na página de login, mostrar o componente de login diretamente
  if (!isAuthenticated && !isLoginPage) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh' }}>
          <LoginPage />
        </Box>
      </>
    );
  }
  
  // Se estiver na página de login (explicitamente) ou já tratada acima
  if (isLoginPage) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh' }}>
          {children}
        </Box>
      </>
    );
  }
  
  // Mostrar layout completo com navegação apenas quando autenticado
  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Navigation />
        <Box component="main" sx={{ 
          flexGrow: 1,
          pt: { xs: 7, sm: 2 },
          px: { xs: 2, sm: 3 },
          pb: 4,
          width: '100%',
          overflow: 'auto'
        }}>
          <Container maxWidth="lg" sx={{ 
            my: 2,
            height: '100%'
          }}>
            {children}
          </Container>
        </Box>
      </Box>
    </>
  );
}
