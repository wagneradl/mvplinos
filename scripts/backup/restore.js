const fs = require('fs');
const path = require('path');
const { checkDatabaseIntegrity } = require('./backup');

// Configurações
const CONFIG = {
  dbPath: path.join(__dirname, '../../prisma/dev.db'),
  backupDir: path.join(__dirname, '../../backups'),
  pdfDir: path.join(__dirname, '../../uploads/pdfs'),
};

/**
 * Lista todos os backups disponíveis
 */
function listBackups() {
  return fs.readdirSync(CONFIG.backupDir)
    .filter(file => file.startsWith('backup_'))
    .map(file => ({
      name: file,
      path: path.join(CONFIG.backupDir, file),
      time: fs.statSync(path.join(CONFIG.backupDir, file)).mtime
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());
}

/**
 * Restaura um backup específico
 */
async function restoreBackup(backupFileName) {
  try {
    const backupPath = path.join(CONFIG.backupDir, backupFileName);
    
    // Verifica se o backup existe
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup não encontrado: ${backupFileName}`);
    }

    // Verifica integridade do backup
    const isBackupIntegrityOk = await checkDatabaseIntegrity(backupPath);
    if (!isBackupIntegrityOk) {
      throw new Error('Verificação de integridade do backup falhou!');
    }

    // Backup do banco atual antes da restauração
    const currentBackupPath = path.join(
      CONFIG.backupDir,
      `pre_restore_${new Date().toISOString().replace(/[:.]/g, '_')}.db`
    );
    fs.copyFileSync(CONFIG.dbPath, currentBackupPath);

    // Restaura o banco
    fs.copyFileSync(backupPath, CONFIG.dbPath);

    // Restaura PDFs se existirem
    const pdfBackupDir = path.join(CONFIG.backupDir, 'pdfs', backupFileName.replace('.db', ''));
    if (fs.existsSync(pdfBackupDir)) {
      // Limpa diretório de PDFs atual
      if (fs.existsSync(CONFIG.pdfDir)) {
        fs.rmSync(CONFIG.pdfDir, { recursive: true, force: true });
      }
      fs.mkdirSync(CONFIG.pdfDir, { recursive: true });

      // Copia PDFs do backup
      const pdfs = fs.readdirSync(pdfBackupDir);
      pdfs.forEach(pdf => {
        fs.copyFileSync(
          path.join(pdfBackupDir, pdf),
          path.join(CONFIG.pdfDir, pdf)
        );
      });
    }

    // Verifica integridade após restauração
    const isRestoredDbIntegrityOk = await checkDatabaseIntegrity(CONFIG.dbPath);
    if (!isRestoredDbIntegrityOk) {
      // Se falhar, tenta restaurar o backup pré-restauração
      fs.copyFileSync(currentBackupPath, CONFIG.dbPath);
      throw new Error('Verificação de integridade após restauração falhou!');
    }

    console.log(`Backup restaurado com sucesso: ${backupFileName}`);
    return {
      success: true,
      restoredFile: backupFileName,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro durante a restauração:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Se chamado diretamente, lista backups disponíveis
if (require.main === module) {
  const backups = listBackups();
  console.log('Backups disponíveis:');
  backups.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup.name} (${backup.time.toLocaleString()})`);
  });
}

module.exports = {
  listBackups,
  restoreBackup
};