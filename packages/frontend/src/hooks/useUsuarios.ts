import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsuariosService } from '@/services/usuarios.service';
import { Usuario, UpdateUsuarioDto } from '@/types/usuario';
import { useSnackbar } from './useSnackbar';
import { loggers } from '@/utils/logger';

const logger = loggers.usuarios;

export function useUsuarios() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const { data, isLoading, error, refetch } = useQuery<Usuario[], Error>({
    queryKey: ['usuarios'],
    queryFn: async () => {
      try {
        logger.debug('Buscando usuários');
        const response = await UsuariosService.listarUsuarios();
        logger.debug('Resposta da API de usuários:', response);
        return response;
      } catch (err) {
        logger.error('Erro ao buscar usuários:', err);
        throw err;
      }
    },
    staleTime: 5000,
    retry: 1,
  });

  const { mutate: criarUsuario } = useMutation({
    mutationFn: UsuariosService.criarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showSuccess('Usuário criado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao criar usuário:', err);
      showError(
        `Erro ao criar usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      );
    },
  });

  const { mutate: atualizarUsuario } = useMutation({
    mutationFn: ({ id, usuario }: { id: number; usuario: UpdateUsuarioDto }) =>
      UsuariosService.atualizarUsuario(id, usuario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showSuccess('Usuário atualizado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao atualizar usuário:', err);
      showError(
        `Erro ao atualizar usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      );
    },
  });

  const { mutate: deletarUsuario } = useMutation({
    mutationFn: UsuariosService.deletarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showSuccess('Usuário inativado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao inativar usuário:', err);
      showError(
        `Erro ao inativar usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      );
    },
  });

  const { mutate: reativarUsuario } = useMutation({
    mutationFn: UsuariosService.reativarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showSuccess('Usuário reativado com sucesso!');
    },
    onError: (err) => {
      logger.error('Erro ao reativar usuário:', err);
      showError(
        `Erro ao reativar usuário: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      );
    },
  });

  return {
    usuarios: data || [],
    isLoading,
    error: error ? error.message : null,
    refetch,
    criarUsuario,
    atualizarUsuario,
    deletarUsuario,
    reativarUsuario,
  };
}

export function usePapeis() {
  const logger = loggers.usuarios;

  const { data, isLoading, error } = useQuery({
    queryKey: ['papeis'],
    queryFn: async () => {
      try {
        logger.debug('Buscando papéis');
        return await UsuariosService.listarPapeis();
      } catch (err) {
        logger.error('Erro ao buscar papéis:', err);
        throw err;
      }
    },
    staleTime: 30000,
    retry: 1,
  });

  return {
    papeis: data || [],
    isLoading,
    error: error ? error.message : null,
  };
}

export default useUsuarios;
