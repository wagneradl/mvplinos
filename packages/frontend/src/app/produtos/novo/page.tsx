'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/PageContainer';
import { ProdutoForm } from '@/components/ProdutoForm';
import { useProdutos } from '@/hooks/useProdutos';
import { useSnackbar } from '@/hooks/useSnackbar';
import { CreateProdutoDto } from '@/services/produtos.service';

export default function NovoProdutoPage() {
  const router = useRouter();
  const { criarProduto } = useProdutos();
  const { showError } = useSnackbar();

  const handleSubmit = (data: CreateProdutoDto) => {
    try {
      console.log('Dados enviados:', data);
      criarProduto(data, {
        onSuccess: () => {
          router.push('/produtos');
        },
        onError: (error: any) => {
          console.error('Erro ao criar produto:', error);
          if (error.response?.data?.message) {
            showError(error.response.data.message);
          } else {
            showError('Erro ao criar produto');
          }
        },
      });
    } catch (error: any) {
      console.error('Erro ao processar dados:', error);
      showError('Erro ao processar dados do formulário');
    }
  };

  return (
    <PageContainer title="Novo Produto">
      <ProdutoForm onSubmit={handleSubmit} />
    </PageContainer>
  );
}
