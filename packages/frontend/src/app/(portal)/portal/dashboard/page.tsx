'use client';

import { useMemo } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  CalendarMonth as CalendarMonthIcon,
  AttachMoney as AttachMoneyIcon,
  HourglassEmpty as HourglassEmptyIcon,
  MenuBook as CatalogoIcon,
  ShoppingCart as PedidosIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/PageContainer';
import { StatusChip } from '@/components/StatusChip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useDashboard } from '@/hooks/usePedidos';
import { formatCurrency } from '@/utils/format';
import { STATUS_CONFIG, StatusPedido } from '@/constants/status-pedido';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── KPI Card ──────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
  return (
    <Card elevation={2} sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: `${color}15`,
            color: color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="text" width={200} height={24} />
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rounded" height={100} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
      <Skeleton variant="rounded" height={300} />
    </Box>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function PortalDashboardPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDashboard();

  const dataAtual = useMemo(
    () => format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    [],
  );

  // ─── Loading ───
  if (isLoading) {
    return (
      <PageContainer title="Portal do Cliente">
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  // ─── Erro ───
  if (error) {
    return (
      <PageContainer title="Portal do Cliente">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Olá{usuario?.nome ? `, ${usuario.nome}` : ''}!
          </Typography>
        </Box>
        <ErrorState
          message="Não foi possível carregar os dados do dashboard."
          retryAction={() => refetch()}
        />
      </PageContainer>
    );
  }

  const resumo = data?.resumo ?? {
    totalPedidos: 0,
    pedidosMes: 0,
    valorTotalMes: 0,
    pedidosPendentes: 0,
  };
  const porStatus = data?.porStatus ?? [];
  const pedidosRecentes = data?.pedidosRecentes ?? [];

  return (
    <PageContainer title="Portal do Cliente">
      {/* ── 1. Saudação ── */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Olá{usuario?.nome ? `, ${usuario.nome}` : ''}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
          {dataAtual}
        </Typography>
      </Box>

      {/* ── 2. KPI Cards ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Total de Pedidos"
            value={resumo.totalPedidos}
            icon={<ShoppingCartIcon fontSize="large" />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Pedidos este Mês"
            value={resumo.pedidosMes}
            icon={<CalendarMonthIcon fontSize="large" />}
            color="#0288d1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Valor do Mês"
            value={formatCurrency(resumo.valorTotalMes)}
            icon={<AttachMoneyIcon fontSize="large" />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Pendentes"
            value={resumo.pedidosPendentes}
            icon={<HourglassEmptyIcon fontSize="large" />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      {/* ── 3. Breakdown por Status ── */}
      <Card elevation={2} sx={{ borderRadius: 2, mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Pedidos por Status
          </Typography>
          {porStatus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum pedido encontrado.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {porStatus.map((item) => {
                const config = STATUS_CONFIG[item.status as StatusPedido];
                return (
                  <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ minWidth: 110 }}>
                      <StatusChip status={item.status} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={item.percentual}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#E5E7EB',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: config?.bgColor === '#F3F4F6' ? '#9CA3AF' : config?.textColor || '#1976d2',
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80, textAlign: 'right' }}>
                      {item.quantidade} ({item.percentual.toFixed(1)}%)
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── 4. Pedidos Recentes ── */}
      <Card elevation={2} sx={{ borderRadius: 2, mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Pedidos Recentes
          </Typography>
          {pedidosRecentes.length === 0 ? (
            <EmptyState
              title="Sem pedidos ainda"
              message="Comece fazendo seu primeiro pedido pelo catálogo!"
              icon={<ShoppingCartIcon fontSize="large" />}
            />
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="center">Itens</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidosRecentes.map((pedido) => (
                    <TableRow
                      key={pedido.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/portal/pedidos/${pedido.id}`)}
                    >
                      <TableCell>{pedido.id}</TableCell>
                      <TableCell>
                        {format(new Date(pedido.dataPedido), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={pedido.status} />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(pedido.valorTotal)}
                      </TableCell>
                      <TableCell align="center">{pedido.quantidadeItens}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Acesso Rápido ── */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Acesso Rápido
      </Typography>
      <Grid container spacing={3}>
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
