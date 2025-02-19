export interface IProduto {
  id: number;
  nome: string;
  preco_unitario: number;
  tipo_medida: string;
  status: string;
}

export interface ICliente {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  telefone: string;
  email: string;
  status: string;
}

export interface IPedido {
  id: number;
  cliente_id: number;
  data_pedido: Date;
  status: string;
  valor_total: number;
  caminho_pdf: string;
  itens_pedido: IItemPedido[];
}

export interface IItemPedido {
  id: number;
  pedido_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  valor_total_item: number;
}