import { IsEnum, IsOptional } from 'class-validator';

export enum PedidoStatus {
  PENDENTE = 'PENDENTE',
  ATUALIZADO = 'ATUALIZADO',
  CANCELADO = 'CANCELADO',
}

export class UpdatePedidoDto {
  @IsEnum(PedidoStatus)
  @IsOptional()
  status?: PedidoStatus;
}
