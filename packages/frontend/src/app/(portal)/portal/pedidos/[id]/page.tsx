'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  FileDownload as PdfIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedido, usePedidos } from '@/hooks/usePedidos';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { StatusChip } from '@/components/StatusChip';
import { StatusTimeline } from '@/components/StatusTimeline';
import { ErrorState } from '@/components/ErrorState';
import { PedidosService } from '@/services/pedidos.service';

/** Statuses that a CLIENTE can cancel */
const CANCELABLE_STATUSES = ['RASCUNHO', 'PENDENTE'];

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PortalPedidoDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const pedidoId = Number(params?.id);

  const { pedido, isLoading, error, refetch } = usePedido(pedidoId);
  const { downloadPdf } = usePedidos({ disableNotifications: true });
  const { enqueueSnackbar } = useSnackbar();

  const [cancelDialog, setCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const canCancel = pedido && CANCELABLE_STATUSES.includes(pedido.status);

  // Cancel handler
  const handleConfirmCancel = async () => {
    if (!pedido) return;
    setIsCancelling(true);
    try {
      await PedidosService.atualizarStatus(pedido.id, 'CANCELADO');
      enqueueSnackbar('Pedido cancelado com sucesso', { variant: 'success' });
      setCancelDialog(false);
      await refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao cancelar pedido';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setIsCancelling(false);
    }
  };

  // PDF download handler
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadPdf(pedidoId);
      enqueueSnackbar('PDF gerado com sucesso', { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao gerar PDF', { variant: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <PageContainer title="Detalhes do Pedido">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer title="Detalhes do Pedido">
        <ErrorState
          title="Erro ao carregar o pedido"
          message={`Nao foi possivel carregar os detalhes do pedido: ${error}`}
          retryAction={refetch}
        />
      </PageContainer>
    );
  }

  // Not found
  if (!pedido) {
    return (
      <PageContainer title="Detalhes do Pedido">
        <ErrorState
          title="Pedido nao encontrado"
          message="O pedido solicitado nao foi encontrado ou voce nao tem permissao para visualiza-lo."
        />
      </PageContainer>
    );
  }

  const itens = pedido.itensPedido || [];

  return (
    <PageContainer
      title={`Pedido #${pedido.id}`}
      actions={
        <Button
          component={Link}
          href="/portal/pedidos"
          startIcon={<BackIcon />}
          sx={{ textTransform: 'none' }}
        >
          Meus Pedidos
        </Button>
      }
    >
      <Stack spacing={3}>
        {/* Header: status chip + date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <StatusChip status={pedido.status} size="medium" sx={{ fontSize: '0.9rem' }} />
          <Typography variant="body2" color="text.secondary">
            Criado em {formatDate(pedido.data_pedido || pedido.created_at)}
          </Typography>
        </Box>

        {/* Timeline */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Progresso do Pedido
          </Typography>
          <StatusTimeline statusAtual={pedido.status} />
        </Paper>

        {/* Items table */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Itens do Pedido
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Qtd
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Preco Unit.
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Subtotal
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itens.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.produto?.nome || `Produto #${item.produto_id}`}
                    </TableCell>
                    <TableCell align="right">
                      {item.quantidade}
                      {item.produto?.tipo_medida && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 0.5 }}
                        >
                          {item.produto.tipo_medida}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.preco_unitario)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.valor_total_item)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total row */}
                <TableRow>
                  <TableCell colSpan={3} align="right" sx={{ borderBottom: 'none' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Total:
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: 'none' }}>
                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                      {formatCurrency(pedido.valor_total)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Observations */}
        {pedido.observacoes && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f7f7fa' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Observacoes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pedido.observacoes}
            </Typography>
          </Paper>
        )}

        {/* Actions */}
        <Divider />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={
              isDownloading ? <CircularProgress size={18} /> : <PdfIcon />
            }
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            sx={{ textTransform: 'none' }}
          >
            {isDownloading ? 'Gerando...' : 'Baixar PDF'}
          </Button>

          {canCancel && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelDialog(true)}
              sx={{ textTransform: 'none' }}
            >
              Cancelar Pedido
            </Button>
          )}
        </Box>
      </Stack>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar Pedido</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja cancelar o pedido{' '}
            <strong>#{pedido.id}</strong>?
            <br />
            Esta acao nao pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)} disabled={isCancelling}>
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
