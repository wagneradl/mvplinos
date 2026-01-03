import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';
import { PAPEL_ADMIN_SISTEMA } from '../roles.constants';

@Injectable()
export class PermissoesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>('permissoes', context.getHandler());

    // Se não houver permissões requeridas, permite o acesso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const usuario = user as UsuarioAutenticado;

    // Verifica se o usuário está autenticado e tem papel
    if (!usuario || !usuario.papel) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    // ADMIN_SISTEMA sempre tem acesso a tudo
    if (usuario.papel.codigo === PAPEL_ADMIN_SISTEMA) {
      return true;
    }

    // Verifica se o usuário tem permissões definidas
    if (!usuario.papel.permissoes) {
      throw new ForbiddenException('Permissões não definidas para este usuário');
    }

    const permissoesUsuario = usuario.papel.permissoes;

    // Verifica todas as permissões requeridas
    // Formato esperado: recurso:ação (ex: "clientes:listar", "pedidos:criar")
    const todasPermissoes = requiredPermissions.every((permissao) => {
      const [recurso, acao] = permissao.split(':');
      return permissoesUsuario[recurso]?.includes(acao);
    });

    if (!todasPermissoes) {
      throw new ForbiddenException(
        `Acesso negado. Permissões necessárias: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
