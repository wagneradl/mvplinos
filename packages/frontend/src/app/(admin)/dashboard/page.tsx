'use client';

// Força renderização no lado do cliente, evitando SSG/SSR
export const dynamic = 'force-dynamic';

import { Box, Grid, Paper, Typography, CircularProgress, Button, Alert, Chip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress,
} from '@mui/material';
import {
  ShoppingCart as PedidosIcon,
  Inventory as ProdutosIcon,
  People as ClientesIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportsIcon,
  Warning as PendingIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useDashboard } from '@/hooks/usePedidos';
import { useClientes } from '@/hooks/useClientes';
import { useProdutos } from '@/hooks/useProdutos';
import { formatCurrency } from '@/utils/format';
import { PageContainer } from '@/components/PageContainer';
import { StatusChip } from '@/components/StatusChip';
import { useAuth } from '@/contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// Cores por status para a barra de progresso
const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: '#9E9E9E',
  PENDENTE: '#FF9800',
  CONFIRMADO: '#2196F3',
  EM_PRODUCAO: '#FF5722',
  PRONTO: '#4CAF50',
  ENTREGUE: '#1B5E20',
  CANCELADO: '#F44336',
};

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  EM_PRODUCAO: 'Em Produção',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

// ── Componente ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // KPIs reais do endpoint /pedidos/dashboard
  const { data: dashboard, isLoading: isLoadingDashboard, error: dashboardError } = useDashboard();

  // Apenas meta para totais de clientes e produtos (limit=1 para não trazer dados)
  const { meta: clientesMeta, isLoading: isLoadingClientes } = useClientes(1, 1, 'ativo');
  const { meta: produtosMeta, isLoading: isLoadingProdutos } = useProdutos(1, 1, 'ativo');

  const isLoading = isLoadingDashboard || isLoadingClientes || isLoadingProdutos;

  // Auth guards
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Dados extraídos
  const resumo = dashboard?.resumo;
  const porStatus = dashboard?.porStatus || [];
  const pedidosRecentes = dashboard?.pedidosRecentes || [];
  const totalClientes = clientesMeta?.total ?? 0;
  const totalProdutos = produtosMeta?.total ?? 0;

  return (
    <PageContainer title="Dashboard">
      {dashboardError ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          Erro ao carregar dados do dashboard: {dashboardError.message}
        </Alert>
      ) : (
        <Box sx={{ flexGrow: 1 }}>
          {/* ── KPI Cards ──────────────────────────────────────────── */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Card 1: Total de Pedidos */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3, display: 'flex', flexDirection: 'column', height: '100%',
                  backgroundColor: '#f5f0ea', border: '1px solid', borderColor: 'divider', borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ backgroundColor: 'primary.main', borderRadius: '50%', p: 1, display: 'flex', mr: 2 }}>
                    <PedidosIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">Total de Pedidos</Typography>
                </Box>
                {isLoading ? <Skeleton variant="text" width={80} height={48} /> : (
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {resumo?.totalPedidos ?? 0}
                  </Typography>
                )}
                {!isLoading && (resumo?.pedidosPendentes ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PendingIcon fontSize="small" color="warning" />
                    <Typography variant="body2" color="warning.main">
                      {resumo?.pedidosPendentes} pendente{(resumo?.pedidosPendentes ?? 0) !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Card 2: Pedidos este Mês */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3, display: 'flex', flexDirection: 'column', height: '100%',
                  border: '1px solid', borderColor: 'divider', borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ backgroundColor: 'info.main', borderRadius: '50%', p: 1, display: 'flex', mr: 2 }}>
                    <TrendingUpIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">Pedidos do Mês</Typography>
                </Box>
                {isLoading ? <Skeleton variant="text" width={80} height={48} /> : (
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {resumo?.pedidosMes ?? 0}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Pedidos criados no mês atual
                </Typography>
              </Paper>
            </Grid>

            {/* Card 3: Faturamento do Mês */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3, display: 'flex', flexDirection: 'column', height: '100%',
                  border: '1px solid', borderColor: 'divider', borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ backgroundColor: 'success.main', borderRadius: '50%', p: 1, display: 'flex', mr: 2 }}>
                    <ReportsIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">Faturamento</Typography>
                </Box>
                {isLoading ? <Skeleton variant="text" width={120} height={48} /> : (
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {formatCurrency(resumo?.valorTotalMes ?? 0)}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Valor total no mês atual
                </Typography>
              </Paper>
            </Grid>

            {/* Card 4: Clientes / Produtos */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 3, display: 'flex', flexDirection: 'column', height: '100%',
                  border: '1px solid', borderColor: 'divider', borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ backgroundColor: 'secondary.main', borderRadius: '50%', p: 1, display: 'flex', mr: 2 }}>
                    <ClientesIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6" component="div">Cadastros</Typography>
                </Box>
                {isLoading ? <Skeleton variant="text" width={80} height={48} /> : (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', mb: 1 }}>
                    <Box>
                      <Typography variant="h4" component="span" sx={{ fontWeight: 'bold' }}>
                        {totalClientes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary"> clientes</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" component="span" sx={{ fontWeight: 'bold' }}>
                        {totalProdutos}
                      </Typography>
                      <Typography variant="body2" color="text.secondary"> produtos</Typography>
                    </Box>
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary">
                  Ativos no sistema
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* ── Status dos Pedidos ──────────────────────────────────── */}
          {porStatus.length > 0 && (
            <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Status dos Pedidos
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {porStatus.map((item) => (
                  <Box key={item.status}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantidade} ({item.percentual.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentual}
                      sx={{
                        height: 8, borderRadius: 1,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: STATUS_COLORS[item.status] || 'grey.500',
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* ── Pedidos Recentes ─────────────────────────────────────── */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Pedidos Recentes
            </Typography>

            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
                ))}
              </Box>
            ) : pedidosRecentes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Nenhum pedido recente encontrado.
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/pedidos/novo">
                  Criar Novo Pedido
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Itens</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Valor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pedidosRecentes.map((pedido) => (
                      <TableRow
                        key={pedido.id}
                        hover
                        sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                        component={Link}
                        href={`/pedidos/${pedido.id}`}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            #{pedido.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(pedido.dataPedido)}</TableCell>
                        <TableCell>{pedido.quantidadeItens}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {formatCurrency(pedido.valorTotal)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={pedido.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* ── Ações Rápidas ──────────────────────────────────────── */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Ações Rápidas
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/pedidos/novo">
                Novo Pedido
              </Button>
              <Button variant="outlined" startIcon={<ProdutosIcon />} component={Link} href="/produtos/novo">
                Novo Produto
              </Button>
              <Button variant="outlined" startIcon={<ReportsIcon />} component={Link} href="/relatorios">
                Ver Relatórios
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </PageContainer>
  );
}
