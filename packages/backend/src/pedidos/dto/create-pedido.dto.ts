import { IsNumber, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemPedidoDto {
  @IsNumber()
  @IsNotEmpty()
  produto_id: number;

  @IsNumber()
  @IsNotEmpty()
  quantidade: number;
}

export class CreatePedidoDto {
  @IsNumber()
  @IsNotEmpty()
  cliente_id: number;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateItemPedidoDto)
  itens: CreateItemPedidoDto[];
}
