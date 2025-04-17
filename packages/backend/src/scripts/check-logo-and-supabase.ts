import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SupabaseService } from '../supabase/supabase.service';
import { Logger } from '@nestjs/common';

async function main() {
  const logger = new Logger('CheckLogoAndSupabase');
  const uploadsPath = process.env.UPLOADS_PATH || join(process.cwd(), 'uploads');
  const logoPath = join(uploadsPath, 'static', 'logo.png');
  logger.log(`Verificando logo em: ${logoPath}`);

  // 1. Checar existência e leitura da logo
  if (!existsSync(logoPath)) {
    logger.error('Logo NÃO encontrada!');
    process.exit(2);
  }
  try {
    const logoBuffer = readFileSync(logoPath);
    logger.log('Logo encontrada e lida com sucesso. Tamanho:', logoBuffer.length);
    logger.log('Logo base64 start:', logoBuffer.toString('base64').substring(0, 50));
  } catch (e) {
    logger.error('Erro ao ler logo:', e instanceof Error ? e.message : e);
    process.exit(3);
  }

  // 2. Teste Supabase
  logger.log('Testando upload e download no Supabase...');
  let supabaseService: SupabaseService;
  let supabaseError: any = null;
  try {
    supabaseService = new SupabaseService();
  } catch (e) {
    supabaseError = e;
    logger.error('Erro ao inicializar SupabaseService:', e instanceof Error ? e.stack || e.message : JSON.stringify(e));
  }
  if (!supabaseService) {
    logger.error('Supabase NÃO está configurado corretamente!');
    if (supabaseError) {
      logger.error('Erro detalhado Supabase (init):', supabaseError instanceof Error ? supabaseError.stack || supabaseError.message : JSON.stringify(supabaseError));
    }
    logger.error('Variáveis atuais:', {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
    });
    // Não faz process.exit aqui, continua para tentar upload/download
  }
  const testFilePath = 'test-health-check.txt';
  const testContent = Buffer.from('Health check: ' + new Date().toISOString());
  try {
    const url = await supabaseService.uploadFile(testFilePath, testContent, 'text/plain');
    logger.log('Arquivo de teste enviado para Supabase:', url);
    const downloadResp = await supabaseService.downloadFile(testFilePath);
    if (downloadResp?.data) {
      logger.log('Arquivo de teste baixado do Supabase com sucesso.');
    } else {
      logger.error('Falha ao baixar arquivo de teste do Supabase!');
      if (downloadResp?.error) {
        logger.error('Erro detalhado Supabase (download):', JSON.stringify(downloadResp.error));
      }
      process.exit(5);
    }
  } catch (e) {
    logger.error('Erro ao testar upload/download no Supabase:', e instanceof Error ? e.stack || e.message : JSON.stringify(e));
    process.exit(6);
  }
  logger.log('Health check concluído com sucesso!');
  process.exit(0);
}

main();
