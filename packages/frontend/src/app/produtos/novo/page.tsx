'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/PageContainer';
import { ProdutoForm } from '@/components/ProdutoForm';
import { useProdutos } from '@/hooks/useProdutos';
import { CreateProdutoDto } from '@/services/produtos.service';

export default function NovoProdutoPage() {
  const router = useRouter();
  const { criarProduto } = useProdutos();

  const handleSubmit = (data: CreateProdutoDto) => {
    criarProduto(data, {
      onSuccess: () => {
        router.push('/produtos');
      },
      // onError já é tratado no hook useProdutos com showError
    });
  };

  return (
    <PageContainer title="Novo Produto">
      <ProdutoForm onSubmit={handleSubmit} />
    </PageContainer>
  );
}
