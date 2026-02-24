export interface DashboardResumo {
  totalPedidos: number;
  pedidosMes: number;
  valorTotalMes: number;
  pedidosPendentes: number;
}

export interface DashboardPorStatus {
  status: string;
  quantidade: number;
  percentual: number;
}

export interface DashboardPedidoRecente {
  id: number;
  dataPedido: string;
  status: string;
  valorTotal: number;
  quantidadeItens: number;
}

export interface DashboardResponse {
  resumo: DashboardResumo;
  porStatus: DashboardPorStatus[];
  pedidosRecentes: DashboardPedidoRecente[];
}
