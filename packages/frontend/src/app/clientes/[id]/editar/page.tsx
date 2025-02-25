'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CircularProgress } from '@mui/material';
import { PageContainer } from '@/components/PageContainer';
import { ClienteForm } from '@/components/ClienteForm';
import { useClientes } from '@/hooks/useClientes';
import { ClientesService } from '@/services/clientes.service';

interface EditarClientePageProps {
  params: {
    id: string;
  };
}

export default function EditarClientePage({ params }: EditarClientePageProps) {
  const router = useRouter();
  const id = parseInt(params.id);
  const { atualizarCliente } = useClientes();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => ClientesService.obterCliente(id),
  });

  const handleSubmit = async (data: any) => {
    await atualizarCliente({ id, cliente: data });
    router.push('/clientes');
  };

  if (isLoading) {
    return (
      <PageContainer title="Editar Cliente">
        <CircularProgress />
      </PageContainer>
    );
  }

  if (!cliente) {
    return null;
  }

  return (
    <PageContainer title={`Editar Cliente: ${cliente.nome_fantasia}`}>
      <ClienteForm cliente={cliente} onSubmit={handleSubmit} />
    </PageContainer>
  );
}
