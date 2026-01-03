/**
 * Constantes de Papéis (Roles) do sistema
 *
 * INTERNOS: Usuários da empresa (padaria)
 * CLIENTES: Usuários de clientes B2B
 */

// Códigos dos papéis internos
export const PAPEL_ADMIN_SISTEMA = 'ADMIN_SISTEMA';
export const PAPEL_GERENTE_COMERCIAL = 'GERENTE_COMERCIAL';
export const PAPEL_OPERADOR_PEDIDOS = 'OPERADOR_PEDIDOS';
export const PAPEL_FINANCEIRO = 'FINANCEIRO';
export const PAPEL_AUDITOR_READONLY = 'AUDITOR_READONLY';

// Códigos dos papéis de clientes (B2B)
export const PAPEL_CLIENTE_ADMIN = 'CLIENTE_ADMIN';
export const PAPEL_CLIENTE_USUARIO = 'CLIENTE_USUARIO';

// Tipos de papel
export const TIPO_INTERNO = 'INTERNO';
export const TIPO_CLIENTE = 'CLIENTE';

// Níveis de hierarquia (maior = mais permissões)
export const NIVEIS_PAPEL = {
  [PAPEL_ADMIN_SISTEMA]: 100,
  [PAPEL_GERENTE_COMERCIAL]: 80,
  [PAPEL_FINANCEIRO]: 60,
  [PAPEL_OPERADOR_PEDIDOS]: 50,
  [PAPEL_AUDITOR_READONLY]: 40,
  [PAPEL_CLIENTE_ADMIN]: 30,
  [PAPEL_CLIENTE_USUARIO]: 20,
} as const;

// Lista de todos os papéis internos
export const PAPEIS_INTERNOS = [
  PAPEL_ADMIN_SISTEMA,
  PAPEL_GERENTE_COMERCIAL,
  PAPEL_OPERADOR_PEDIDOS,
  PAPEL_FINANCEIRO,
  PAPEL_AUDITOR_READONLY,
] as const;

// Lista de todos os papéis de cliente
export const PAPEIS_CLIENTES = [PAPEL_CLIENTE_ADMIN, PAPEL_CLIENTE_USUARIO] as const;

// Todos os papéis
export const TODOS_PAPEIS = [...PAPEIS_INTERNOS, ...PAPEIS_CLIENTES] as const;

// Type helpers
export type PapelInterno = (typeof PAPEIS_INTERNOS)[number];
export type PapelCliente = (typeof PAPEIS_CLIENTES)[number];
export type CodigoPapel = (typeof TODOS_PAPEIS)[number];
export type TipoPapel = typeof TIPO_INTERNO | typeof TIPO_CLIENTE;

// Ações disponíveis
export type Acao =
  | 'listar'
  | 'ver'
  | 'criar'
  | 'editar'
  | 'desativar'
  | 'deletar'
  | 'cancelar'
  | 'exportar'
  | 'resetar_senha'
  | 'backup'
  | 'restore';

// Recursos do sistema
export type Recurso =
  | 'usuarios'
  | 'papeis'
  | 'clientes'
  | 'produtos'
  | 'pedidos'
  | 'relatorios'
  | 'financeiro'
  | 'sistema';

// Tipo de permissões
export type Permissoes = {
  [key in Recurso]?: Acao[];
};
