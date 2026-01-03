import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ConfirmarResetDto {
  @ApiProperty({
    example: 'abc123def456...',
    description: 'Token de reset recebido',
  })
  @IsString({ message: 'Token deve ser uma string' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;

  @ApiProperty({
    example: 'NovaSenha@123',
    description: 'Nova senha do usuário (mínimo 8 caracteres, deve conter letras e números)',
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Nova senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'A senha deve conter pelo menos uma letra e um número',
  })
  novaSenha: string;
}

export class ConfirmarResetResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indica se a senha foi redefinida com sucesso',
  })
  sucesso: boolean;

  @ApiProperty({
    example: 'Senha redefinida com sucesso.',
    description: 'Mensagem de confirmação',
  })
  mensagem: string;
}

export class ValidarTokenResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indica se o token é válido',
  })
  valido: boolean;
}
