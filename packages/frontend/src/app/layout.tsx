'use client';

import { Inter } from 'next/font/google';
import { Box, Container } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { Providers } from '@/components/Providers';
import { Navigation } from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <CssBaseline />
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Navigation />
            <Box component="main" sx={{ flexGrow: 1, py: 4, overflow: 'auto' }}>
              <Container maxWidth="lg" sx={{ mt: 8 }}>
                {children}
              </Container>
            </Box>
          </Box>
        </Providers>
      </body>
    </html>
  );
}
