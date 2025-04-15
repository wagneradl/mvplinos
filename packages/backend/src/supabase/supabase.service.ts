import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseUploadResultDto } from './dto/supabase-upload.dto';

// Interface para os erros de storage do Supabase
interface SupabaseServiceError extends Error {
  code?: string;
  originalError?: any;
}

/**
 * Serviço para integração com Supabase Storage
 * 
 * Responsável por gerenciar o upload de arquivos para o Supabase Storage
 * e fornecer URLs públicas para acesso aos arquivos.
 */
@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);
  private readonly bucketName: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;
    const bucketName = process.env.SUPABASE_BUCKET || 'pedidos-pdfs';

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        'Supabase URL or API key is missing. Configure environment variables SUPABASE_URL and SUPABASE_API_KEY',
      );
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log(`Supabase client initialized for URL: ${supabaseUrl}`);
      
      // Tentar criar o bucket se ele não existir, usando políticas públicas
      this.initializeBucket(bucketName).catch(error => {
        this.logger.warn(`Failed to initialize bucket: ${error.message}`);
      });
    }

    this.bucketName = bucketName;
    this.logger.log(`Using bucket: ${this.bucketName}`);
  }

  /**
   * Inicializa o bucket no Supabase Storage, tornando-o público
   * @param bucketName Nome do bucket para inicializar
   * @private
   */
  private async initializeBucket(bucketName: string): Promise<void> {
    try {
      // Verificar se o bucket existe
      const { data: buckets } = await this.supabase.storage.listBuckets();
      
      if (!buckets || !buckets.find((b) => b.name === bucketName)) {
        this.logger.log(`Bucket ${bucketName} not found, attempting to create it...`);
        
        // Criar o bucket com opções de acesso público
        const { error } = await this.supabase.storage.createBucket(bucketName, {
          public: true // Tornar o bucket público
        });
        
        if (error) {
          throw error;
        }
        
        this.logger.log(`Bucket ${bucketName} created successfully`);
      } else {
        this.logger.log(`Bucket ${bucketName} already exists`);
        
        // Como não podemos alterar as políticas via API cliente, informamos ao usuário
        this.logger.warn(`Make sure the bucket ${bucketName} has public access or appropriate RLS policies`);
        this.logger.warn(`You may need to configure this in the Supabase dashboard manually`);
      }
    } catch (error: any) {
      this.logger.error(`Error initializing bucket: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      // Não lançamos o erro para evitar que o serviço falhe durante a inicialização
    }
  }

  /**
   * Upload a file to Supabase Storage
   * 
   * Faz upload de um arquivo para o bucket configurado no Supabase Storage
   * e retorna a URL pública para acesso direto ao arquivo.
   * 
   * @param filePath Path with filename to store in Supabase (e.g. 'pedidos/pedido-123.pdf')
   * @param fileData File contents as Buffer or Blob
   * @param contentType MIME type of the file
   * @returns Public URL of the uploaded file
   * @throws {InternalServerErrorException} When upload fails
   */
  async uploadFile(
    filePath: string,
    fileData: Buffer | Blob,
    contentType: string,
  ): Promise<string> {
    try {
      // Verificar se o cliente Supabase foi inicializado
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Fazer upload do arquivo para o Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileData, {
          contentType,
          upsert: true,
        });

      // Se houver erro, lançar exceção
      if (error) {
        const customError: SupabaseServiceError = new Error(
          `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Modificando para acessar a propriedade de código de forma segura
        customError.code = (error as any).code || 'UNKNOWN_ERROR';
        customError.originalError = error;
        
        this.logger.error(`Error uploading file to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`, error);

        // Modo de desenvolvimento/teste: gerar URL local temporária
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn('Using local development fallback for file URL due to Supabase error');
          
          // Extrair o nome do arquivo do caminho
          const fileName = filePath.split('/').pop() || 'unknownfile';
          
          // IMPORTANTE: Salvar o arquivo localmente no caminho correto para o Express.static
          try {
            // Importar fs para salvar o arquivo
            const fs = require('fs');
            const { promisify } = require('util');
            const { join, dirname } = require('path');
            const mkdirAsync = promisify(fs.mkdir);
            const writeFileAsync = promisify(fs.writeFile);
            
            // Se estamos no fallback, vamos garantir que o arquivo seja salvo localmente
            // Precisamos salvar o arquivo em um local compatível com o Express.static
            const cwd = process.cwd();
            const uploadsPath = join(cwd, process.env.UPLOADS_PATH || 'uploads');
            const localFilePath = join(uploadsPath, 'pdfs', fileName);
            
            // Garantir que o diretório existe
            const dirPath = dirname(localFilePath);
            await mkdirAsync(dirPath, { recursive: true });
            
            // Converter para Buffer se for Blob
            let dataToWrite: Buffer;
            if (Buffer.isBuffer(fileData)) {
              dataToWrite = fileData;
            } else if (typeof fileData === 'object' && fileData !== null) {
              // Blob ou outro objeto
              const arrayBuffer = await (fileData as Blob).arrayBuffer();
              dataToWrite = Buffer.from(arrayBuffer);
            } else {
              throw new Error('Invalid file data format');
            }
            
            // Salvar o arquivo no caminho local correspondente ao esperado pelo Express
            await writeFileAsync(localFilePath, dataToWrite);
            this.logger.log(`Saved file locally for fallback at: ${localFilePath}`);
            
            // Criar uma URL local temporária (válida apenas para desenvolvimento)
            // Retornar um caminho relativo compatível com o Express.static
            const relativePath = localFilePath.replace(cwd, '').replace(/^\/+/, '');
            this.logger.log(`File saved locally at relative path: ${relativePath}`);
            
            // Criar a URL local baseada no caminho relativo
            const localUrl = `http://localhost:${process.env.PORT || 3001}/${relativePath}`;
            
            this.logger.log(`Generated local fallback URL: ${localUrl}`);
            return localUrl;
          } catch (saveError) {
            this.logger.error(`Failed to save local fallback file: ${(saveError as Error).message}`);
            // Continuamos mesmo se falhar a criação do arquivo local, apenas retornando a URL
            const localUrl = `http://localhost:${process.env.PORT || 3001}/uploads/pdfs/${fileName}`;
            return localUrl;
          }
        }
        
        throw customError;
      }

      // Obter a URL pública do arquivo
      const { data: publicUrl } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      if (!publicUrl || !publicUrl.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      this.logger.log(`File uploaded successfully to Supabase Storage: ${publicUrl.publicUrl}`);
      return publicUrl.publicUrl;
    } catch (error) {
      // Se for um erro que já tratamos, repassar
      if (error instanceof Error && (error as SupabaseServiceError).code) {
        throw error;
      }

      // Erro não esperado
      this.logger.error(
        `Storage service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );

      // Modo de desenvolvimento/teste: gerar URL local temporária
      if (process.env.NODE_ENV !== 'production' && filePath) {
        this.logger.warn('Using local development fallback for file URL due to unexpected error');
        
        // Extrair o nome do arquivo do caminho
        const fileName = filePath.split('/').pop() || 'unknownfile';
        
        // Criar uma URL local temporária (válida apenas para desenvolvimento)
        const localUrl = `http://localhost:${process.env.PORT || 3001}/uploads/pdfs/${fileName}`;
        
        this.logger.log(`Generated local fallback URL: ${localUrl}`);
        return localUrl;
      }

      throw new InternalServerErrorException(
        `Failed to upload file to storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload a file to Supabase Storage and return structured result
   * 
   * Similar ao método uploadFile, mas retorna um objeto com caminho e URL
   * para melhor integração com o sistema de tipagem.
   * 
   * @param filePath Path with filename to store in Supabase (e.g. 'pedidos/pedido-123.pdf')
   * @param fileData File contents as Buffer or Blob
   * @param contentType MIME type of the file
   * @returns Object containing path and URL information
   * @throws {InternalServerErrorException} When upload fails
   */
  async uploadFileWithDetails(
    filePath: string,
    fileData: Buffer | Blob,
    contentType: string,
  ): Promise<SupabaseUploadResultDto> {
    const publicUrl = await this.uploadFile(filePath, fileData, contentType);
    
    return {
      path: filePath,
      url: publicUrl
    };
  }

  /**
   * Verifica se o serviço Supabase está disponível e configurado
   * @returns {boolean} Verdadeiro se o serviço estiver disponível
   */
  isAvailable(): boolean {
    return !!this.supabase && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_API_KEY;
  }

  /**
   * Retorna o cliente Supabase diretamente para operações avançadas
   * Este método só deve ser usado quando operações específicas não estão
   * disponíveis através dos métodos padrão do serviço
   * @returns Cliente Supabase ou null se não estiver inicializado
   */
  getClient() {
    return this.supabase;
  }

  /**
   * Retorna o nome do bucket configurado para armazenamento de arquivos
   * @returns Nome do bucket ou string vazia se não estiver configurado
   */
  getBucketName(): string {
    return this.bucketName || '';
  }

  /**
   * Gera uma URL assinada para acesso temporário a um arquivo no Supabase Storage
   * @param filePath Caminho do arquivo no bucket
   * @param expiresIn Tempo de expiração em segundos (padrão: 60 segundos)
   * @returns URL assinada para acesso temporário
   */
  async getSignedUrl(filePath: string, expiresIn = 60): Promise<string> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        this.logger.error(`Error creating signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error(`Failed to create signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (!data || !data.signedUrl) {
        throw new Error('Failed to get signed URL');
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error(`Error generating signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
