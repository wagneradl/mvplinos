import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SolicitarResetDto {
  @ApiProperty({
    example: 'usuario@empresa.com',
    description: 'E-mail do usuário que deseja redefinir a senha',
  })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;
}

export class SolicitarResetResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indica que a solicitação foi processada (não revela se o usuário existe)',
  })
  sucesso: boolean;

  @ApiProperty({
    example: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.',
    description: 'Mensagem neutra que não revela informações sobre a existência do usuário',
  })
  mensagem: string;
}
