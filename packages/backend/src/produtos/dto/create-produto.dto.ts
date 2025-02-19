import { IsString, IsNumber, IsNotEmpty, Min, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProdutoDto {
  @ApiProperty({ description: 'Nome do produto' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ description: 'Preço unitário do produto' })
  @IsNumber()
  @Min(0)
  preco_unitario: number;

  @ApiProperty({ description: 'Tipo de medida do produto (kg, un, etc)' })
  @IsString()
  @IsNotEmpty()
  tipo_medida: string;

  @ApiProperty({ description: 'Status do produto', enum: ['ativo', 'inativo'] })
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status: string;
}