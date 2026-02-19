import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@linos.com.br' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  senha: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token recebido no login' })
  @IsString({ message: 'Token é obrigatório' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  refresh_token: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token a ser revogado' })
  @IsString({ message: 'Token é obrigatório' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  refresh_token: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token (curta duração)' })
  access_token: string;

  @ApiProperty({ description: 'Opaque refresh token (longa duração)' })
  refresh_token: string;

  @ApiProperty({ description: 'Tempo de expiração do access_token em segundos', example: 900 })
  expires_in: number;

  @ApiProperty()
  usuario: {
    id: number;
    nome: string;
    email: string;
    papel: {
      id: number;
      nome: string;
      codigo: string;
      tipo: string;
      nivel: number;
      permissoes: any;
    };
  };
}
