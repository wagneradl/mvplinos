'use client';

import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { Providers } from '@/components/Providers';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

interface LoginContainerProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

export function LoginContainer({
  children,
  fullHeight = true,
  maxWidth = 'sm',
}: LoginContainerProps) {
  return (
    <Providers>
      <CssBaseline />
      {/* Substituindo div com classes Tailwind por componentes do MUI para garantir consistência */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: fullHeight ? '100vh' : 'auto',
          py: 4,
          px: 2,
          backgroundColor: 'background.default',
        }}
      >
        <Container maxWidth={maxWidth} sx={{ my: 2 }}>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                component="h1"
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  color: 'text.primary',
                  mb: 1,
                }}
              >
                Lino&apos;s Panificadora
              </Box>
              <Box
                component="p"
                sx={{
                  mt: 1,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                Sistema de gerenciamento
              </Box>
            </Box>
            {children}
          </Box>
        </Container>
      </Box>
    </Providers>
  );
}

// Adicionar exportação default para compatibilidade
export default LoginContainer;
