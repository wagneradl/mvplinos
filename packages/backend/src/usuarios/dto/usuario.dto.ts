import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @ApiProperty({ example: 'joao@exemplo.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  senha: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Papel é obrigatório' })
  papel_id: number;
}

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}

export class UsuarioResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'João Silva' })
  nome: string;

  @ApiProperty({ example: 'joao@exemplo.com' })
  email: string;

  @ApiProperty({ example: 'ativo' })
  status: string;

  @ApiProperty({ 
    example: {
      id: 1,
      nome: 'Administrador',
      permissoes: {
        clientes: ['read', 'write', 'delete'],
        produtos: ['read', 'write', 'delete']
      }
    }
  })
  papel: {
    id: number;
    nome: string;
    permissoes: any;
  };

  @ApiProperty({ example: '2023-04-12T10:30:00Z' })
  created_at: Date;

  @ApiProperty({ example: '2023-04-12T10:30:00Z' })
  updated_at: Date;
}
