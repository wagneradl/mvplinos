import { IsNumber, IsArray, ValidateNested, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemPedidoDto {
  @ApiProperty({
    description: 'ID do produto',
    example: 1
  })
  @IsNumber()
  @IsNotEmpty()
  produto_id: number;

  @ApiProperty({
    description: 'Quantidade do produto',
    example: 5
  })
  @IsNumber()
  @IsNotEmpty()
  quantidade: number;
}

export class CreatePedidoDto {
  @ApiProperty({
    description: 'ID do cliente',
    example: 1
  })
  @IsNumber()
  @IsNotEmpty()
  cliente_id: number;

  @ApiProperty({
    description: 'Lista de itens do pedido',
    type: [CreateItemPedidoDto],
    example: [{
      produto_id: 1,
      quantidade: 5
    }]
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateItemPedidoDto)
  itens: CreateItemPedidoDto[];
}
