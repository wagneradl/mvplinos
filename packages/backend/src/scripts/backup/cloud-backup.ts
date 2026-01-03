import { join } from 'path';
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Script para realizar backup do banco SQLite em ambiente de nuvem
 * Este script é projetado para ser executado periodicamente via CRON no Render
 */
async function backupDatabase() {
  try {
    console.log('Iniciando backup do banco de dados...');

    // Determinar os diretórios usando variáveis de ambiente
    const databasePath =
      process.env.DATABASE_URL?.replace('file:', '') || '/var/data/linos-panificadora.db';
    const backupDir = join('/var/data', 'backups');

    // Garantir que o diretório de backup existe
    await mkdir(backupDir, { recursive: true });

    // Verificar se o banco existe
    if (!existsSync(databasePath)) {
      throw new Error(`Banco de dados não encontrado em: ${databasePath}`);
    }

    // Criar nome do arquivo de backup com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.db`;
    const backupPath = join(backupDir, backupFileName);

    // Realizar a cópia do arquivo
    await copyFile(databasePath, backupPath);

    console.log(`Backup concluído com sucesso: ${backupPath}`);

    // Listar todos os backups para verificar
    console.log('Backups disponíveis:');

    // Manter apenas os últimos 7 backups (implementar futuramente)
    // ...

    return {
      success: true,
      path: backupPath,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Erro ao realizar backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString(),
    };
  }
}

// Executar o backup se este arquivo for chamado diretamente
if (require.main === module) {
  backupDatabase();
}

export { backupDatabase };
