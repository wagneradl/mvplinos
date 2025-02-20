'use client';

import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Stack,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  FileDownload as FileDownloadIcon,
  ArrowBack as ArrowBackIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedido, usePedidos } from '@/hooks/usePedidos';

export default function PedidoDetalhesPage() {
  const router = useRouter();
  const { id } = useParams();
  const pedidoId = Number(id);
  
  const { data: pedido, isLoading } = usePedido(pedidoId);
  const { downloadPdf, repetirPedido, deletarPedido } = usePedidos();

  function formatarData(data: string) {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (isLoading || !pedido) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/pedidos')}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1">
          Pedido #{id}
        </Typography>
      </Stack>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Informações do Pedido
            </Typography>
            <Typography>Data: {formatarData(pedido.data_pedido)}</Typography>
            <Typography>Valor Total: {formatarValor(pedido.valor_total)}</Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={() => downloadPdf(pedidoId)}
            >
              Baixar PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => repetirPedido(pedidoId)}
            >
              Repetir Pedido
            </Button>
            {pedido.status !== 'CANCELADO' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
                    deletarPedido(pedidoId);
                    router.push('/pedidos');
                  }
                }}
              >
                Cancelar Pedido
              </Button>
            )}
          </Stack>
        </Stack>

        <Chip 
          label={pedido.status} 
          color={
            pedido.status === 'CANCELADO' ? 'error' : 
            pedido.status === 'ATUALIZADO' ? 'success' : 
            'default'
          }
          sx={{ mb: 3 }}
        />

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
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
              {pedido.itensPedido.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>Produto {item.produto_id}</TableCell>
                  <TableCell align="right">{item.quantidade}</TableCell>
                  <TableCell align="right">{formatarValor(item.preco_unitario)}</TableCell>
                  <TableCell align="right">{formatarValor(item.valor_total_item)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} align="right">
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatarValor(pedido.valor_total)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}
