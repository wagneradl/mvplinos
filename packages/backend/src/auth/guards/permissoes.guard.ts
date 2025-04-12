import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';

@Injectable()
export class PermissoesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissoes',
      context.getHandler(),
    );

    // Se não houver permissões requeridas, permite o acesso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const usuario = user as UsuarioAutenticado;

    // Verifica se o usuário está autenticado
    if (!usuario) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    // Formato esperado: recurso:ação (ex: "clientes:read")
    // Obtemos o recurso e a ação necessários
    const [recurso, acao] = requiredPermissions[0].split(':');

    // Verifica se o usuário tem permissão para o recurso e ação
    if (!usuario.papel || !usuario.papel.permissoes) {
      return false;
    }

    const permissoesUsuario = usuario.papel.permissoes;
    
    // Se o usuário tiver a permissão específica ou for administrador, permite o acesso
    if (
      permissoesUsuario[recurso]?.includes(acao) ||
      usuario.papel.nome === 'Administrador'
    ) {
      return true;
    }

    return false;
  }
}
