import { ApiProperty } from '@nestjs/swagger';

export class SupabaseUploadResultDto {
  @ApiProperty({
    description: 'Caminho do arquivo no bucket do Supabase',
    example: 'pedidos/pedido-123-1744728900.pdf',
  })
  path: string;

  @ApiProperty({
    description: 'URL pública do arquivo para acesso direto',
    example:
      'https://vuxmjtpfbcpvncmabnhe.supabase.co/storage/v1/object/public/pedidos-pdfs/pedidos/pedido-123-1744728900.pdf',
  })
  url: string;
}

export class PdfInfoResponseDto {
  @ApiProperty({
    description: 'Indica se o pedido tem uma URL do Supabase disponível',
    example: true,
  })
  hasUrl: boolean;

  @ApiProperty({
    description: 'URL do PDF no Supabase (se disponível)',
    example:
      'https://vuxmjtpfbcpvncmabnhe.supabase.co/storage/v1/object/public/pedidos-pdfs/pedidos/pedido-123-1744728900.pdf',
    required: false,
  })
  pdfUrl?: string;

  @ApiProperty({
    description: 'Caminho local do arquivo PDF (fallback)',
    example: 'uploads/pdfs/pedido-123-1744728900.pdf',
    required: false,
  })
  pdfPath?: string;
}
