import { Usuario, Papel, CreateUsuarioDto, UpdateUsuarioDto } from '@/types/usuario';
import { api } from './api';
import { loggers } from '@/utils/logger';

const usuariosLogger = loggers.usuarios;

export const UsuariosService = {
  async listarUsuarios(): Promise<Usuario[]> {
    try {
      usuariosLogger.debug('Fazendo requisição para /usuarios');
      const response = await api.get<Usuario[]>('/usuarios');
      usuariosLogger.debug('Resposta da API de listarUsuarios:', response.data);
      return response.data;
    } catch (error) {
      usuariosLogger.error('Erro ao listar usuários:', error);
      throw error;
    }
  },

  async obterUsuario(id: number): Promise<Usuario> {
    try {
      const response = await api.get<Usuario>(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      usuariosLogger.error(`Erro ao obter usuário ${id}:`, error);
      throw error;
    }
  },

  async criarUsuario(usuario: CreateUsuarioDto): Promise<Usuario> {
    try {
      usuariosLogger.debug('Enviando usuário para API:', { ...usuario, senha: '[REDACTED]' });
      const response = await api.post<Usuario>('/usuarios', usuario);
      return response.data;
    } catch (error) {
      usuariosLogger.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  async atualizarUsuario(id: number, usuario: UpdateUsuarioDto): Promise<Usuario> {
    try {
      const logPayload = { ...usuario };
      if ('senha' in logPayload) {
        (logPayload as Record<string, unknown>).senha = '[REDACTED]';
      }
      usuariosLogger.debug('Atualizando usuário:', id, logPayload);
      const response = await api.patch<Usuario>(`/usuarios/${id}`, usuario);
      return response.data;
    } catch (error) {
      usuariosLogger.error(`Erro ao atualizar usuário ${id}:`, error);
      throw error;
    }
  },

  async deletarUsuario(id: number): Promise<void> {
    try {
      await api.delete(`/usuarios/${id}`);
    } catch (error) {
      usuariosLogger.error(`Erro ao inativar usuário ${id}:`, error);
      throw error;
    }
  },

  async reativarUsuario(id: number): Promise<Usuario> {
    try {
      const response = await api.patch<Usuario>(`/usuarios/${id}`, { status: 'ativo' });
      return response.data;
    } catch (error) {
      usuariosLogger.error(`Erro ao reativar usuário ${id}:`, error);
      throw error;
    }
  },

  async listarPapeis(tipo?: string): Promise<Papel[]> {
    try {
      const params = tipo ? { tipo } : {};
      usuariosLogger.debug('Fazendo requisição para /usuarios/papeis', { tipo });
      const response = await api.get<Papel[]>('/usuarios/papeis', { params });
      return response.data;
    } catch (error) {
      usuariosLogger.error('Erro ao listar papéis:', error);
      throw error;
    }
  },
};
