import { Cliente } from '@/types/pedido';
import { api } from './api';
import { loggers } from '@/utils/logger';

const clientesLogger = loggers.clientes;

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export const ClientesService = {
  async listarClientes(
    page = 1,
    limit = 10,
    status?: string,
    search?: string
  ): Promise<PaginatedResponse<Cliente>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Adicionar filtro de status se fornecido
      if (status) {
        params.append('status', status);
      }

      // Adicionar termo de busca se fornecido
      if (search) {
        params.append('search', search);
      }

      clientesLogger.debug(`Fazendo requisição para /clientes?${params}`);
      const response = await api.get(`/clientes?${params}`);
      clientesLogger.debug('Resposta da API de listarClientes:', response.data);
      return response.data;
    } catch (error) {
      clientesLogger.error('Erro ao listar clientes:', error);
      throw error;
    }
  },

  async listarTodosClientes(limit = 100, status?: string): Promise<Cliente[]> {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: limit.toString(),
      });

      // Adicionar filtro de status se fornecido (por padrão, apenas clientes ativos)
      if (status !== undefined) {
        params.append('status', status);
      } else {
        // Por padrão, listar apenas clientes ativos
        params.append('status', 'ativo');
      }

      const response = await api.get(`/clientes?${params}`);
      return response.data.data;
    } catch (error) {
      clientesLogger.error('Erro ao listar todos os clientes:', error);
      throw error;
    }
  },

  async obterCliente(id: number, includeDeleted: boolean = true): Promise<Cliente> {
    try {
      // Incluir o parâmetro includeDeleted para permitir buscar clientes soft-deleted
      const response = await api.get(`/clientes/${id}?includeDeleted=${includeDeleted}`);
      return response.data;
    } catch (error) {
      clientesLogger.error(`Erro ao obter cliente ${id}:`, error);
      throw error;
    }
  },

  async criarCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    try {
      // Validações avançadas
      ClientesService.validarCliente(cliente);

      clientesLogger.debug('Enviando cliente para o backend:', cliente);
      const response = await api.post('/clientes', cliente);
      return response.data;
    } catch (error) {
      clientesLogger.error('Erro ao criar cliente:', error);
      throw error;
    }
  },

  async atualizarCliente(
    id: number,
    cliente: Partial<Cliente>,
    includeDeleted: boolean = true
  ): Promise<Cliente> {
    try {
      // Validações para campos fornecidos
      if (cliente.cnpj) {
        ClientesService.validarCNPJ(cliente.cnpj);
      }

      if (cliente.telefone) {
        ClientesService.validarTelefone(cliente.telefone);
      }

      if (cliente.email) {
        ClientesService.validarEmail(cliente.email);
      }

      clientesLogger.debug('Atualizando cliente:', id, cliente);
      // Incluir o parâmetro includeDeleted para permitir atualizar clientes soft-deleted
      const response = await api.patch(`/clientes/${id}?includeDeleted=${includeDeleted}`, cliente);
      return response.data;
    } catch (error) {
      clientesLogger.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  },

  async deletarCliente(id: number): Promise<void> {
    try {
      await api.delete(`/clientes/${id}`);
    } catch (error) {
      clientesLogger.error(`Erro ao inativar cliente ${id}:`, error);
      throw error;
    }
  },

  async reativarCliente(id: number): Promise<Cliente> {
    try {
      // Reativar cliente é uma atualização de status
      // Incluir o parâmetro includeDeleted=true para permitir atualizar clientes soft-deleted
      const response = await api.patch(`/clientes/${id}?includeDeleted=true`, { status: 'ativo' });
      return response.data;
    } catch (error) {
      clientesLogger.error(`Erro ao reativar cliente ${id}:`, error);
      throw error;
    }
  },

  // Validações adicionais para casos de borda
  validarCliente(cliente: Omit<Cliente, 'id'>): void {
    // Validações básicas
    if (!cliente.cnpj) {
      throw new Error('CNPJ é obrigatório');
    }

    if (!cliente.telefone) {
      throw new Error('Telefone é obrigatório');
    }

    if (!cliente.email) {
      throw new Error('Email é obrigatório');
    }

    if (!cliente.razao_social) {
      throw new Error('Razão social é obrigatória');
    }

    if (!cliente.nome_fantasia) {
      throw new Error('Nome fantasia é obrigatório');
    }

    // Validações mais específicas
    ClientesService.validarCNPJ(cliente.cnpj);
    ClientesService.validarTelefone(cliente.telefone);
    ClientesService.validarEmail(cliente.email);

    // Validar status
    if (cliente.status && !['ativo', 'inativo'].includes(cliente.status)) {
      throw new Error('Status inválido. Deve ser "ativo" ou "inativo"');
    }
  },

  validarCNPJ(cnpj: string): void {
    const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
    if (!cnpjRegex.test(cnpj)) {
      throw new Error('CNPJ inválido. Formato esperado: XX.XXX.XXX/XXXX-XX');
    }

    // Validação adicional para dígitos verificadores do CNPJ
    const digits = cnpj.replace(/\D/g, '');

    // Verifica se todos os dígitos são iguais (CNPJ inválido)
    if (/^(\d)\1+$/.test(digits)) {
      throw new Error('CNPJ inválido. Todos os dígitos são iguais.');
    }
  },

  validarTelefone(telefone: string): void {
    const telefoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!telefoneRegex.test(telefone)) {
      throw new Error('Telefone inválido. Formato esperado: (XX) XXXXX-XXXX');
    }
  },

  validarEmail(email: string): void {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido.');
    }

    // Validação adicional para domínios comuns com erro de digitação
    const domainPart = email.split('@')[1];
    const commonTypos: Record<string, string> = {
      'gmail.co': 'gmail.com',
      'gmial.com': 'gmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'outlook.co': 'outlook.com',
    };

    if (commonTypos[domainPart]) {
      throw new Error(
        `Email possivelmente incorreto. Você quis dizer ${email.split('@')[0]}@${commonTypos[domainPart]}?`
      );
    }
  },

  // Verifica se CNPJ já existe (evitando duplicação)
  async verificarCNPJDuplicado(cnpj: string, excluirId?: number): Promise<boolean> {
    try {
      // Remove formatação para busca
      const cnpjLimpo = cnpj.replace(/\D/g, '');

      // Buscar clientes com este CNPJ, incluindo inativos e soft-deleted
      const response = await api.get<PaginatedResponse<Cliente>>('/clientes', {
        params: {
          limit: 100,
          cnpj: cnpjLimpo,
          includeDeleted: true, // Parâmetro especial para incluir soft-deleted
        },
      });

      // Verificar se existe algum cliente com este CNPJ (exceto o próprio cliente sendo editado)
      const clienteExistente = response.data.data.some(
        (cliente) =>
          cliente.cnpj.replace(/\D/g, '') === cnpjLimpo &&
          (excluirId === undefined || cliente.id !== excluirId)
      );

      if (clienteExistente) {
        clientesLogger.debug('CNPJ duplicado encontrado. Verifique a lista de clientes inativos.');
      }

      return clienteExistente;
    } catch (error) {
      clientesLogger.error('Erro ao verificar CNPJ duplicado:', error);
      return false;
    }
  },
};
