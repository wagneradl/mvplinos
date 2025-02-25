import { PartialType } from '@nestjs/swagger';
import { CreateProdutoDto } from './create-produto.dto';
import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProdutoDto extends PartialType(CreateProdutoDto) {
  @ApiProperty({ description: 'Data de exclusão (soft delete)', required: false })
  @IsOptional()
  deleted_at?: Date | null;
}
