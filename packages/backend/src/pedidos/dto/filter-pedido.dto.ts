import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { PedidoStatus } from './update-pedido.dto';

export class FilterPedidoDto {
  @ApiPropertyOptional({ description: 'Data inicial do período (YYYY-MM-DD)' })
  @IsOptional()
  @Transform(({ value }) => value ? String(value).substring(0, 10) : value)
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final do período (YYYY-MM-DD)' })
  @IsOptional()
  @Transform(({ value }) => value ? String(value).substring(0, 10) : value)
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

  @ApiPropertyOptional({ description: 'Status do pedido', enum: PedidoStatus })
  @IsOptional()
  @Transform(({ value }) => value || undefined) // Permite string vazia
  status?: PedidoStatus;
}
