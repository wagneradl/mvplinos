import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'linos-secret-key',
    });
  }

  async validate(payload: any) {
    // Recupera o papel completo do payload, se possível
    let papel: any = payload.papel;
    let permissoes: any = payload.permissoes;
    // Se o papel veio como string, reconstrói o objeto
    if (typeof papel === 'string') {
      papel = {
        nome: papel,
        permissoes: permissoes,
      };
    }
    return {
      id: payload.sub,
      email: payload.email,
      nome: payload.nome,
      papel: papel,
    };
  }
}
