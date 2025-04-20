import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    console.log('==== LOGIN DEBUG ====');
    console.log('Email recebido:', loginDto.email);
    console.log('Senha recebida:', JSON.stringify(loginDto.senha));
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: loginDto.email },
      include: {
        papel: true,
      },
    });

    if (!usuario || usuario.status !== 'ativo') {
      console.log('Usuário não encontrado ou status diferente de ATIVO:', usuario);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    console.log('Hash salvo no banco:', usuario.senha);
    const senhaValida = await bcrypt.compare(loginDto.senha, usuario.senha);
    console.log('Resultado bcrypt.compare:', senhaValida);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Parse permissões do formato JSON
    const permissoes = JSON.parse(usuario.papel.permissoes);

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      papel: usuario.papel.nome,
      permissoes,
    };

    return {
      token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: {
          id: usuario.papel.id,
          nome: usuario.papel.nome,
          permissoes,
        },
      },
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (e) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
