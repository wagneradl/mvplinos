import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterPedidoDto {
  @ApiPropertyOptional({ description: 'Data inicial do período (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final do período (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato YYYY-MM-DD' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'ID do cliente' })
  @IsOptional()
  @Type(() => Number)
  clienteId?: number;

  @ApiPropertyOptional({ description: 'Página atual (para paginação)' })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Quantidade de itens por página' })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
