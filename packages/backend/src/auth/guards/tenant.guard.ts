import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';
import { TIPO_CLIENTE } from '../roles.constants';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UsuarioAutenticado;

    // Papéis internos (ADMIN, GERENTE, etc.) passam direto
    if (user.papel.tipo !== TIPO_CLIENTE) {
      return true;
    }

    // Papéis de cliente DEVEM ter clienteId
    if (!user.clienteId) {
      throw new ForbiddenException(
        'Usuário cliente sem vínculo com empresa',
      );
    }

    // Injeta clienteId no request para uso nos services
    request.clienteId = user.clienteId;
    return true;
  }
}
