import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClientesService } from '@/services/clientes.service';
import { Cliente } from '@/types/pedido';
import { useSnackbar } from './useSnackbar';

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

  const { data, isLoading } = useQuery<PaginatedResponse<Cliente>, Error>({
    queryKey: ['clientes', page, limit, status, search],
    queryFn: async () => {
      console.log('Buscando clientes com page:', page, 'limit:', limit, 'status:', status, 'search:', search);
      const response = await ClientesService.listarClientes(page, limit, status, search);
      console.log('Resposta da API de clientes:', response);
      return response;
    },
    staleTime: 60000, // 1 minuto
  });

  const { mutate: criarCliente } = useMutation({
    mutationFn: ClientesService.criarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente criado com sucesso!');
    },
    onError: () => {
      showError('Erro ao criar cliente');
    },
  });

  const { mutate: atualizarCliente } = useMutation({
    mutationFn: ({ id, cliente, includeDeleted = true }: { id: number; cliente: Partial<Cliente>; includeDeleted?: boolean }) =>
      ClientesService.atualizarCliente(id, cliente, includeDeleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente atualizado com sucesso!');
    },
    onError: () => {
      showError('Erro ao atualizar cliente');
    },
  });

  const { mutate: deletarCliente } = useMutation({
    mutationFn: ClientesService.deletarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente inativado com sucesso!');
    },
    onError: () => {
      showError('Erro ao inativar cliente');
    },
  });
  
  const { mutate: reativarCliente } = useMutation({
    mutationFn: ClientesService.reativarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      showSuccess('Cliente reativado com sucesso!');
    },
    onError: () => {
      showError('Erro ao reativar cliente');
    },
  });

  // Adiciona log do que está sendo retornado
  const returnValue = {
    clientes: data?.data || [],
    meta: data?.meta,
    isLoading,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    reativarCliente,
  };
  
  console.log('useClientes retornando:', returnValue);
  
  return returnValue;
}

// Adicionar exportação default sem remover a exportação nomeada para manter compatibilidade
export default useClientes;
