import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClientesService } from '@/services/clientes.service';
import { Cliente } from '@/types/pedido';
import { useSnackbar } from './useSnackbar';
import { loggers } from '@/utils/logger';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export function useClientes(page = 1, limit = 10, status?: string, search?: string) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const logger = loggers.clientes;

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<Cliente>, Error>({
    queryKey: ['clientes', page, limit, status, search],
    queryFn: async () => {
      try {
        logger.debug(
          `Buscando clientes: page=${page}, limit=${limit}, status=${status}, search=${search}`
        );
        const response = await ClientesService.listarClientes(page, limit, status, search);
        logger.debug('Resposta da API de clientes:', response);
        return response;
      } catch (err) {
        logger.error('Erro ao buscar clientes:', err);
        throw err;
      }
    },
    staleTime: 1000, // Reduzido para 1 segundo para melhor resposta com debounce
    retry: 1, // Limita as tentativas automáticas para não sobrecarregar o servidor
    enabled: search === undefined || search === null || search.length >= 2 || search === '', // Só busca se tiver pelo menos 2 caracteres ou campo vazio
  });

  const { mutate: criarCliente } = useMutation({
    mutationFn: ClientesService.criarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente criado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao criar cliente:', err);
      showError(
        `Erro ao criar cliente: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      );
    },
  });

  const { mutate: atualizarCliente } = useMutation({
    mutationFn: ({
      id,
      cliente,
      includeDeleted = true,
    }: {
      id: number;
      cliente: Partial<Cliente>;
      includeDeleted?: boolean;
    }) => ClientesService.atualizarCliente(id, cliente, includeDeleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente atualizado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao atualizar cliente:', err);
      showError(
        `Erro ao atualizar cliente: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      );
    },
  });

  const { mutate: deletarCliente } = useMutation({
    mutationFn: ClientesService.deletarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente inativado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao inativar cliente:', err);
      showError(
        `Erro ao inativar cliente: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      );
    },
  });

  const { mutate: reativarCliente } = useMutation({
    mutationFn: ClientesService.reativarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente reativado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao reativar cliente:', err);
      showError(
        `Erro ao reativar cliente: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      );
    },
  });

  // Adiciona log do que está sendo retornado
  const returnValue = {
    clientes: data?.data || [],
    meta: data?.meta,
    isLoading,
    error: error ? error.message : null,
    refetch,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    reativarCliente,
  };

  logger.debug('useClientes retornando:', returnValue);

  return returnValue;
}

// Proper export for Render compatibility - avoid redeclaring the variable
// This ensures compatibility with both import { useClientes } and import useClientes
export default useClientes;
