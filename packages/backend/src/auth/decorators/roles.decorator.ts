import { SetMetadata } from '@nestjs/common';
import { CodigoPapel } from '../roles.constants';

export const ROLES_KEY = 'roles';

/**
 * Decorator para especificar os papéis necessários para acessar um endpoint.
 * Use os códigos de papel definidos em roles.constants.ts:
 * - PAPEL_ADMIN_SISTEMA
 * - PAPEL_GERENTE_COMERCIAL
 * - PAPEL_OPERADOR_PEDIDOS
 * - PAPEL_FINANCEIRO
 * - PAPEL_AUDITOR_READONLY
 * - PAPEL_CLIENTE_ADMIN
 * - PAPEL_CLIENTE_USUARIO
 *
 * @example
 * @Roles(PAPEL_ADMIN_SISTEMA)
 * @Roles(PAPEL_GERENTE_COMERCIAL, PAPEL_OPERADOR_PEDIDOS)
 */
export const Roles = (...roles: CodigoPapel[]) => SetMetadata(ROLES_KEY, roles);
