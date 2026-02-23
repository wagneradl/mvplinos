import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PedidosService } from '@/services/pedidos.service';
import { Pedido } from '@/types/pedido';
import { useSnackbar } from 'notistack';
import { loggers } from '@/utils/logger';

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
  const logger = loggers.pedidos;

  const pedidosQuery = useQuery<PaginatedResponse<Pedido>, Error>({
    queryKey: ['pedidos', params?.page, params?.limit, params?.filters],
    queryFn: async () => {
      try {
        logger.debug('Buscando pedidos com params:', params);
        const response = await PedidosService.listarPedidos(params);
        logger.debug('Resposta da API de pedidos:', response);
        return response;
      } catch (err) {
        logger.error('Erro ao buscar pedidos:', err);
        throw err;
      }
    },
    retry: 1, // Limita as tentativas automáticas para não sobrecarregar o servidor
    staleTime: 30000, // 30 segundos
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
    onError: (err) => {
      logger.error('Erro ao criar pedido:', err);
      if (!disableNotifications) {
        enqueueSnackbar(
          `Erro ao criar pedido: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          { variant: 'error' }
        );
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
    onError: (err) => {
      logger.error('Erro ao atualizar pedido:', err);
      if (!disableNotifications) {
        enqueueSnackbar(
          `Erro ao atualizar pedido: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          { variant: 'error' }
        );
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
    onError: (err) => {
      logger.error('Erro ao deletar pedido:', err);
      if (!disableNotifications) {
        enqueueSnackbar(
          `Erro ao deletar pedido: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          { variant: 'error' }
        );
      }
    },
  });

  const atualizarStatusMutation = useMutation({
    mutationFn: ({ id, novoStatus }: { id: number; novoStatus: string }) =>
      PedidosService.atualizarStatus(id, novoStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });

      if (!disableNotifications) {
        enqueueSnackbar('Status atualizado com sucesso!', { variant: 'success' });
      }
    },
    onError: (err) => {
      logger.error('Erro ao atualizar status:', err);
      if (!disableNotifications) {
        enqueueSnackbar(
          `Erro ao atualizar status: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          { variant: 'error' }
        );
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
    onError: (err) => {
      logger.error('Erro ao repetir pedido:', err);
      if (!disableNotifications) {
        enqueueSnackbar(
          `Erro ao repetir pedido: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          { variant: 'error' }
        );
      }
    },
  });

  // Forçar refetch quando os parâmetros mudarem
  // Isso garante que a paginação seja aplicada imediatamente
  const refetch = pedidosQuery.refetch;

  const returnValue = {
    pedidos: pedidosQuery.data?.data || [],
    isLoading: pedidosQuery.isLoading,
    error: pedidosQuery.error ? pedidosQuery.error.message : null,
    // Metadados de paginação
    totalCount: pedidosQuery.data?.meta?.total || 0,
    page: pedidosQuery.data?.meta?.page || 1,
    limit: pedidosQuery.data?.meta?.limit || 10,
    totalPages: pedidosQuery.data?.meta?.totalPages || 1,
    // Mutações
    criarPedido: criarPedidoMutation.mutateAsync,
    atualizarPedido: atualizarPedidoMutation.mutateAsync,
    atualizarStatus: atualizarStatusMutation.mutateAsync,
    deletarPedido: deletarPedidoMutation.mutateAsync,
    repetirPedido: repetirPedidoMutation.mutateAsync,
    downloadPdf: PedidosService.downloadPdf,
    // Funções auxiliares
    refetch,
  };

  logger.debug('usePedidos retornando:', returnValue);
  return returnValue;
}

export function usePedido(id: number) {
  const logger = loggers.pedidos;
  const pedidoQuery = useQuery<Pedido, Error>({
    queryKey: ['pedido', id],
    queryFn: async () => {
      try {
        return await PedidosService.obterPedido(id);
      } catch (err) {
        logger.error(`Erro ao carregar pedido #${id}:`, err);
        throw err;
      }
    },
    retry: 1,
  });

  const returnValue = {
    pedido: pedidoQuery.data,
    isLoading: pedidoQuery.isLoading,
    error: pedidoQuery.error ? pedidoQuery.error.message : null,
    refetch: pedidoQuery.refetch,
  };

  return returnValue;
}

export function useRelatorio(filtros: {
  startDate?: string;
  endDate?: string;
  clienteId?: number;
  enabled?: boolean;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const logger = loggers.pedidos;

  // Adapta filtros para camelCase ao chamar o backend
  const adaptedFiltros = {
    dataInicio: filtros.startDate,
    dataFim: filtros.endDate,
    clienteId: filtros.clienteId,
    enabled: filtros.enabled,
  };

  const result = useQuery<ReportData, Error>({
    queryKey: ['relatorio', adaptedFiltros],
    queryFn: async () => {
      try {
        return await PedidosService.gerarRelatorio(adaptedFiltros);
      } catch (error) {
        if (error instanceof Error) {
          enqueueSnackbar('Erro ao gerar relatório: ' + error.message, { variant: 'error' });
        } else {
          enqueueSnackbar('Erro ao gerar relatório', { variant: 'error' });
        }
        throw error;
      }
    },
    enabled: filtros.enabled,
  });

  const downloadPdf = async () => {
    try {
      await PedidosService.downloadRelatorioPdf({
        dataInicio: filtros.startDate,
        dataFim: filtros.endDate,
        clienteId: filtros.clienteId,
      });
      enqueueSnackbar('Relatório PDF gerado com sucesso!', { variant: 'success' });
    } catch (error) {
      logger.error('Erro ao baixar PDF do relatório:', error);
      // Não exibimos notificação de erro aqui, pois o erro já é tratado pelo interceptor da API
    }
  };

  return {
    ...result,
    data: result.data,
    downloadPdf,
  };
}

export function useSummaryRelatorio(filtros: {
  startDate?: string;
  endDate?: string;
  clienteId?: number;
  enabled?: boolean;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const logger = loggers.pedidos;

  // Adapta filtros para snake_case para o summary
  const adaptedFiltros = {
    data_inicio: filtros.startDate,
    data_fim: filtros.endDate,
    cliente_id: filtros.clienteId,
  };

  const result = useQuery<import('@/services/pedidos.service').ReportData, Error>({
    queryKey: ['summaryRelatorio', adaptedFiltros],
    queryFn: async () => {
      try {
        return await PedidosService.gerarRelatorio(adaptedFiltros);
      } catch (error) {
        logger.error('Erro ao buscar summary do relatório:', error);
        enqueueSnackbar('Erro ao buscar resumo do relatório', { variant: 'error' });
        throw error;
      }
    },
    enabled: filtros.enabled,
  });

  return {
    ...result,
    data: result.data,
  };
}

// Only use a single default export for Render compatibility
export default usePedidos;
