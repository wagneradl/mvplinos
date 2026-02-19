import 'reflect-metadata';
import { AuthController } from './auth.controller';

// Constantes internas do @nestjs/throttler (não re-exportadas no index público)
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_SKIP = 'THROTTLER:SKIP';

function hasThrottleGroup(target: Function, group: string): boolean {
  const keys = Reflect.getMetadataKeys(target);
  return keys.includes(THROTTLER_LIMIT + group);
}

function hasSkipThrottle(target: Function | object): boolean {
  const keys = Reflect.getMetadataKeys(target);
  return keys.includes(THROTTLER_SKIP + 'default');
}

describe('AuthController — Throttle decorators', () => {
  describe('login', () => {
    it('deve ter throttle configurado para o grupo "login"', () => {
      expect(hasThrottleGroup(AuthController.prototype.login, 'login')).toBe(true);
    });

    it('não deve ter @SkipThrottle', () => {
      expect(hasSkipThrottle(AuthController.prototype.login)).toBe(false);
    });
  });

  describe('me', () => {
    it('deve ter @SkipThrottle ativo', () => {
      expect(hasSkipThrottle(AuthController.prototype.me)).toBe(true);
    });
  });

  describe('solicitarReset', () => {
    it('deve ter throttle configurado para o grupo "reset" (mais restritivo)', () => {
      expect(hasThrottleGroup(AuthController.prototype.solicitarReset, 'reset')).toBe(true);
    });

    it('não deve ter throttle no grupo "login"', () => {
      expect(hasThrottleGroup(AuthController.prototype.solicitarReset, 'login')).toBe(false);
    });
  });

  describe('validarToken', () => {
    it('deve ter throttle configurado para o grupo "login"', () => {
      expect(hasThrottleGroup(AuthController.prototype.validarToken, 'login')).toBe(true);
    });
  });

  describe('confirmarReset', () => {
    it('deve ter throttle configurado para o grupo "login"', () => {
      expect(hasThrottleGroup(AuthController.prototype.confirmarReset, 'login')).toBe(true);
    });
  });
});

describe('Controllers não-auth — @SkipThrottle', () => {
  it.each([
    ['HealthController', '../health/health.controller', 'HealthController'],
    ['ClientesController', '../clientes/clientes.controller', 'ClientesController'],
    ['ProdutosController', '../produtos/produtos.controller', 'ProdutosController'],
    ['PedidosController', '../pedidos/pedidos.controller', 'PedidosController'],
    ['UsuariosController', '../usuarios/usuarios.controller', 'UsuariosController'],
    ['AdminController', '../admin/admin.controller', 'AdminController'],
  ])('%s deve ter @SkipThrottle no nível da classe', (_name, path, className) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path);
    const ControllerClass = mod[className];
    expect(hasSkipThrottle(ControllerClass)).toBe(true);
  });
});
