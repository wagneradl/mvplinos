import { Pedido } from '@/types/pedido';
import { api } from './api';

export const PedidosService = {
  async listarPedidos(page = 1, limit = 10) {
    const response = await api.get(`/pedidos?page=${page}&limit=${limit}`);
    return response.data;
  },

  async obterPedido(id: number) {
    const response = await api.get(`/pedidos/${id}`);
    return response.data;
  },

  async criarPedido(pedido: Omit<Pedido, 'id'>) {
    const response = await api.post('/pedidos', pedido);
    return response.data;
  },

  async atualizarPedido(id: number, status: string) {
    const response = await api.patch(`/pedidos/${id}`, { status });
    return response.data;
  },

  async deletarPedido(id: number) {
    const response = await api.delete(`/pedidos/${id}`);
    return response.data;
  },

  async repetirPedido(id: number) {
    const response = await api.post(`/pedidos/${id}/repeat`);
    return response.data;
  },

  async downloadPdf(id: number) {
    const response = await api.get(`/pedidos/${id}/pdf`, {
      responseType: 'blob'
    });
    
    // Criar URL do blob e iniciar download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pedido-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
