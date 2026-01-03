import { IsEnum, IsOptional, IsString } from 'class-validator';
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
    required: false,
  })
  @IsEnum(PedidoStatus)
  @IsOptional()
  status?: PedidoStatus;

  @ApiProperty({
    description: 'Caminho do arquivo PDF no sistema de arquivos',
    example: '/uploads/pdfs/pedido-123.pdf',
    required: false,
  })
  @IsOptional()
  pdf_path?: string;

  @ApiProperty({
    description: 'URL do arquivo PDF no Supabase',
    example: 'https://storage.googleapis.com/bucket/pedido-123.pdf',
    required: false,
  })
  @IsOptional()
  pdf_url?: string;

  @ApiProperty({
    description: 'Observações sobre o pedido',
    example: 'Entregar pela porta dos fundos',
    required: false,
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
