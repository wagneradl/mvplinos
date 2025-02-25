import { Pedido } from '@/types/pedido';
import { api } from './api';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ReportData {
  data: {
    date: string;
    total_orders: number;
    total_value: number;
  }[];
  summary: {
    total_orders: number;
    total_value: number;
    average_value: number;
  };
}

interface PedidosFilters {
  cliente_id?: number;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
}

interface PedidosParams {
  page?: number;
  limit?: number;
  filters?: PedidosFilters;
}

export const PedidosService = {
  async listarPedidos(params?: PedidosParams): Promise<PaginatedResponse<Pedido>> {
    try {
      // Garantir que os parâmetros básicos estão definidos
      const searchParams = new URLSearchParams({
        page: (params?.page || 1).toString(),
        limit: (params?.limit || 10).toString(),
      });

      // Adicionar filtros se fornecidos
      if (params?.filters) {
        // Filtro de cliente
        if (params.filters.cliente_id) {
          searchParams.append('clienteId', params.filters.cliente_id.toString());
        }
        
        // Filtro de datas
        if (params.filters.data_inicio) {
          const startDate = params.filters.data_inicio.substring(0, 10);
          searchParams.append('startDate', startDate);
          console.log('Frontend - startDate:', startDate);
        }
        if (params.filters.data_fim) {
          const endDate = params.filters.data_fim.substring(0, 10);
          searchParams.append('endDate', endDate);
          console.log('Frontend - endDate:', endDate);
        }
        
        // Filtro de status
        if (params.filters.status) {
          searchParams.append('status', params.filters.status);
          console.log('Frontend - status:', params.filters.status);
        }
      }

      // Log detalhado da requisição
      console.log(`Fazendo requisição para /pedidos?${searchParams.toString()}`);
      console.log('Parâmetros de filtro completos:', {
        page: params?.page || 1,
        limit: params?.limit || 10,
        startDate: params?.filters?.data_inicio,
        endDate: params?.filters?.data_fim,
        clienteId: params?.filters?.cliente_id,
        status: params?.filters?.status
      });
      
      const response = await api.get<PaginatedResponse<Pedido>>(`/pedidos?${searchParams.toString()}`);
      console.log('Resposta da API listarPedidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      throw error;
    }
  },

  async obterPedido(id: number): Promise<Pedido> {
    const response = await api.get<Pedido>(`/pedidos/${id}`);
    return response.data;
  },

  async criarPedido(pedido: Omit<Pedido, 'id'>): Promise<Pedido> {
    const response = await api.post<Pedido>('/pedidos', pedido);
    return response.data;
  },

  async atualizarPedido(id: number, status: string): Promise<Pedido> {
    const response = await api.patch<Pedido>(`/pedidos/${id}`, { status });
    return response.data;
  },

  async deletarPedido(id: number): Promise<void> {
    await api.delete(`/pedidos/${id}`);
  },

  async repetirPedido(id: number): Promise<Pedido> {
    const response = await api.post<Pedido>(`/pedidos/${id}/repeat`);
    return response.data;
  },

  async downloadPdf(id: number): Promise<void> {
    const response = await api.get(`/pedidos/${id}/pdf`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pedido-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getPedidoPdf(id: number): Promise<Blob> {
    const response = await api.get(`/pedidos/${id}/pdf`, { responseType: 'blob' });
    return response.data;
  },

  async gerarRelatorio(filtros: {
    data_inicio?: string;
    data_fim?: string;
    cliente_id?: number;
  }): Promise<ReportData> {
    const params = new URLSearchParams({
      ...(filtros.data_inicio && { data_inicio: filtros.data_inicio }),
      ...(filtros.data_fim && { data_fim: filtros.data_fim }),
      ...(filtros.cliente_id && { cliente_id: filtros.cliente_id.toString() }),
    });
    const response = await api.get<ReportData>(`/pedidos/reports/summary?${params}`);
    return response.data;
  },

  async downloadRelatorioPdf(filtros: {
    data_inicio?: string;
    data_fim?: string;
    cliente_id?: number;
  }): Promise<void> {
    try {
      // Criar parâmetros de forma mais segura
      const params = new URLSearchParams();
      
      if (filtros.data_inicio) {
        params.append('data_inicio', filtros.data_inicio);
      }
      
      if (filtros.data_fim) {
        params.append('data_fim', filtros.data_fim);
      }
      
      if (filtros.cliente_id) {
        params.append('cliente_id', filtros.cliente_id.toString());
      }
      
      console.log('Parâmetros para download do PDF:', params.toString());
      
      const response = await api.get(`/pedidos/reports/pdf?${params.toString()}`, {
        responseType: 'blob',
      });

      // Criar nome do arquivo com data atual
      const dataAtual = new Date().toISOString().split('T')[0];
      const fileName = `relatorio-vendas-${dataAtual}.pdf`;
      
      // Criar URL do blob e iniciar download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar PDF do relatório:', error);
      throw error;
    }
  },
};
