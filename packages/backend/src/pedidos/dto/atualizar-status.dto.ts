import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PedidoStatus } from './update-pedido.dto';

export class AtualizarStatusDto {
  @ApiProperty({
    description: 'Novo status do pedido',
    enum: PedidoStatus,
    example: PedidoStatus.CONFIRMADO,
  })
  @IsEnum(PedidoStatus)
  @IsNotEmpty()
  status: PedidoStatus;
}
