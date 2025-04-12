import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

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

export class AuthResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  usuario: {
    id: number;
    nome: string;
    email: string;
    papel: {
      id: number;
      nome: string;
      permissoes: any;
    };
  };
}
