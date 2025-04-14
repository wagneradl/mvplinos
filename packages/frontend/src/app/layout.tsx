'use client';

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import { Box, Container, CircularProgress } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { Providers } from '@/components/Providers';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import LoginPage from './login/page';

const inter = Inter({ subsets: ['latin'] });

const DRAWER_WIDTH = 240; // Deve ser o mesmo valor definido no componente Navigation

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  
  // Garantir que o componente só renderize no cliente
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <html lang="pt-BR">
        <body className={inter.className}>
          <Providers>
            <CssBaseline />
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh' 
              }}
            >
              <CircularProgress />
            </Box>
          </Providers>
        </body>
      </html>
    );
  }
  
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <AppContent>{children}</AppContent>
        </Providers>
      </body>
    </html>
  );
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
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh' 
          }}
        >
          <CircularProgress />
        </Box>
      </>
    );
  }

  // Se não estiver autenticado e não estiver na página de login, mostrar o componente de login diretamente
  // em vez de esperar redirecionamento - isso evita o flash da dashboard
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
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1,
            // No desktop (sm e acima), não precisamos de padding-top, pois a navbar não existe
            // No mobile (xs), precisamos de padding-top para ficar abaixo da navbar
            pt: { xs: 7, sm: 2 },
            px: { xs: 2, sm: 3 },
            pb: 4,
            width: '100%', // Use a largura total disponível após o drawer
            overflow: 'auto'
          }}
        >
          <Container 
            maxWidth="lg" 
            sx={{ 
              my: 2,
              height: '100%'
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>
    </>
  );
}
