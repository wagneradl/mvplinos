'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  ShoppingCart as EmptyIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePedidos } from '@/hooks/usePedidos';
import { StatusChip } from '@/components/StatusChip';
import { PageContainer } from '@/components/PageContainer';
import { Pedido } from '@/types/pedido';

/** Status filter options relevant for CLIENTE */
const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EM_PRODUCAO', label: 'Em Produo' },
  { value: 'PRONTO', label: 'Pronto' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

/** Statuses that allow cancellation for CLIENTE */
const CANCELABLE_STATUSES = ['RASCUNHO', 'PENDENTE'];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function PortalPedidosPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    pedidoId: number | null;
    pedidoNum: number | null;
  }>({ open: false, pedidoId: null, pedidoNum: null });
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    pedidos,
    isLoading,
    error,
    totalCount,
    atualizarStatus,
    refetch,
  } = usePedidos({
    page: page + 1, // API is 1-indexed
    limit: rowsPerPage,
    filters: statusFilter ? { status: statusFilter } : undefined,
  });

  // Handle page change
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  // Cancel dialog handlers
  const openCancelDialog = (pedido: Pedido) => {
    setCancelDialog({
      open: true,
      pedidoId: pedido.id,
      pedidoNum: pedido.id,
    });
  };

  const closeCancelDialog = () => {
    setCancelDialog({ open: false, pedidoId: null, pedidoNum: null });
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialog.pedidoId) return;
    setIsCancelling(true);
    try {
      await atualizarStatus({
        id: cancelDialog.pedidoId,
        novoStatus: 'CANCELADO',
      });
      closeCancelDialog();
    } catch {
      // Error handled by usePedidos hook (enqueueSnackbar)
    } finally {
      setIsCancelling(false);
    }
  };

  const canCancel = (status: string) => CANCELABLE_STATUSES.includes(status);

  // Empty state
  const isEmpty = !isLoading && pedidos.length === 0 && !statusFilter;
  const isFilterEmpty = !isLoading && pedidos.length === 0 && !!statusFilter;

  return (
    <PageContainer
      title="Meus Pedidos"
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/portal/pedidos/novo"
          sx={{ textTransform: 'none' }}
        >
          Novo Pedido
        </Button>
      }
    >
      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao carregar pedidos: {error}
        </Alert>
      )}

      {/* Empty state — no orders at all */}
      {isEmpty && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          <EmptyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Voce ainda nao fez nenhum pedido.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Selecione produtos do catalogo e crie seu primeiro pedido.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            href="/portal/pedidos/novo"
            size="large"
            sx={{ textTransform: 'none' }}
          >
            Fazer primeiro pedido
          </Button>
        </Box>
      )}

      {/* Main content — filters + table */}
      {!isEmpty && (
        <>
          {/* Filter row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                {STATUS_FILTERS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              {totalCount} pedido{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {/* Filter empty state */}
          {isFilterEmpty && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum pedido encontrado com o filtro selecionado.
              </Typography>
            </Box>
          )}

          {/* Table */}
          {(isLoading || pedidos.length > 0) && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}># Pedido</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Itens</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Acoes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton variant="text" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : pedidos.map((pedido) => (
                          <TableRow
                            key={pedido.id}
                            hover
                            sx={{
                              '&:last-child td, &:last-child th': { border: 0 },
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                #{pedido.id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {formatDate(pedido.data_pedido || pedido.created_at)}
                            </TableCell>
                            <TableCell align="center">
                              {pedido.itensPedido?.length || 0}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(pedido.valor_total)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <StatusChip status={pedido.status} />
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <Tooltip title="Ver detalhes">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    component={Link}
                                    href={`/portal/pedidos/${pedido.id}`}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {canCancel(pedido.status) && (
                                  <Tooltip title="Cancelar pedido">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => openCancelDialog(pedido)}
                                    >
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
                labelRowsPerPage="Por pagina:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                }
              />
            </>
          )}
        </>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialog.open} onClose={closeCancelDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar Pedido</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja cancelar o pedido{' '}
            <strong>#{cancelDialog.pedidoNum}</strong>?
            <br />
            Esta acao nao pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog} disabled={isCancelling}>
            Voltar
          </Button>
          <Button
            onClick={handleConfirmCancel}
            color="error"
            variant="contained"
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
