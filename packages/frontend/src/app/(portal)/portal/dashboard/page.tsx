'use client';

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import {
  MenuBook as CatalogoIcon,
  ShoppingCart as PedidosIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/PageContainer';

/**
 * Portal Dashboard — página de boas-vindas para clientes externos.
 * Cards placeholder para Catálogo e Meus Pedidos (futuros P53-P55).
 */
export default function PortalDashboardPage() {
  const { usuario } = useAuth();

  return (
    <PageContainer title="Portal do Cliente">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Bem-vindo ao Portal do Cliente
        </Typography>
        {usuario?.nome && (
          <Typography variant="h6" color="text.secondary">
            Olá, {usuario.nome}!
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Card Catálogo */}
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardActionArea component={Link} href="/portal/catalogo">
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CatalogoIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Catálogo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confira nossos produtos disponíveis
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        {/* Card Meus Pedidos */}
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardActionArea component={Link} href="/portal/pedidos">
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <PedidosIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Meus Pedidos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Acompanhe seus pedidos realizados
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
