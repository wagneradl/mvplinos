import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtém os papéis necessários do decorador
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

    // Verifica se o usuário está autenticado
    if (!usuario) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    // Verifica se o usuário tem o papel requerido
    const temPapelRequerido = requiredRoles.some(role => {
      // Converte para formato consistente (admin -> Admin -> Administrador)
      const roleLowerCase = role.toLowerCase();
      
      if (roleLowerCase === 'admin' || roleLowerCase === 'administrador') {
        return usuario.papel?.nome === 'Administrador';
      }
      
      if (roleLowerCase === 'operador') {
        return usuario.papel?.nome === 'Operador' || usuario.papel?.nome === 'Administrador';
      }
      
      // Verificação direta do nome do papel
      return usuario.papel?.nome === role;
    });

    return temPapelRequerido;
  }
}
