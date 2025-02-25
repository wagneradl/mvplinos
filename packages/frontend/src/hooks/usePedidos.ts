import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PedidosService } from '@/services/pedidos.service';
import { Pedido } from '@/types/pedido';
import { useSnackbar } from 'notistack';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ReportData {
  data: {
    date: string;
    total_orders: number;
    total_value: number;
  }[];
  summary: {
    total_orders: number;
    total_value: number;
    average_value: number;
  };
}

interface PedidosFilters {
  cliente_id?: number;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
}

interface PedidosParams {
  page?: number;
  limit?: number;
  filters?: PedidosFilters;
  disableNotifications?: boolean; // Nova opção para desabilitar notificações
}

export function usePedidos(params?: PedidosParams) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const disableNotifications = params?.disableNotifications || false;

  const pedidosQuery = useQuery<PaginatedResponse<Pedido>, Error>({
    queryKey: ['pedidos', params?.page, params?.limit, params?.filters],
    queryFn: async () => {
      console.log('Buscando pedidos com params:', params);
      const response = await PedidosService.listarPedidos(params);
      console.log('Resposta da API de pedidos:', response);
      return response;
    },
  });

  const criarPedidoMutation = useMutation({
    mutationFn: (pedido: Omit<Pedido, 'id'>) => PedidosService.criarPedido(pedido),
    onSuccess: async () => {
      // Invalidar todas as queries relacionadas a pedidos com mais força
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await queryClient.refetchQueries({ queryKey: ['pedidos'] });
      
      // Exibir notificação apenas se não estiver desabilitado
      if (!disableNotifications) {
        enqueueSnackbar('Pedido criado com sucesso!', { variant: 'success' });
      }
    },
    onError: () => {
      if (!disableNotifications) {
        enqueueSnackbar('Erro ao criar pedido', { variant: 'error' });
      }
    },
  });

  const atualizarPedidoMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      PedidosService.atualizarPedido(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      
      if (!disableNotifications) {
        enqueueSnackbar('Pedido atualizado com sucesso!', { variant: 'success' });
      }
    },
    onError: () => {
      if (!disableNotifications) {
        enqueueSnackbar('Erro ao atualizar pedido', { variant: 'error' });
      }
    },
  });

  const deletarPedidoMutation = useMutation({
    mutationFn: (id: number) => PedidosService.deletarPedido(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      
      if (!disableNotifications) {
        enqueueSnackbar('Pedido deletado com sucesso!', { variant: 'success' });
      }
    },
    onError: () => {
      if (!disableNotifications) {
        enqueueSnackbar('Erro ao deletar pedido', { variant: 'error' });
      }
    },
  });

  const repetirPedidoMutation = useMutation({
    mutationFn: (id: number) => PedidosService.repetirPedido(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      
      if (!disableNotifications) {
        enqueueSnackbar('Pedido repetido com sucesso!', { variant: 'success' });
      }
      
      return data;
    },
    onError: () => {
      if (!disableNotifications) {
        enqueueSnackbar('Erro ao repetir pedido', { variant: 'error' });
      }
    },
  });

  // Forçar refetch quando os parâmetros mudarem
  // Isso garante que a paginação seja aplicada imediatamente
  const refetch = pedidosQuery.refetch;

  const returnValue = {
    pedidos: pedidosQuery.data?.data || [],
    isLoading: pedidosQuery.isLoading,
    error: pedidosQuery.error,
    // Metadados de paginação
    totalCount: pedidosQuery.data?.meta?.total || 0,
    page: pedidosQuery.data?.meta?.page || 1,
    limit: pedidosQuery.data?.meta?.limit || 10,
    totalPages: pedidosQuery.data?.meta?.totalPages || 1,
    // Mutações
    criarPedido: criarPedidoMutation.mutateAsync,
    atualizarPedido: atualizarPedidoMutation.mutateAsync,
    deletarPedido: deletarPedidoMutation.mutateAsync,
    repetirPedido: repetirPedidoMutation.mutateAsync,
    downloadPdf: PedidosService.downloadPdf,
    // Funções auxiliares
    refetch
  };
  
  console.log('usePedidos retornando:', returnValue);
  return returnValue;
}

export function usePedido(id: number) {
  const { enqueueSnackbar } = useSnackbar();

  const { data, isLoading, error } = useQuery<Pedido, Error>({
    queryKey: ['pedido', id],
    queryFn: () => PedidosService.obterPedido(id),
  });

  if (error) {
    enqueueSnackbar('Erro ao carregar pedido', { variant: 'error' });
  }

  return { data, isLoading, error };
}

export function useRelatorio(filtros: {
  data_inicio?: string;
  data_fim?: string;
  cliente_id?: number;
  enabled?: boolean;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const result = useQuery<ReportData, Error>({
    queryKey: ['relatorio', filtros],
    queryFn: () => PedidosService.gerarRelatorio(filtros),
    enabled: filtros.enabled,
    onError: (error) => {
      enqueueSnackbar('Erro ao gerar relatório: ' + error.message, { variant: 'error' });
    },
  });

  return {
    ...result,
    data: result.data,
  };
}
