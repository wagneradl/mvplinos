'use client';

// Força renderização no lado do cliente, evitando SSG/SSR
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  Button,
  Chip,
  Alert
} from '@mui/material';
import {
  ShoppingCart as PedidosIcon,
  Inventory as ProdutosIcon,
  People as ClientesIcon,
  Assessment as RelatoriosIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { usePedidos } from '@/hooks/usePedidos';
import { useClientes } from '@/hooks/useClientes';
import { useProdutos } from '@/hooks/useProdutos';
import { formatCurrency } from '@/utils/format';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageContainer } from '@/components/PageContainer';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data atual e data de 7 dias atrás para relatórios
  const hoje = new Date();
  const dataInicio = format(subDays(hoje, 7), 'yyyy-MM-dd');
  const dataFim = format(hoje, 'yyyy-MM-dd');

  // Hooks para buscar dados com valores padrão seguros
  const { pedidos = [], isLoading: isLoadingPedidos, error: pedidosError } = usePedidos({
    page: 1,
    limit: 5,
    filters: {
      status: 'ATIVO',
    },
  }) || { pedidos: [], isLoading: true, error: null };

  const { clientes = [], isLoading: isLoadingClientes, error: clientesError } = useClientes(1, 100, 'ativo') || { clientes: [], isLoading: true, error: null };
  const { produtos = [], isLoading: isLoadingProdutos, error: produtosError } = useProdutos(1, 100, 'ativo') || { produtos: [], isLoading: true, error: null };

  // Atualizar o estado de carregamento global e erros
  useEffect(() => {
    setIsLoading(isLoadingPedidos || isLoadingClientes || isLoadingProdutos);
    
    const errors = [
      pedidosError && 'Erro ao carregar pedidos',
      clientesError && 'Erro ao carregar clientes',
      produtosError && 'Erro ao carregar produtos'
    ].filter(Boolean);
    
    if (errors.length > 0) {
      setError(errors.join('. '));
    } else {
      setError(null);
    }
  }, [isLoadingPedidos, isLoadingClientes, isLoadingProdutos, pedidosError, clientesError, produtosError]);

  // Estatísticas básicas
  const estatisticas = useMemo(() => {
    return {
      totalPedidos: pedidos.length,
      totalClientes: clientes.length,
      totalProdutos: produtos.length,
      valorTotalPedidos: pedidos.reduce((total, pedido) => total + (pedido.valorTotal || 0), 0),
    };
  }, [pedidos, clientes, produtos]);

  // Render da página
  return (
    <PageContainer title="Dashboard">
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
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
                      mr: 2 
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
                      backgroundColor: 'secondary.main', 
                      borderRadius: '50%', 
                      p: 1,
                      display: 'flex', 
                      mr: 2 
                    }}
                  >
                    <ClientesIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">
                    Clientes Ativos
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {estatisticas.totalClientes}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Base de clientes atual
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    component={Link} 
                    href="/clientes"
                    sx={{ mt: 1 }}
                    startIcon={<ClientesIcon />}
                  >
                    Ver Clientes
                  </Button>
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
                      backgroundColor: '#4CAF50', 
                      borderRadius: '50%', 
                      p: 1,
                      display: 'flex', 
                      mr: 2 
                    }}
                  >
                    <ProdutosIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">
                    Produtos Ativos
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {estatisticas.totalProdutos}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Catálogo de produtos atual
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    component={Link} 
                    href="/produtos"
                    sx={{ mt: 1 }}
                    startIcon={<ProdutosIcon />}
                  >
                    Ver Produtos
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Card de Ação Rápida */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  backgroundColor: '#e6f4ea',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      backgroundColor: '#4CAF50', 
                      borderRadius: '50%', 
                      p: 1,
                      display: 'flex', 
                      mr: 2 
                    }}
                  >
                    <AddIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">
                    Ações Rápidas
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  <Button 
                    variant="contained" 
                    component={Link} 
                    href="/pedidos/novo"
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                    startIcon={<AddIcon />}
                  >
                    Novo Pedido
                  </Button>
                  <Button 
                    variant="outlined" 
                    component={Link} 
                    href="/produtos/novo"
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                    startIcon={<ProdutosIcon />}
                  >
                    Novo Produto
                  </Button>
                  <Button 
                    variant="outlined" 
                    component={Link} 
                    href="/clientes/novo"
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                    startIcon={<ClientesIcon />}
                  >
                    Novo Cliente
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Pedidos Recentes */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
            Pedidos Recentes
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 0,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            {pedidos && pedidos.length > 0 ? (
              <Box>
                <Box
                  sx={{
                    width: '100%',
                    overflow: 'auto',
                  }}
                >
                  <Box
                    component="table"
                    sx={{
                      width: '100%',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <Box component="thead" sx={{ backgroundColor: '#f8f8f8' }}>
                      <Box component="tr">
                        <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Pedido</Box>
                        <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Cliente</Box>
                        <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Data</Box>
                        <Box component="th" sx={{ p: 2, textAlign: 'right' }}>Valor</Box>
                        <Box component="th" sx={{ p: 2, textAlign: 'left' }}>Status</Box>
                        <Box component="th" sx={{ p: 2, textAlign: 'center' }}>Ações</Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {pedidos.map((pedido) => (
                        <Box component="tr" key={pedido.id} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                          <Box component="td" sx={{ p: 2 }}>#{pedido.id}</Box>
                          <Box component="td" sx={{ p: 2 }}>{pedido.cliente.nome_fantasia}</Box>
                          <Box component="td" sx={{ p: 2 }}>{format(new Date(pedido.data_pedido), 'dd/MM/yyyy')}</Box>
                          <Box component="td" sx={{ p: 2, textAlign: 'right' }}>{formatCurrency(pedido.valor_total)}</Box>
                          <Box component="td" sx={{ p: 2 }}>
                            <Chip 
                              label={pedido.status} 
                              size="small" 
                              color={pedido.status === 'ATIVO' ? 'success' : 'error'} 
                            />
                          </Box>
                          <Box component="td" sx={{ p: 2, textAlign: 'center' }}>
                            <Button
                              component={Link}
                              href={`/pedidos/${pedido.id}`}
                              size="small"
                              variant="text"
                            >
                              Detalhes
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button 
                    component={Link} 
                    href="/pedidos" 
                    variant="text"
                    endIcon={<ArrowUpwardIcon sx={{ transform: 'rotate(45deg)' }} />}
                  >
                    Ver Todos os Pedidos
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Não há pedidos recentes para exibir.
                </Typography>
                <Button 
                  component={Link} 
                  href="/pedidos/novo" 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  startIcon={<AddIcon />}
                >
                  Criar Novo Pedido
                </Button>
              </Box>
            )}
          </Paper>

          {/* Chamada para Geração de Relatórios */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mt: 4,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              backgroundColor: '#f5f0ea',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Box sx={{ mb: { xs: 2, md: 0 } }}>
              <Typography variant="h6" gutterBottom>
                Analise os dados de vendas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Obtenha insights valiosos acessando os relatórios detalhados de vendas.
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/relatorios"
              variant="contained"
              size="large"
              startIcon={<RelatoriosIcon />}
            >
              Acessar Relatórios
            </Button>
          </Paper>
        </Box>
      )}
    </PageContainer>
  );
}
