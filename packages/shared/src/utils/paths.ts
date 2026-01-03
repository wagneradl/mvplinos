import * as path from 'path';
import * as os from 'os';

/**
 * Utilitário para lidar com caminhos de forma segura entre Windows e Linux
 */
export class PathUtils {
  /**
   * Determina se estamos rodando em ambiente Windows
   */
  static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  /**
   * Retorna o diretório raiz do projeto
   */
  static getProjectRoot(): string {
    // No CI (Linux), usa PWD
    if (process.env.CI) {
      return process.env.PWD || process.cwd();
    }
    // Em desenvolvimento, usa cwd
    return process.cwd();
  }

  /**
   * Cria um caminho seguro relativo à raiz do projeto
   */
  static fromRoot(...paths: string[]): string {
    return path.join(this.getProjectRoot(), ...paths);
  }

  /**
   * Cria um caminho seguro para arquivos de banco de dados
   */
  static getDatabasePath(filename: string): string {
    return this.fromRoot('prisma', filename);
  }

  /**
   * Cria um caminho seguro para arquivos de backup
   */
  static getBackupPath(filename: string): string {
    return this.fromRoot('backups', filename);
  }

  /**
   * Cria um caminho seguro para arquivos PDF
   */
  static getPdfPath(filename: string): string {
    return this.fromRoot('uploads', 'pdfs', filename);
  }

  /**
   * Converte um caminho para formato apropriado do SO
   */
  static normalize(filepath: string): string {
    return path.normalize(filepath);
  }
}
