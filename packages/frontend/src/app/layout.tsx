'use client';

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import { Box, Container, CircularProgress } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { Providers } from '@/components/Providers';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  
  // Mostrar apenas o conteúdo da página de login quando não autenticado e na página de login
  if (isLoginPage || !isAuthenticated) {
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
        <Box component="main" sx={{ flexGrow: 1, py: 4, overflow: 'auto' }}>
          <Container maxWidth="lg" sx={{ mt: 8 }}>
            {children}
          </Container>
        </Box>
      </Box>
    </>
  );
}
