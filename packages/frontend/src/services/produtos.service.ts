import { Produto } from '@/types/produto';
import { api, extractErrorMessage } from './api';

export interface PaginatedResponse<T> {
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

export interface CreateProdutoDto {
  nome: string;
  descricao?: string;
  preco_unitario: number;
  tipo_medida: 'un' | 'kg' | 'lt';
  status: 'ativo' | 'inativo';
}

export const ProdutosService = {
  async listarProdutos(page = 1, limit = 10): Promise<PaginatedResponse<Produto>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await api.get<PaginatedResponse<Produto>>(`/produtos?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      throw error; // O interceptor já tratou o erro
    }
  },

  async obterProduto(id: number): Promise<Produto> {
    try {
      const response = await api.get(`/produtos/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter produto ${id}:`, error);
      throw error;
    }
  },

  async criarProduto(produto: CreateProdutoDto): Promise<Produto> {
    try {
      // Validações locais para evitar requisições desnecessárias
      if (!produto.nome?.trim()) {
        throw new Error('Nome do produto é obrigatório');
      }

      if (typeof produto.preco_unitario !== 'number' || isNaN(produto.preco_unitario) || produto.preco_unitario <= 0) {
        throw new Error('Preço unitário deve ser um número positivo');
      }

      if (!['un', 'kg', 'lt'].includes(produto.tipo_medida)) {
        throw new Error('Tipo de medida inválido');
      }

      if (!['ativo', 'inativo'].includes(produto.status)) {
        throw new Error('Status inválido');
      }

      // Garantir que o preço esteja formatado corretamente
      const produtoPayload = {
        ...produto,
        nome: produto.nome.trim(),
        descricao: produto.descricao?.trim(),
        preco_unitario: Number(produto.preco_unitario)
      };
      
      console.log('Enviando produto para API:', produtoPayload);
      const response = await api.post<Produto>('/produtos', produtoPayload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  },

  async atualizarProduto(id: number, produto: Partial<Produto>): Promise<Produto> {
    try {
      // Validações para campos fornecidos
      if (produto.nome !== undefined && !produto.nome.trim()) {
        throw new Error('Nome do produto não pode ser vazio');
      }

      if (produto.preco_unitario !== undefined && 
          (typeof produto.preco_unitario !== 'number' || 
           isNaN(produto.preco_unitario) || 
           produto.preco_unitario <= 0)) {
        throw new Error('Preço unitário deve ser um número positivo');
      }

      // Garantir limpeza de espaços e formato correto
      const produtoPayload = {
        ...produto,
        nome: produto.nome?.trim(),
        descricao: produto.descricao?.trim(),
        preco_unitario: produto.preco_unitario !== undefined ? Number(produto.preco_unitario) : undefined
      };

      const response = await api.patch(`/produtos/${id}`, produtoPayload);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar produto ${id}:`, error);
      throw error;
    }
  },

  async deletarProduto(id: number): Promise<void> {
    try {
      await api.delete(`/produtos/${id}`);
    } catch (error) {
      console.error(`Erro ao deletar produto ${id}:`, error);
      throw error;
    }
  },

  // Função para verificar se nome de produto já existe (validação adicional para casos de borda)
  async verificarNomeDuplicado(nome: string, excluirId?: number): Promise<boolean> {
    try {
      // Consulta apenas produtos com nome similar (validação case-insensitive já feita no backend)
      const response = await api.get<PaginatedResponse<Produto>>('/produtos', {
        params: {
          limit: 100,
          nome: nome.trim()
        }
      });
      
      // Verifica se algum produto com esse nome já existe (excluindo o próprio produto no caso de edição)
      return response.data.data.some(produto => 
        produto.nome.toLowerCase() === nome.trim().toLowerCase() && 
        (excluirId === undefined || produto.id !== excluirId)
      );
    } catch (error) {
      console.error('Erro ao verificar nome duplicado:', error);
      // Em caso de erro na validação, retorna false para não bloquear o usuário
      // mas registra o erro para diagnóstico
      return false;
    }
  },

  // Validação avançada para casos de borda no preço
  validarPreco(preco: any): { valido: boolean; mensagem?: string } {
    // Verifica se é um número
    if (typeof preco !== 'number' || isNaN(preco)) {
      return { valido: false, mensagem: 'O preço deve ser um número válido' };
    }
    
    // Verifica valor negativo
    if (preco < 0) {
      return { valido: false, mensagem: 'O preço não pode ser negativo' };
    }
    
    // Verifica valor zero
    if (preco === 0) {
      return { valido: false, mensagem: 'O preço não pode ser zero' };
    }
    
    // Verifica valores muito altos (possível erro de digitação)
    if (preco > 100000) {
      return { valido: false, mensagem: 'O preço parece muito alto. Verifique se está correto' };
    }
    
    // Verifica precisão da casa decimal (evita erros de arredondamento)
    const precision = (preco.toString().split('.')[1] || '').length;
    if (precision > 2) {
      return { valido: false, mensagem: 'O preço deve ter no máximo duas casas decimais' };
    }
    
    return { valido: true };
  }
};
