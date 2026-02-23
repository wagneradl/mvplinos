'use client';

// Força renderização no lado do cliente, evitando SSG/SSR
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, Button, Alert } from '@mui/material';
import {
  ShoppingCart as PedidosIcon,
  Inventory as ProdutosIcon,
  People as ClientesIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePedidos } from '@/hooks/usePedidos';
import { useClientes } from '@/hooks/useClientes';
import { useProdutos } from '@/hooks/useProdutos';
import { formatCurrency } from '@/utils/format';
import { PageContainer } from '@/components/PageContainer';
import { StatusChip } from '@/components/StatusChip';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Hooks para buscar dados com valores padrão seguros
  const {
    pedidos = [],
    isLoading: isLoadingPedidos,
    error: pedidosError,
  } = usePedidos({
    page: 1,
    limit: 5,
    filters: {},
  }) || { pedidos: [], isLoading: true, error: null };

  const {
    clientes = [],
    isLoading: isLoadingClientes,
    error: clientesError,
  } = useClientes(1, 100, 'ativo') || { clientes: [], isLoading: true, error: null };

  const {
    produtos = [],
    isLoading: isLoadingProdutos,
    error: produtosError,
  } = useProdutos(1, 100, 'ativo') || { produtos: [], isLoading: true, error: null };

  // Atualizar o estado de carregamento global e erros
  useEffect(() => {
    // Não iniciar o carregamento de dados se a autenticação ainda estiver pendente
    if (authLoading) {
      return;
    }

    setIsLoading(isLoadingPedidos || isLoadingClientes || isLoadingProdutos);

    const errors = [
      pedidosError && 'Erro ao carregar pedidos',
      clientesError && 'Erro ao carregar clientes',
      produtosError && 'Erro ao carregar produtos',
    ].filter(Boolean);

    if (errors.length > 0) {
      setError(errors.join('. '));
    } else {
      setError(null);
    }
  }, [
    isLoadingPedidos,
    isLoadingClientes,
    isLoadingProdutos,
    pedidosError,
    clientesError,
    produtosError,
    authLoading,
  ]);

  // Estatísticas básicas
  const estatisticas = useMemo(() => {
    return {
      totalPedidos: pedidos.length,
      totalClientes: clientes.length,
      totalProdutos: produtos.length,
      valorTotalPedidos: pedidos.reduce((total, pedido) => {
        // Checar se o campo é valor_total ou valorTotal com segurança
        const valorPedido = pedido.valor_total || pedido.valorTotal || 0;
        return total + valorPedido;
      }, 0),
    };
  }, [pedidos, clientes, produtos]);

  // Se ainda estiver carregando a autenticação, mostrar indicador de carregamento
  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Se não estiver autenticado, não renderizar nada (o redirecionamento será feito pelo AuthContext)
  if (!isAuthenticated) {
    return null;
  }

  // Render da página
  return (
    <PageContainer title="Dashboard">
      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      ) : (
        <Box sx={{ flexGrow: 1 }}>
          {/* Cartões de estatísticas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 140,
                  backgroundColor: 'primary.light',
                  color: 'white',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" gutterBottom>
                    Pedidos
                  </Typography>
                  <PedidosIcon />
                </Box>
                <Typography variant="h4" component="div" sx={{ mt: 1 }}>
                  {estatisticas.totalPedidos || 0}
                </Typography>
                <Box sx={{ mt: 'auto' }}>
                  <Link href="/pedidos/novo">
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<AddIcon />}
                      sx={{ mt: 1 }}
                    >
                      Novo Pedido
                    </Button>
                  </Link>
                </Box>
              </Paper>
            </Grid>

            {/* Card de Estatísticas dos Pedidos */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  backgroundColor: '#f5f0ea',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      backgroundColor: 'primary.main',
                      borderRadius: '50%',
                      p: 1,
                      display: 'flex',
                      mr: 2,
                    }}
                  >
                    <PedidosIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">
                    Pedidos Hoje
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {estatisticas.totalPedidos}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Valor Total: {formatCurrency(estatisticas.valorTotalPedidos)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                  <Chip
                    size="small"
                    icon={<TrendingUpIcon fontSize="small" />}
                    label="Ver Relatórios"
                    component={Link}
                    href="/relatorios"
                    clickable
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Card de Clientes */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      backgroundColor: 'info.main',
                      borderRadius: '50%',
                      p: 1,
                      display: 'flex',
                      mr: 2,
                    }}
                  >
                    <ClientesIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">
                    Clientes
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {estatisticas.totalClientes}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total de clientes ativos
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                  <Chip
                    size="small"
                    icon={<AddIcon fontSize="small" />}
                    label="Novo Cliente"
                    component={Link}
                    href="/clientes/novo"
                    clickable
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Card de Produtos */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      backgroundColor: 'success.main',
                      borderRadius: '50%',
                      p: 1,
                      display: 'flex',
                      mr: 2,
                    }}
                  >
                    <ProdutosIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">
                    Produtos
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {estatisticas.totalProdutos}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total de produtos ativos
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                  <Chip
                    size="small"
                    icon={<AddIcon fontSize="small" />}
                    label="Novo Produto"
                    component={Link}
                    href="/produtos/novo"
                    clickable
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Seção de Pedidos Recentes */}
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
            Pedidos Recentes
          </Typography>

          {/* Conteúdo condicional para pedidos */}
          {pedidos.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum pedido recente encontrado.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                component={Link}
                href="/pedidos/novo"
                sx={{ mt: 2 }}
              >
                Criar Novo Pedido
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Lista de pedidos recentes seria exibida aqui */}
              {pedidos.map((pedido) => (
                <Grid item xs={12} key={pedido.id}>
                  <Paper
                    sx={{
                      p: 2,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Pedido #{pedido.id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Cliente: {pedido.cliente?.nome || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Data:{' '}
                        {new Date(pedido.data_pedido || pedido.dataPedido || '').toLocaleDateString(
                          'pt-BR'
                        )}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 2, sm: 0 } }}>
                      <Typography variant="h6" color="primary.main" sx={{ mr: 2 }}>
                        {formatCurrency(pedido.valor_total || pedido.valorTotal || 0)}
                      </Typography>
                      <StatusChip status={pedido.status} />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Seção de Atividades Recentes */}
          <Grid container spacing={3}>
            {/* Aqui você pode adicionar widgets adicionais como gráficos ou relatórios resumidos */}
          </Grid>
        </Box>
      )}
    </PageContainer>
  );
}
