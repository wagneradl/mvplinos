'use client';

import { useState } from 'react';
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
  IconButton,
  Tooltip,
  Pagination,
  Stack,
  CircularProgress
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  FileDownload as FileDownloadIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedidos } from '@/hooks/usePedidos';

export default function PedidosPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { 
    pedidos, 
    totalPages, 
    isLoading,
    downloadPdf,
    repetirPedido,
    deletarPedido
  } = usePedidos(page);

  function formatarData(data: string) {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  function formatarValor(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (isLoading) {
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
      <Typography variant="h4" component="h1" gutterBottom>
        Pedidos
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nº do Pedido</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Valor Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow
                  key={pedido.id}
                  hover
                  onClick={() => router.push(`/pedidos/${pedido.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{pedido.id}</TableCell>
                  <TableCell>{pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social}</TableCell>
                  <TableCell>{formatarData(pedido.data_pedido)}</TableCell>
                  <TableCell>{formatarValor(pedido.valor_total)}</TableCell>
                  <TableCell>{pedido.status}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Visualizar">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/pedidos/${pedido.id}`);
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Baixar PDF">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadPdf(pedido.id);
                        }}
                      >
                        <FileDownloadIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Repetir pedido">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          repetirPedido(pedido.id);
                        }}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>

                    {pedido.status !== 'CANCELADO' && (
                      <Tooltip title="Cancelar pedido">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
                              deletarPedido(pedido.id);
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Stack spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Pagination 
          count={totalPages} 
          page={page} 
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Stack>
    </Container>
  );
}
