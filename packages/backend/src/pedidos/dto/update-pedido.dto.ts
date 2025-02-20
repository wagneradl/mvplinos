import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PedidoStatus {
  PENDENTE = 'PENDENTE',
  ATUALIZADO = 'ATUALIZADO',
  CANCELADO = 'CANCELADO',
}

export class UpdatePedidoDto {
  @ApiProperty({
    description: 'Status do pedido',
    enum: PedidoStatus,
    example: PedidoStatus.ATUALIZADO,
    required: false
  })
  @IsEnum(PedidoStatus)
  @IsOptional()
  status?: PedidoStatus;
}
