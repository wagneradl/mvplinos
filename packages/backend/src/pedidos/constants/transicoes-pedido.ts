/**
 * Mapa de transições de status do pedido.
 * Objeto literal puro — sem dependências NestJS — importável pelo frontend.
 *
 * Fluxo principal:
 * RASCUNHO → PENDENTE → CONFIRMADO → EM_PRODUCAO → PRONTO → ENTREGUE
 *
 * CANCELADO é acessível de RASCUNHO, PENDENTE, CONFIRMADO e EM_PRODUCAO.
 * PRONTO só pode ir para ENTREGUE (pedido já produzido, não cancela).
 * ENTREGUE e CANCELADO são estados finais (sem transições de saída).
 */

export const TRANSICOES_VALIDAS: Record<string, string[]> = {
  RASCUNHO: ['PENDENTE', 'CANCELADO'],
  PENDENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EM_PRODUCAO', 'CANCELADO'],
  EM_PRODUCAO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADO: [],
};

/** Todos os estados válidos de um pedido */
export const ESTADOS_PEDIDO = Object.keys(TRANSICOES_VALIDAS);

/** Estados terminais — sem transições de saída */
export const ESTADOS_FINAIS = ['ENTREGUE', 'CANCELADO'];

/** Estados que bloqueiam edição de conteúdo (itens, quantidades, observações).
 *  Somente RASCUNHO e PENDENTE permitem edição. */
export const ESTADOS_BLOQUEIO_EDICAO = [
  'CONFIRMADO',
  'EM_PRODUCAO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO',
];

/**
 * Verifica se a transição de `atual` para `novo` é válida.
 * Função pura, sem side-effects.
 */
export function transicaoValida(atual: string, novo: string): boolean {
  const permitidos = TRANSICOES_VALIDAS[atual];
  if (!permitidos) return false;
  return permitidos.includes(novo);
}

/**
 * Transições permitidas por tipo de papel (CLIENTE / INTERNO).
 *
 * CLIENTE: pode montar rascunho, enviar e cancelar antes da confirmação.
 * INTERNO: conduz o pedido da confirmação até a entrega, pode cancelar.
 */
export const TRANSICOES_POR_TIPO: Record<string, Record<string, string[]>> = {
  CLIENTE: {
    RASCUNHO: ['PENDENTE', 'CANCELADO'],
    PENDENTE: ['CANCELADO'],
  },
  INTERNO: {
    PENDENTE: ['CONFIRMADO', 'CANCELADO'],
    CONFIRMADO: ['EM_PRODUCAO', 'CANCELADO'],
    EM_PRODUCAO: ['PRONTO', 'CANCELADO'],
    PRONTO: ['ENTREGUE'],
  },
};

/**
 * Verifica se o papel `tipoPapel` pode realizar a transição `atual → novo`.
 */
export function transicaoPermitidaPorPapel(
  tipoPapel: string,
  atual: string,
  novo: string,
): boolean {
  const mapa = TRANSICOES_POR_TIPO[tipoPapel];
  if (!mapa) return false;
  const permitidos = mapa[atual];
  if (!permitidos) return false;
  return permitidos.includes(novo);
}
