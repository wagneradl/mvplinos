import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsuariosService } from '@/services/usuarios.service';
import { Usuario, UpdateUsuarioDto } from '@/types/usuario';
import { useSnackbar } from './useSnackbar';
import { loggers } from '@/utils/logger';
import { AxiosError } from 'axios';

const logger = loggers.usuarios;

/** Extrai mensagem de erro do backend (AxiosError) ou genérica */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

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
      showError(extractErrorMessage(err, 'Erro ao criar usuário'));
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
      showError(extractErrorMessage(err, 'Erro ao atualizar usuário'));
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
      showError(extractErrorMessage(err, 'Erro ao inativar usuário'));
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
      showError(extractErrorMessage(err, 'Erro ao reativar usuário'));
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

export function usePapeis(tipo?: string) {
  const logger = loggers.usuarios;

  const { data, isLoading, error } = useQuery({
    queryKey: ['papeis', tipo],
    queryFn: async () => {
      try {
        logger.debug('Buscando papéis', { tipo });
        return await UsuariosService.listarPapeis(tipo);
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
