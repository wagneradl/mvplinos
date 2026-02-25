/**
 * Constantes de status do pedido — espelha o backend (P47).
 * Duplicado para evitar dependência cross-package no monorepo.
 */

export const STATUS_PEDIDO = {
  RASCUNHO: 'RASCUNHO',
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO',
  EM_PRODUCAO: 'EM_PRODUCAO',
  PRONTO: 'PRONTO',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
} as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[keyof typeof STATUS_PEDIDO];

/** Ordem do fluxo principal (sem CANCELADO) para renderizar a timeline */
export const FLUXO_PRINCIPAL: StatusPedido[] = [
  'RASCUNHO',
  'PENDENTE',
  'CONFIRMADO',
  'EM_PRODUCAO',
  'PRONTO',
  'ENTREGUE',
];

/** Configuração visual de cada status (cores MUI-friendly) */
export const STATUS_CONFIG: Record<
  StatusPedido,
  {
    label: string;
    bgColor: string;
    textColor: string;
  }
> = {
  RASCUNHO: { label: 'Rascunho', bgColor: '#F3F4F6', textColor: '#374151' },
  PENDENTE: { label: 'Pendente', bgColor: '#FEF3C7', textColor: '#92400E' },
  CONFIRMADO: { label: 'Confirmado', bgColor: '#DBEAFE', textColor: '#1E40AF' },
  EM_PRODUCAO: { label: 'Em Produção', bgColor: '#FFEDD5', textColor: '#9A3412' },
  PRONTO: { label: 'Pronto', bgColor: '#D1FAE5', textColor: '#065F46' },
  ENTREGUE: { label: 'Entregue', bgColor: '#A7F3D0', textColor: '#064E3B' },
  CANCELADO: { label: 'Cancelado', bgColor: '#FEE2E2', textColor: '#991B1B' },
};

/** Transições válidas por status (espelha backend) */
export const TRANSICOES_VALIDAS: Record<string, string[]> = {
  RASCUNHO: ['PENDENTE', 'CANCELADO'],
  PENDENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EM_PRODUCAO', 'CANCELADO'],
  EM_PRODUCAO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADO: [],
};

/** Transições permitidas por tipo de papel (CLIENTE / INTERNO) */
export const TRANSICOES_POR_TIPO: Record<string, Record<string, string[]>> = {
  CLIENTE: {
    RASCUNHO: ['PENDENTE', 'CANCELADO'],
    PENDENTE: ['CANCELADO'],
    PRONTO: ['ENTREGUE'],
  },
  INTERNO: {
    PENDENTE: ['CONFIRMADO', 'CANCELADO'],
    CONFIRMADO: ['EM_PRODUCAO', 'CANCELADO'],
    EM_PRODUCAO: ['PRONTO', 'CANCELADO'],
    PRONTO: ['ENTREGUE'],
  },
};

/** Labels e cores para cada botão de transição */
export const TRANSICAO_BOTAO: Record<
  string,
  { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  PENDENTE: { label: 'Enviar Pedido', color: 'primary' },
  CONFIRMADO: { label: 'Confirmar Pedido', color: 'info' },
  EM_PRODUCAO: { label: 'Iniciar Produção', color: 'warning' },
  PRONTO: { label: 'Marcar Pronto', color: 'success' },
  ENTREGUE: { label: 'Registrar Entrega', color: 'success' },
  CANCELADO: { label: 'Cancelar', color: 'error' },
};

/** Estados finais — sem transições de saída */
export const ESTADOS_FINAIS: StatusPedido[] = ['ENTREGUE', 'CANCELADO'];

/** Verifica se o pedido pode ter conteúdo editado (itens, quantidades, observações).
 *  Somente RASCUNHO e PENDENTE permitem edição. */
export const podeEditarPedido = (status: string): boolean => {
  return ['RASCUNHO', 'PENDENTE'].includes(status);
};
