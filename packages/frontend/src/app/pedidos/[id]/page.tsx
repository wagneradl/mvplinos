'use client';

import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
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
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedido, usePedidos } from '@/hooks/usePedidos';
import { useSnackbar } from 'notistack';
import { PedidosService } from '@/services/pedidos.service';

export default function PedidoDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const pedidoId = Number(params?.id);

  const { data: pedido, isLoading } = usePedido(pedidoId);
  // Use disableNotifications para evitar notificações duplicadas
  const { downloadPdf, deletarPedido } = usePedidos({ disableNotifications: true });
  const { enqueueSnackbar } = useSnackbar();
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  function formatarData(data: string) {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletarPedido(pedidoId);
      // Já temos disableNotifications: true no hook usePedidos,
      // então adicionamos nossa própria notificação aqui
      enqueueSnackbar('Pedido cancelado com sucesso', { variant: 'success' });
      router.push('/pedidos');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      enqueueSnackbar('Erro ao cancelar pedido', { variant: 'error' });
    } finally {
      setIsDeleting(false);
      setOpenDialog(false);
    }
  };

  // Função para copiar pedido de forma adequada
  const handleCopiarPedido = async () => {
    try {
      if (!pedido) return;
      
      // Armazenar os dados do pedido no localStorage para usar na tela de novo pedido
      localStorage.setItem('pedidoParaCopiar', JSON.stringify({
        cliente_id: pedido.cliente_id,
        itens: pedido.itensPedido.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          produto: item.produto
        }))
      }));
      
      enqueueSnackbar('Pedido copiado. Complete os dados e confirme.', { variant: 'info' });
      router.push('/pedidos/novo');
    } catch (error) {
      console.error('Erro ao copiar pedido:', error);
      enqueueSnackbar('Erro ao copiar pedido', { variant: 'error' });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadPdf(pedidoId);
      enqueueSnackbar('PDF gerado com sucesso', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      enqueueSnackbar('Erro ao gerar PDF', { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!pedido) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Pedido não encontrado</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/pedidos')}>
            Voltar
          </Button>
          <Typography variant="h4" component="h1">
            Pedido #{params?.id}
          </Typography>
          <Chip
            label={pedido.status}
            color={pedido.status === 'ATIVO' ? 'success' : 'error'}
            sx={{ ml: 2 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            startIcon={<FileDownloadIcon />} 
            variant="outlined" 
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>
          <Button 
            startIcon={<ContentCopyIcon />} 
            variant="outlined" 
            onClick={handleCopiarPedido}
          >
            Copiar Pedido
          </Button>
          {pedido.status === 'ATIVO' && (
            <Button
              startIcon={<DeleteIcon />}
              variant="outlined"
              color="error"
              onClick={() => setOpenDialog(true)}
            >
              Cancelar Pedido
            </Button>
          )}
        </Box>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Informações do Pedido
              </Typography>
              <Typography variant="body1">
                <strong>Data:</strong> {pedido?.data_pedido ? formatarData(pedido.data_pedido) : '-'}
              </Typography>
              <Typography variant="body1">
                <strong>Valor Total:</strong> {pedido?.valor_total ? formatarValor(pedido.valor_total) : '-'}
              </Typography>
              <Typography variant="body1">
                <strong>Status:</strong> {pedido?.status || '-'}
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
                    <TableCell>{item.produto?.nome || `Produto ID: ${item.produto_id}`}</TableCell>
                    <TableCell align="right">{item.quantidade} {item.produto?.tipo_medida}</TableCell>
                    <TableCell align="right">{formatarValor(item.preco_unitario)}</TableCell>
                    <TableCell align="right">{formatarValor(item.valor_total_item)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <Typography variant="subtitle1"><strong>Total:</strong></Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1"><strong>{formatarValor(pedido.valor_total)}</strong></Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirmar Cancelamento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Não</Button>
          <Button onClick={handleDelete} color="error" disabled={isDeleting} autoFocus>
            {isDeleting ? <CircularProgress size={24} /> : 'Sim, Cancelar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
