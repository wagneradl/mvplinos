'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Box, CircularProgress, Alert, Button } from '@mui/material';
import { PageContainer } from '@/components/PageContainer';
import { UsuarioForm } from '@/components/UsuarioForm';
import { useUsuarios } from '@/hooks/useUsuarios';
import { UsuariosService } from '@/services/usuarios.service';
import Link from 'next/link';

interface EditarUsuarioClientProps {
  id: number;
}

export default function EditarUsuarioClient({ id }: EditarUsuarioClientProps) {
  const router = useRouter();
  const { atualizarUsuario } = useUsuarios();

  const { data: usuario, isLoading, error } = useQuery({
    queryKey: ['usuario', id],
    queryFn: () => UsuariosService.obterUsuario(id),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const handleSubmit = async (data: Record<string, unknown>) => {
    atualizarUsuario(
      { id, usuario: data as Parameters<typeof atualizarUsuario>[0]['usuario'] },
      {
        onSuccess: () => {
          router.push('/usuarios');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <PageContainer title="Editar Usuário">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error || !usuario) {
    return (
      <PageContainer title="Editar Usuário">
        <Alert severity="error" sx={{ mb: 2 }}>
          Usuário não encontrado.
        </Alert>
        <Button component={Link} href="/usuarios" variant="outlined">
          Voltar para Usuários
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Editar Usuário: ${usuario.nome}`}>
      <UsuarioForm usuario={usuario} onSubmit={handleSubmit} />
    </PageContainer>
  );
}
