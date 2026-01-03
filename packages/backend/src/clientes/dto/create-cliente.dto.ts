import { IsString, IsNotEmpty, IsEmail, IsIn, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClienteDto {
  @ApiProperty({ description: 'CNPJ do cliente', example: '12.345.678/0001-90' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ inválido. Use o formato: XX.XXX.XXX/XXXX-XX',
  })
  cnpj: string;

  @ApiProperty({ description: 'Razão social do cliente' })
  @IsString()
  @IsNotEmpty()
  razao_social: string;

  @ApiProperty({ description: 'Nome fantasia do cliente' })
  @IsString()
  @IsNotEmpty()
  nome_fantasia: string;

  @ApiProperty({ description: 'Telefone do cliente', example: '(11) 98765-4321' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone inválido. Use o formato: (XX) XXXXX-XXXX',
  })
  telefone: string;

  @ApiProperty({ description: 'Email do cliente' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Status do cliente', enum: ['ativo', 'inativo'] })
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status: string;
}
