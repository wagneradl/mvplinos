export interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  preco_unitario: number;
  tipo_medida: string;
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
