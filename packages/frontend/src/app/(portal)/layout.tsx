'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Dashboard as DashboardIcon,
  MenuBook as CatalogoIcon,
  ShoppingCart as PedidosIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const portalMenuItems = [
  { text: 'Dashboard', href: '/portal/dashboard', icon: DashboardIcon },
  { text: 'Catálogo', href: '/portal/catalogo', icon: CatalogoIcon },
  { text: 'Meus Pedidos', href: '/portal/pedidos', icon: PedidosIcon },
];

/**
 * PortalLayout — layout simplificado para clientes externos.
 * Header com logo + nome da empresa + nav horizontal + logout.
 * Verifica autenticação e redireciona conforme o tipo de papel.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, usuario, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Redirecionar INTERNO para o admin
    if (usuario?.papel?.tipo === 'INTERNO') {
      router.replace('/dashboard');
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
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <AppBar
          position="static"
          elevation={1}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            {/* Logo + Nome */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Image
                src="/logo.png"
                alt="Lino's Panificadora"
                width={40}
                height={40}
                style={{ objectFit: 'contain' }}
              />
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: theme.palette.primary.main, lineHeight: 1.2 }}
                >
                  Lino&apos;s Panificadora
                </Typography>
                {usuario?.nome && (
                  <Typography variant="caption" color="text.secondary">
                    {usuario.nome}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Nav horizontal */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {portalMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    startIcon={<Icon />}
                    variant={isActive ? 'contained' : 'text'}
                    size="small"
                    sx={{
                      textTransform: 'none',
                      fontWeight: isActive ? 600 : 400,
                      display: { xs: 'none', sm: 'inline-flex' },
                    }}
                  >
                    {item.text}
                  </Button>
                );
              })}

              <Tooltip title="Sair">
                <IconButton onClick={logout} size="small" sx={{ ml: 1 }}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
          <Container maxWidth="lg">{children}</Container>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 2,
            textAlign: 'center',
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Lino&apos;s Panificadora &copy; {new Date().getFullYear()}
          </Typography>
        </Box>
      </Box>
    </>
  );
}
