const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configurações
const CONFIG = {
  dbPath: path.join(__dirname, '../../prisma/dev.db'),
  backupDir: path.join(__dirname, '../../backups'),
};

/**
 * Executa verificações detalhadas no banco SQLite
 */
async function runDatabaseChecks(dbPath) {
  const checks = {
    integrity: false,
    foreignKeys: false,
    indexes: false,
    tables: [],
    size: 0,
    lastModified: null
  };

  try {
    // Verifica se o arquivo existe
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Banco de dados não encontrado: ${dbPath}`);
    }

    // Obtém informações básicas do arquivo
    const stats = fs.statSync(dbPath);
    checks.size = stats.size;
    checks.lastModified = stats.mtime;

    // Executa verificações SQLite
    const runSqliteCommand = (command) => {
      return new Promise((resolve, reject) => {
        exec(`sqlite3 "${dbPath}" "${command}"`, (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout.trim());
        });
      });
    };

    // Verificação de integridade
    checks.integrity = await runSqliteCommand('PRAGMA integrity_check;') === 'ok';

    // Verificação de chaves estrangeiras
    checks.foreignKeys = await runSqliteCommand('PRAGMA foreign_key_check;') === '';

    // Verifica índices
    const indexCheck = await runSqliteCommand('SELECT count(*) FROM sqlite_master WHERE type="index";');
    checks.indexes = parseInt(indexCheck) > 0;

    // Lista tabelas e conta registros
    const tables = await runSqliteCommand('SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%";');
    for (const table of tables.split('\n').filter(Boolean)) {
      const count = await runSqliteCommand(`SELECT count(*) FROM ${table};`);
      checks.tables.push({
        name: table,
        recordCount: parseInt(count)
      });
    }

    return {
      success: true,
      checks,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro durante a verificação:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verifica a integridade de todos os backups
 */
async function verifyAllBackups() {
  try {
    const results = {
      mainDatabase: null,
      backups: []
    };

    // Verifica banco principal
    console.log('Verificando banco de dados principal...');
    results.mainDatabase = await runDatabaseChecks(CONFIG.dbPath);

    // Verifica backups
    const backups = fs.readdirSync(CONFIG.backupDir)
      .filter(file => file.startsWith('backup_'))
      .sort((a, b) => {
        const timeA = fs.statSync(path.join(CONFIG.backupDir, a)).mtime;
        const timeB = fs.statSync(path.join(CONFIG.backupDir, b)).mtime;
        return timeB.getTime() - timeA.getTime();
      });

    for (const backup of backups) {
      console.log(`Verificando backup: ${backup}`);
      const backupPath = path.join(CONFIG.backupDir, backup);
      const verificationResult = await runDatabaseChecks(backupPath);
      results.backups.push({
        file: backup,
        ...verificationResult
      });
    }

    return results;
  } catch (error) {
    console.error('Erro durante verificação dos backups:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Se chamado diretamente, executa verificação completa
if (require.main === module) {
  verifyAllBackups().then(results => {
    console.log(JSON.stringify(results, null, 2));
  });
}

module.exports = {
  runDatabaseChecks,
  verifyAllBackups
};