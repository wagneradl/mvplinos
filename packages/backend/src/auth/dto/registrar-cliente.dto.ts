import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * DTO para auto-cadastro público de cliente (empresa + responsável).
 * Valida CNPJ (14 dígitos), emails, senha mínima e campos obrigatórios.
 */
export class RegistrarClienteDto {
  // ── Dados da empresa ──────────────────────────────────────────────────

  @ApiProperty({ description: 'Razão social da empresa', example: 'Padaria Sabor Real Ltda' })
  @IsNotEmpty({ message: 'Razão social é obrigatória' })
  @IsString({ message: 'Razão social deve ser uma string' })
  razao_social: string;

  @ApiPropertyOptional({ description: 'Nome fantasia (opcional, usa razão social se omitido)', example: 'Padaria Sabor Real' })
  @IsOptional()
  @IsString({ message: 'Nome fantasia deve ser uma string' })
  nome_fantasia?: string;

  @ApiProperty({ description: 'CNPJ da empresa (14 dígitos, com ou sem máscara)', example: '12.345.678/0001-90' })
  @IsNotEmpty({ message: 'CNPJ é obrigatório' })
  @IsString({ message: 'CNPJ deve ser uma string' })
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, {
    message: 'CNPJ deve ter formato válido (14 dígitos, com ou sem máscara)',
  })
  cnpj: string;

  @ApiProperty({ description: 'Email de contato da empresa', example: 'contato@padariasaborreal.com.br' })
  @IsEmail({}, { message: 'Email da empresa deve ser um email válido' })
  @IsNotEmpty({ message: 'Email da empresa é obrigatório' })
  email_empresa: string;

  @ApiPropertyOptional({ description: 'Telefone de contato (opcional)', example: '(11) 98765-4321' })
  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  telefone?: string;

  // ── Dados do responsável (será CLIENTE_ADMIN) ─────────────────────────

  @ApiProperty({ description: 'Nome completo do responsável', example: 'Maria Oliveira' })
  @IsNotEmpty({ message: 'Nome do responsável é obrigatório' })
  @IsString({ message: 'Nome do responsável deve ser uma string' })
  nome_responsavel: string;

  @ApiProperty({ description: 'Email do responsável (login)', example: 'maria@padariasaborreal.com.br' })
  @IsEmail({}, { message: 'Email do responsável deve ser um email válido' })
  @IsNotEmpty({ message: 'Email do responsável é obrigatório' })
  email_responsavel: string;

  @ApiProperty({ description: 'Senha do responsável (mínimo 8 caracteres)', example: 'Senha@123' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  senha: string;
}
