const fs = require('fs');
const { PathUtils, ScriptUtils } = require('@linos/shared');

// Configurações
const CONFIG = {
  dbPath: PathUtils.getDatabasePath('dev.db'),
  backupDir: PathUtils.getBackupPath(''),
  maxBackups: 7,
  pdfDir: PathUtils.getPdfPath(''),
};

/**
 * Cria o nome do arquivo de backup com timestamp
 */
function getBackupFileName() {
  const now = new Date();
  return `backup_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.db`;
}

/**
 * Remove backups antigos mantendo apenas os últimos N backups
 */
async function removeOldBackups() {
  await ScriptUtils.removeOldFiles(CONFIG.backupDir, 'backup_*.db', CONFIG.maxBackups);
}

/**
 * Verifica a integridade do banco SQLite
 */
async function checkDatabaseIntegrity(dbPath) {
  try {
    const { stdout } = await ScriptUtils.execute(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);
    return stdout.trim() === 'ok';
  } catch (error) {
    console.error('Erro verificando integridade:', error);
    return false;
  }
}

/**
 * Realiza o backup do banco de dados
 */
async function performBackup() {
  try {
    // Garante que o diretório de backup existe
    await ScriptUtils.ensureDirectory(CONFIG.backupDir);

    // Verifica integridade antes do backup
    const isIntegrityOk = await checkDatabaseIntegrity(CONFIG.dbPath);
    if (!isIntegrityOk) {
      throw new Error('Verificação de integridade do banco falhou!');
    }

    // Cria nome do arquivo de backup
    const backupFileName = getBackupFileName();
    const backupPath = PathUtils.getBackupPath(backupFileName);

    // Copia o arquivo do banco
    fs.copyFileSync(CONFIG.dbPath, backupPath);

    // Backup dos PDFs
    if (await ScriptUtils.directoryExists(CONFIG.pdfDir)) {
      const pdfBackupDir = PathUtils.getBackupPath(`pdfs/${backupFileName.replace('.db', '')}`);
      await ScriptUtils.ensureDirectory(pdfBackupDir);
      
      // Copia todos os PDFs
      const pdfs = fs.readdirSync(CONFIG.pdfDir);
      pdfs.forEach(pdf => {
        fs.copyFileSync(
          PathUtils.getPdfPath(pdf),
          PathUtils.normalize(`${pdfBackupDir}/${pdf}`)
        );
      });
    }

    // Remove backups antigos
    await removeOldBackups();

    // Verifica integridade do backup
    const isBackupIntegrityOk = await checkDatabaseIntegrity(backupPath);
    if (!isBackupIntegrityOk) {
      throw new Error('Verificação de integridade do backup falhou!');
    }

    console.log(`Backup realizado com sucesso: ${backupFileName}`);
    return {
      success: true,
      backupPath,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro durante o backup:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Executa o backup se chamado diretamente
if (require.main === module) {
  performBackup();
}

module.exports = {
  performBackup,
  checkDatabaseIntegrity
};