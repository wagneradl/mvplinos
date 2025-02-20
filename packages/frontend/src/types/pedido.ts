export interface Cliente {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ItemPedido {
  id: number;
  pedido_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  valor_total_item: number;
  created_at: string;
  updated_at: string;
}

export interface Pedido {
  id: number;
  cliente_id: number;
  cliente?: Cliente;
  data_pedido: string;
  valor_total: number;
  status: 'PENDENTE' | 'ATUALIZADO' | 'CANCELADO';
  pdf_path?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  itensPedido: ItemPedido[];
}
