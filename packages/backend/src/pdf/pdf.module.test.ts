import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  providers: [PdfService, PrismaService, SupabaseService],
  exports: [PdfService],
})
export class PdfTestModule {}
