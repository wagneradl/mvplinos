'use client';

import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FileDownload as FileDownloadIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedido, usePedidos } from '@/hooks/usePedidos';
import { useSnackbar } from 'notistack';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { StatusChip } from '@/components/StatusChip';
import { TransitionButtons } from '@/components/TransitionButtons';
import { StatusTimeline } from '@/components/StatusTimeline';
import { PedidosService } from '@/services/pedidos.service';
import { STATUS_CONFIG } from '@/constants/status-pedido';
import { loggers } from '@/utils/logger';

const logger = loggers.pedidos;

export default function PedidoDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const pedidoId = Number(params?.id);

  const { pedido, isLoading, error, refetch } = usePedido(pedidoId);
  const { downloadPdf } = usePedidos({ disableNotifications: true });
  const { enqueueSnackbar } = useSnackbar();
  const { usuario } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const papelTipo = usuario?.papel?.tipo || 'INTERNO';

  function formatarData(data: string) {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const handleTransition = async (novoStatus: string) => {
    setIsTransitioning(true);
    try {
      await PedidosService.atualizarStatus(pedidoId, novoStatus);
      const config = STATUS_CONFIG[novoStatus as keyof typeof STATUS_CONFIG];
      enqueueSnackbar(`Status atualizado para ${config?.label || novoStatus}`, {
        variant: 'success',
      });
      await refetch();
    } catch (error: any) {
      logger.error('Erro ao atualizar status:', error);
      const msg =
        error?.response?.data?.message || error?.message || 'Erro ao atualizar status';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCopiarPedido = async () => {
    try {
      if (!pedido) return;
      localStorage.setItem(
        'pedidoParaCopiar',
        JSON.stringify({
          cliente_id: pedido.cliente_id,
          observacoes: pedido.observacoes,
          itens: pedido.itensPedido.map((item) => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            produto: item.produto,
          })),
        })
      );
      enqueueSnackbar('Pedido copiado. Complete os dados e confirme.', { variant: 'info' });
      router.push('/pedidos/novo');
    } catch (error) {
      logger.error('Erro ao copiar pedido:', error);
      enqueueSnackbar('Erro ao copiar pedido', { variant: 'error' });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadPdf(pedidoId);
      enqueueSnackbar('PDF gerado com sucesso', { variant: 'success' });
    } catch (error) {
      logger.error('Erro ao gerar PDF:', error);
      enqueueSnackbar('Erro ao gerar PDF', { variant: 'error' });
    }
  };

  // Exibir estado de carregamento
  if (isLoading) {
    return (
      <PageContainer title="Detalhes do Pedido">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Exibir estado de erro
  if (error) {
    return (
      <PageContainer title="Detalhes do Pedido">
        <ErrorState
          title="Erro ao carregar o pedido"
          message={`Não foi possível carregar os detalhes do pedido: ${error}`}
          retryAction={refetch}
        />
      </PageContainer>
    );
  }

  // Garantir que o pedido existe
  if (!pedido) {
    return (
      <PageContainer title="Detalhes do Pedido">
        <ErrorState
          title="Pedido não encontrado"
          message="O pedido solicitado não foi encontrado ou foi removido."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Detalhes do Pedido">
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Header com status chip */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/pedidos')}>
              Voltar
            </Button>
            <Typography variant="h4" component="h1">
              Pedido #{params?.id}
            </Typography>
            <StatusChip status={pedido.status} size="medium" sx={{ ml: 1, fontSize: '0.9rem' }} />
            <Box sx={{ flexGrow: 1 }} />
            <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={handleDownloadPdf}>
              Download PDF
            </Button>
            <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={handleCopiarPedido}>
              Copiar Pedido
            </Button>
          </Box>

          {/* Timeline de progresso */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Progresso do Pedido
            </Typography>
            <StatusTimeline statusAtual={pedido.status} />
          </Paper>

          {/* Botões de transição */}
          <TransitionButtons
            statusAtual={pedido.status}
            papelTipo={papelTipo}
            onTransition={handleTransition}
            loading={isTransitioning}
          />

          <Paper sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Informações do Pedido
                </Typography>
                <Typography variant="body1">
                  <strong>Data:</strong>{' '}
                  {pedido?.data_pedido ? formatarData(pedido.data_pedido) : '-'}
                </Typography>
                <Typography variant="body1">
                  <strong>Valor Total:</strong>{' '}
                  {pedido?.valor_total ? formatarValor(pedido.valor_total) : '-'}
                </Typography>
                <Typography variant="body1">
                  <strong>Status:</strong>{' '}
                  {STATUS_CONFIG[pedido.status as keyof typeof STATUS_CONFIG]?.label ||
                    pedido.status}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Cliente
                </Typography>
                <Typography variant="body1">
                  <strong>Nome Fantasia:</strong> {pedido?.cliente?.nome_fantasia ?? '-'}
                </Typography>
                <Typography variant="body1">
                  <strong>Razão Social:</strong> {pedido?.cliente?.razao_social ?? '-'}
                </Typography>
                <Typography variant="body1">
                  <strong>CNPJ:</strong> {pedido?.cliente?.cnpj ?? '-'}
                </Typography>
                <Typography variant="body1">
                  <strong>Telefone:</strong> {pedido?.cliente?.telefone ?? '-'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Itens do Pedido
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Preço Unitário</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedido?.itensPedido?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.produto?.nome || `Produto ID: ${item.produto_id}`}
                      </TableCell>
                      <TableCell align="right">
                        {item.quantidade} {item.produto?.tipo_medida}
                      </TableCell>
                      <TableCell align="right">{formatarValor(item.preco_unitario)}</TableCell>
                      <TableCell align="right">{formatarValor(item.valor_total_item)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography variant="subtitle1">
                        <strong>Total:</strong>
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1">
                        <strong>{formatarValor(pedido.valor_total)}</strong>
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>

        {/* Observações do Pedido */}
        {pedido?.observacoes && (
          <Box mt={4}>
            <Paper elevation={2} sx={{ p: 2, backgroundColor: '#f7f7fa' }}>
              <Typography variant="h6" gutterBottom>
                Observações
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {pedido.observacoes}
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
    </PageContainer>
  );
}
