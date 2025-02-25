'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/PageContainer';
import { ClienteForm } from '@/components/ClienteForm';
import { useClientes } from '@/hooks/useClientes';

export default function NovoClientePage() {
  const router = useRouter();
  const { criarCliente } = useClientes();

  const handleSubmit = async (data: any) => {
    await criarCliente(data);
    router.push('/clientes');
  };

  return (
    <PageContainer title="Novo Cliente">
      <ClienteForm onSubmit={handleSubmit} />
    </PageContainer>
  );
}
