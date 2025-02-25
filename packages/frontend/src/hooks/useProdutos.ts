import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProdutosService, CreateProdutoDto } from '@/services/produtos.service';
import { Produto } from '@/types/produto';
import { useSnackbar } from './useSnackbar';

export function useProdutos(page = 1, limit = 10, status?: string, search?: string) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const { data, isLoading } = useQuery({
    queryKey: ['produtos', page, limit, status, search],
    queryFn: () => ProdutosService.listarProdutos(page, limit, status, search),
    staleTime: 0, // Sempre busca dados novos
  });

  const { mutate: criarProduto, isPending: isCreating } = useMutation({
    mutationFn: (produto: CreateProdutoDto) => {
      console.log('Mutation - Dados enviados:', produto);
      return ProdutosService.criarProduto(produto);
    },
    onSuccess: (data) => {
      console.log('Mutation - Sucesso:', data);
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess('Produto criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Mutation - Erro:', error);
      const message = error.response?.data?.message || 'Erro ao criar produto';
      showError(message);
    },
  });

  const { mutate: atualizarProduto, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, produto, includeDeleted }: { id: number; produto: Partial<Produto>; includeDeleted?: boolean }) =>
      ProdutosService.atualizarProduto(id, produto, includeDeleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess('Produto atualizado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar produto';
      showError(message);
    },
  });

  const { mutate: deletarProduto, isPending: isDeleting } = useMutation({
    mutationFn: ProdutosService.deletarProduto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess('Produto inativado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao excluir produto';
      showError(message);
    },
  });

  const { mutate: reativarProduto, isPending: isReactivating } = useMutation({
    mutationFn: ProdutosService.reativarProduto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess('Produto reativado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao reativar produto';
      showError(message);
    },
  });

  return {
    produtos: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isReactivating,
    criarProduto,
    atualizarProduto,
    deletarProduto,
    reativarProduto,
  };
}
