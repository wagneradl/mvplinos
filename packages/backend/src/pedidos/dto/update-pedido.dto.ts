import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PedidoStatus {
  ATIVO = 'ATIVO',
  CANCELADO = 'CANCELADO',
  PENDENTE = 'PENDENTE',
  ATUALIZADO = 'ATUALIZADO',
}

export class UpdatePedidoDto {
  @ApiProperty({
    description: 'Status do pedido',
    enum: PedidoStatus,
    example: PedidoStatus.ATIVO,
    required: false
  })
  @IsEnum(PedidoStatus)
  @IsOptional()
  status?: PedidoStatus;
}
