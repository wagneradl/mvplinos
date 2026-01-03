import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
