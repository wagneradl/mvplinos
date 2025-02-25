import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProdutosService, CreateProdutoDto } from '@/services/produtos.service';
import { Produto } from '@/types/produto';
import { useSnackbar } from './useSnackbar';

export function useProdutos(page = 1, limit = 10) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const { data, isLoading } = useQuery({
    queryKey: ['produtos', page, limit],
    queryFn: () => ProdutosService.listarProdutos(page, limit),
    staleTime: 0, // Sempre busca dados novos
  });

  const { mutate: criarProduto, isLoading: isCreating } = useMutation({
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

  const { mutate: atualizarProduto, isLoading: isUpdating } = useMutation({
    mutationFn: ({ id, produto }: { id: number; produto: Partial<Produto> }) =>
      ProdutosService.atualizarProduto(id, produto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess('Produto atualizado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar produto';
      showError(message);
    },
  });

  const { mutate: deletarProduto, isLoading: isDeleting } = useMutation({
    mutationFn: ProdutosService.deletarProduto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      showSuccess('Produto excluído com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao excluir produto';
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
    criarProduto,
    atualizarProduto,
    deletarProduto,
  };
}
