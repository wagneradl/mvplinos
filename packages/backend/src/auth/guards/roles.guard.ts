import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';
import { PAPEL_ADMIN_SISTEMA, NIVEIS_PAPEL, CodigoPapel } from '../roles.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtém os papéis necessários do decorador (espera códigos como 'ADMIN_SISTEMA', 'OPERADOR_PEDIDOS')
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se não houver papéis requeridos, permite o acesso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtém o usuário do request
    const { user } = context.switchToHttp().getRequest();
    const usuario = user as UsuarioAutenticado;

    // Verifica se o usuário está autenticado e tem papel
    if (!usuario || !usuario.papel) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    const codigoUsuario = usuario.papel.codigo;
    const nivelUsuario = usuario.papel.nivel ?? NIVEIS_PAPEL[codigoUsuario as CodigoPapel] ?? 0;

    // ADMIN_SISTEMA sempre tem acesso a tudo
    if (codigoUsuario === PAPEL_ADMIN_SISTEMA) {
      return true;
    }

    // Verifica se o usuário tem um dos papéis requeridos ou nível suficiente
    const temPapelRequerido = requiredRoles.some((role) => {
      // Verifica correspondência direta do código
      if (codigoUsuario === role) {
        return true;
      }

      // Verifica se o nível do usuário é maior ou igual ao nível requerido
      const nivelRequerido = NIVEIS_PAPEL[role as CodigoPapel];
      if (nivelRequerido !== undefined && nivelUsuario >= nivelRequerido) {
        return true;
      }

      return false;
    });

    if (!temPapelRequerido) {
      throw new ForbiddenException(
        `Acesso negado. Papel necessário: ${requiredRoles.join(' ou ')}`,
      );
    }

    return true;
  }
}
