import { IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class ReportPedidoDto {
  @ApiProperty({ description: 'Data inicial do período (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'A data inicial é obrigatória' })
  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: 'Data deve estar no formato YYYY-MM-DD' })
  @Transform(({ value }) => value ? String(value).substring(0, 10) : value)
  data_inicio: string;

  @ApiProperty({ description: 'Data final do período (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'A data final é obrigatória' })
  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: 'Data deve estar no formato YYYY-MM-DD' })
  @Transform(({ value }) => value ? String(value).substring(0, 10) : value)
  data_fim: string;

  @ApiPropertyOptional({ description: 'ID do cliente' })
  @IsOptional()
  @Type(() => Number)
  cliente_id?: number;
}
