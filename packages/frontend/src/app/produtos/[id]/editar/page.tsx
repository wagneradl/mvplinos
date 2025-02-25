'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CircularProgress } from '@mui/material';
import { PageContainer } from '@/components/PageContainer';
import { ProdutoForm } from '@/components/ProdutoForm';
import { useProdutos } from '@/hooks/useProdutos';
import { ProdutosService } from '@/services/produtos.service';

interface EditarProdutoPageProps {
  params: {
    id: string;
  };
}

export default function EditarProdutoPage({ params }: EditarProdutoPageProps) {
  const router = useRouter();
  const id = parseInt(params.id);
  const { atualizarProduto } = useProdutos();

  const { data: produto, isLoading } = useQuery({
    queryKey: ['produto', id],
    queryFn: () => ProdutosService.obterProduto(id),
  });

  const handleSubmit = async (data: any) => {
    await atualizarProduto({ id, produto: data });
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
