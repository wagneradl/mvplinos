'use client';

import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Pedido } from '@/types/pedido';
import { formatCurrency } from '@/utils/format';
import { usePedidos } from '@/hooks/usePedidos';
import { PedidosService } from '@/services/pedidos.service';
import { useSnackbar } from 'notistack';
import { EmptyState } from './EmptyState';

interface PedidosTableProps {
  pedidos: Pedido[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function PedidosTable({
  pedidos,
  isLoading,
  totalCount,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: PedidosTableProps) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { downloadPdf } = usePedidos({ disableNotifications: true });

  console.log('PedidosTable recebeu pedidos:', pedidos);

  // Convertemos para 0-based para o MUI TablePagination
  const handleChangePage = (_: unknown, newPage: number) => {
    // Convertemos de volta para 1-based ao chamar o callback
    onPageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    onLimitChange(newLimit);
    // Voltamos para a primeira página ao mudar o limite
    onPageChange(1);
  };

  // Nova implementação: copiar pedido para tela de novo pedido
  const handleCopiarPedido = async (id: number) => {
    try {
      // Obter detalhes do pedido para usá-los no novo pedido
      const pedido = await PedidosService.obterPedido(id);

      if (!pedido) {
        enqueueSnackbar('Pedido não encontrado', { variant: 'error' });
        return;
      }

      // Armazenar os dados do pedido no localStorage para usar na tela de novo pedido
      localStorage.setItem(
        'pedidoParaCopiar',
        JSON.stringify({
          cliente_id: pedido.cliente_id,
          itens: pedido.itensPedido.map((item) => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            produto: item.produto,
          })),
        })
      );

      // Redirecionar para a tela de novo pedido
      enqueueSnackbar('Pedido copiado. Complete os dados e confirme.', { variant: 'info' });
      router.push('/pedidos/novo');
    } catch (error) {
      console.error('Erro ao copiar pedido:', error);
      enqueueSnackbar('Erro ao copiar pedido', { variant: 'error' });
    }
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      await downloadPdf(id);
      enqueueSnackbar('PDF baixado com sucesso', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erro ao baixar PDF', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer sx={{ mb: 2 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : pedidos.length === 0 ? (
          <EmptyState
            title="Nenhum pedido encontrado"
            message="Não há pedidos registrados com os filtros atuais. Você pode criar um novo pedido usando o botão 'Novo Pedido'."
            icon={<ShoppingCartIcon fontSize="large" />}
            sx={{ py: 6 }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nº</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell align="right">Valor Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.id}</TableCell>
                  <TableCell>
                    {format(new Date(pedido.data_pedido), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>{pedido.cliente?.nome_fantasia}</TableCell>
                  <TableCell align="right">{formatCurrency(pedido.valor_total)}</TableCell>
                  <TableCell>
                    <Chip
                      label={pedido.status}
                      color={pedido.status === 'ATIVO' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Tooltip title="Ver Detalhes">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/pedidos/${pedido.id}`)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copiar Pedido">
                        <IconButton size="small" onClick={() => handleCopiarPedido(pedido.id)}>
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <IconButton size="small" onClick={() => handleDownloadPdf(pedido.id)}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        rowsPerPage={limit}
        page={page - 1} // Converte 1-based para 0-based para o MUI
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Itens por página"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : 'mais de ' + to}`
        }
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Box>
  );
}

// Adicionar exportação default para compatibilidade
export default PedidosTable;
