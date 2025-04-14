'use client';

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import { Box, Container, CircularProgress, Toolbar } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { Providers } from '@/components/Providers';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import LoginPage from './login/page';

const inter = Inter({ subsets: ['latin'] });

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
  const router = useRouter();
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
  
  // Mostrar layout completo com navegação apenas quando autenticado (aqui já sabemos que está autenticado)
  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Navigation />
        {/* Ajuste do box do conteúdo principal, garantindo que o conteúdo não fique sob a navbar */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3,
            width: '100%',
            overflow: 'auto'
          }}
        >
          {/* Espaçamento para evitar que o conteúdo fique sob o AppBar */}
          <Toolbar />
          {/* Container do conteúdo principal com margens ajustadas */}
          <Container 
            maxWidth="lg" 
            sx={{ 
              mt: 2, 
              mb: 4
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>
    </>
  );
}
