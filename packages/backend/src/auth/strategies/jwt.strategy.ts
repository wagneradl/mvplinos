import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não está definido. Configure a variável de ambiente JWT_SECRET.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // Recupera o papel completo do payload
    let papel: any = payload.papel;
    const permissoes: any = payload.permissoes;

    // Se o papel veio como string (compatibilidade com tokens antigos), reconstrói o objeto
    if (typeof papel === 'string') {
      papel = {
        nome: papel,
        codigo: papel === 'Administrador' ? 'ADMIN_SISTEMA' : 'OPERADOR_PEDIDOS',
        tipo: 'INTERNO',
        nivel: papel === 'Administrador' ? 100 : 50,
        permissoes: permissoes,
      };
    } else if (papel && typeof papel === 'object') {
      // Se papel é objeto, adiciona as permissões
      papel = {
        ...papel,
        permissoes: permissoes,
      };
    }

    return {
      id: payload.sub,
      email: payload.email,
      nome: payload.nome,
      clienteId: payload.clienteId || null,
      papel: papel,
    };
  }
}
