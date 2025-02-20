import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PedidosService } from '@/services/pedidos.service';
import { useSnackbar } from 'notistack';

export function usePedidos(page = 1, limit = 10) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const pedidosQuery = useQuery({
    queryKey: ['pedidos', page, limit],
    queryFn: () => PedidosService.listarPedidos(page, limit),
  });

  const pedidoMutation = useMutation({
    mutationFn: PedidosService.criarPedido,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      enqueueSnackbar('Pedido criado com sucesso!', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Erro ao criar pedido', { variant: 'error' });
    },
  });

  const atualizarPedidoMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      PedidosService.atualizarPedido(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      enqueueSnackbar('Pedido atualizado com sucesso!', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Erro ao atualizar pedido', { variant: 'error' });
    },
  });

  const deletarPedidoMutation = useMutation({
    mutationFn: PedidosService.deletarPedido,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      enqueueSnackbar('Pedido cancelado com sucesso!', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Erro ao cancelar pedido', { variant: 'error' });
    },
  });

  const repetirPedidoMutation = useMutation({
    mutationFn: PedidosService.repetirPedido,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      enqueueSnackbar('Pedido repetido com sucesso!', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Erro ao repetir pedido', { variant: 'error' });
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: PedidosService.downloadPdf,
    onError: () => {
      enqueueSnackbar('Erro ao baixar PDF', { variant: 'error' });
    },
  });

  return {
    pedidos: pedidosQuery.data?.data ?? [],
    totalPages: Math.ceil((pedidosQuery.data?.meta?.total ?? 0) / limit),
    isLoading: pedidosQuery.isLoading,
    error: pedidosQuery.error,
    criarPedido: pedidoMutation.mutate,
    atualizarPedido: atualizarPedidoMutation.mutate,
    deletarPedido: deletarPedidoMutation.mutate,
    repetirPedido: repetirPedidoMutation.mutate,
    downloadPdf: downloadPdfMutation.mutate,
  };
}

export function usePedido(id: number) {
  const { enqueueSnackbar } = useSnackbar();

  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => PedidosService.obterPedido(id),
    onError: () => {
      enqueueSnackbar('Erro ao carregar pedido', { variant: 'error' });
    },
  });
}
