import { exec } from 'child_process';
import { promisify } from 'util';
import { PathUtils } from './paths';

const execAsync = promisify(exec);

/**
 * Utilitário para execução de scripts compatível com Windows e Linux
 */
export class ScriptUtils {
  /**
   * Executa um comando de forma apropriada para o SO
   */
  static async execute(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      if (PathUtils.isWindows()) {
        // No Windows, usa PowerShell
        return await execAsync(`powershell -Command "${command}"`);
      } else {
        // No Linux, executa diretamente
        return await execAsync(command);
      }
    } catch (error) {
      console.error(`Erro executando comando: ${command}`, error);
      throw error;
    }
  }

  /**
   * Verifica se um diretório existe
   */
  static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      if (PathUtils.isWindows()) {
        const { stdout } = await this.execute(`Test-Path -Path "${dirPath}" -PathType Container`);
        return stdout.trim() === 'True';
      } else {
        const { stdout } = await this.execute(
          `test -d "${dirPath}" && echo "true" || echo "false"`,
        );
        return stdout.trim() === 'true';
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove arquivos mais antigos que X dias
   */
  static async removeOldFiles(
    directory: string,
    pattern: string,
    olderThanDays: number,
  ): Promise<void> {
    const normalizedPath = PathUtils.normalize(directory);

    if (PathUtils.isWindows()) {
      await this.execute(`
        Get-ChildItem "${normalizedPath}" -Filter "${pattern}" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-${olderThanDays}) } |
        Remove-Item -Force
      `);
    } else {
      await this.execute(
        `find "${normalizedPath}" -name "${pattern}" -mtime +${olderThanDays} -delete`,
      );
    }
  }

  /**
   * Cria um diretório se não existir
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    const normalizedPath = PathUtils.normalize(dirPath);

    if (PathUtils.isWindows()) {
      await this.execute(`
        if (-not (Test-Path -Path "${normalizedPath}" -PathType Container)) {
          New-Item -Path "${normalizedPath}" -ItemType Directory -Force
        }
      `);
    } else {
      await this.execute(`mkdir -p "${normalizedPath}"`);
    }
  }
}
