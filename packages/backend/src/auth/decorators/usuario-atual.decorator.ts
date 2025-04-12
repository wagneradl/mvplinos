import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';

export const UsuarioAtual = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
