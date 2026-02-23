'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/PageContainer';
import { UsuarioForm } from '@/components/UsuarioForm';
import { useUsuarios } from '@/hooks/useUsuarios';

export default function NovoUsuarioPage() {
  const router = useRouter();
  const { criarUsuario } = useUsuarios();

  const handleSubmit = async (data: Record<string, unknown>) => {
    criarUsuario(data as Parameters<typeof criarUsuario>[0], {
      onSuccess: () => {
        router.push('/usuarios');
      },
    });
  };

  return (
    <PageContainer title="Novo Usuário">
      <UsuarioForm onSubmit={handleSubmit} />
    </PageContainer>
  );
}
