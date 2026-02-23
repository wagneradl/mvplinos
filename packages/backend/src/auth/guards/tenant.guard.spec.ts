import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { TIPO_CLIENTE, TIPO_INTERNO } from '../roles.constants';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  const createMockContext = (user: any): ExecutionContext => {
    const request = { user } as any;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  // =========================================================================
  // USUARIOS INTERNOS
  // =========================================================================

  describe('Usuários INTERNOS', () => {
    it('deve permitir ADMIN_SISTEMA (tipo INTERNO) sem clienteId', () => {
      const ctx = createMockContext({
        id: 1,
        email: 'admin@linos.com',
        nome: 'Admin',
        clienteId: null,
        papel: {
          id: 1,
          nome: 'Admin Sistema',
          codigo: 'ADMIN_SISTEMA',
          tipo: TIPO_INTERNO,
          nivel: 100,
          permissoes: {},
        },
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('deve permitir GERENTE_COMERCIAL (tipo INTERNO)', () => {
      const ctx = createMockContext({
        id: 2,
        email: 'gerente@linos.com',
        nome: 'Gerente',
        clienteId: null,
        papel: {
          id: 2,
          nome: 'Gerente Comercial',
          codigo: 'GERENTE_COMERCIAL',
          tipo: TIPO_INTERNO,
          nivel: 80,
          permissoes: {},
        },
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('não deve injetar clienteId no request para INTERNO', () => {
      const user = {
        id: 1,
        email: 'admin@linos.com',
        nome: 'Admin',
        clienteId: null,
        papel: {
          id: 1,
          nome: 'Admin Sistema',
          codigo: 'ADMIN_SISTEMA',
          tipo: TIPO_INTERNO,
          nivel: 100,
          permissoes: {},
        },
      };
      const request = { user } as any;
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      guard.canActivate(ctx);

      expect(request.clienteId).toBeUndefined();
    });
  });

  // =========================================================================
  // USUARIOS CLIENTE
  // =========================================================================

  describe('Usuários CLIENTE', () => {
    it('deve permitir CLIENTE_ADMIN com clienteId e injetar no request', () => {
      const user = {
        id: 10,
        email: 'admin@padaria.com',
        nome: 'Admin Padaria',
        clienteId: 5,
        papel: {
          id: 6,
          nome: 'Cliente Admin',
          codigo: 'CLIENTE_ADMIN',
          tipo: TIPO_CLIENTE,
          nivel: 30,
          permissoes: {},
        },
      };
      const request = { user } as any;
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(request.clienteId).toBe(5);
    });

    it('deve permitir CLIENTE_USUARIO com clienteId', () => {
      const user = {
        id: 11,
        email: 'user@padaria.com',
        nome: 'User Padaria',
        clienteId: 5,
        papel: {
          id: 7,
          nome: 'Cliente Usuário',
          codigo: 'CLIENTE_USUARIO',
          tipo: TIPO_CLIENTE,
          nivel: 20,
          permissoes: {},
        },
      };
      const ctx = createMockContext(user);

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('deve lançar ForbiddenException quando CLIENTE sem clienteId', () => {
      const user = {
        id: 12,
        email: 'orphan@test.com',
        nome: 'Sem Vínculo',
        clienteId: null,
        papel: {
          id: 6,
          nome: 'Cliente Admin',
          codigo: 'CLIENTE_ADMIN',
          tipo: TIPO_CLIENTE,
          nivel: 30,
          permissoes: {},
        },
      };
      const ctx = createMockContext(user);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow('Usuário cliente sem vínculo com empresa');
    });

    it('deve lançar ForbiddenException quando CLIENTE com clienteId = 0', () => {
      const user = {
        id: 13,
        email: 'zero@test.com',
        nome: 'ClienteId Zero',
        clienteId: 0,
        papel: {
          id: 7,
          nome: 'Cliente Usuário',
          codigo: 'CLIENTE_USUARIO',
          tipo: TIPO_CLIENTE,
          nivel: 20,
          permissoes: {},
        },
      };
      const ctx = createMockContext(user);

      // clienteId = 0 is falsy, should throw
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
