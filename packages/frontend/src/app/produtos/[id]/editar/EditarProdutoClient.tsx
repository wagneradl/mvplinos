'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CircularProgress } from '@mui/material';
import { PageContainer } from '@/components/PageContainer';
import { ProdutoForm } from '@/components/ProdutoForm';
import { useProdutos } from '@/hooks/useProdutos';
import { ProdutosService } from '@/services/produtos.service';

interface EditarProdutoClientProps {
  id: number;
}

export default function EditarProdutoClient({ id }: EditarProdutoClientProps) {
  const router = useRouter();
  const { atualizarProduto } = useProdutos();

  const { data: produto, isLoading } = useQuery({
    queryKey: ['produto', id],
    queryFn: () => ProdutosService.obterProduto(id, true),
    staleTime: 0, // Desabilitar cache para garantir dados atualizados
    refetchOnMount: true, // Forçar refetch ao montar o componente
    refetchOnWindowFocus: true, // Recarregar quando a janela ganhar foco
  });

  const handleSubmit = async (data: any) => {
    await atualizarProduto({ id, produto: data, includeDeleted: true });
    router.push('/produtos');
  };

  if (isLoading) {
    return (
      <PageContainer title="Editar Produto">
        <CircularProgress />
      </PageContainer>
    );
  }

  if (!produto) {
    return null;
  }

  return (
    <PageContainer title={`Editar Produto: ${produto.nome}`}>
      <ProdutoForm produto={produto} onSubmit={handleSubmit} />
    </PageContainer>
  );
}
