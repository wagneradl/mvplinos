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
    // Usa exclusivamente a SUPABASE_SERVICE_ROLE_KEY
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucketName = process.env.SUPABASE_BUCKET || 'pedidos-pdfs';

    // Log detalhado das configurações (sem mostrar as chaves completas)
    this.logger.log(`[SUPABASE] Inicializando serviço com as seguintes configurações:`);
    this.logger.log(`[SUPABASE] URL: ${supabaseUrl || 'NÃO CONFIGURADA'}`);
    this.logger.log(
      `[SUPABASE] SERVICE_ROLE_KEY: ${supabaseKey ? 'Configurada' : 'NÃO CONFIGURADA'}`,
    );
    this.logger.log(`[SUPABASE] Bucket: ${bucketName}`);
    this.logger.log(`[SUPABASE] Ambiente: ${process.env.NODE_ENV || 'não definido'}`);

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        '[SUPABASE] ERRO: Supabase URL ou SERVICE_ROLE_KEY ausente. Configure as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY',
      );
    } else {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.logger.log(`[SUPABASE] Cliente inicializado com sucesso para URL: ${supabaseUrl}`);

        // Adiciona log para depuração da sessão
        if (this.supabase && this.supabase.auth && this.supabase.auth.getSession) {
          this.supabase.auth
            .getSession()
            .then((sess) => {
              this.logger.log(`[SUPABASE] Sessão atual:`, sess);
            })
            .catch((e) => {
              this.logger.warn(`[SUPABASE] Erro ao obter sessão: ${e}`);
            });
        }
      } catch (error) {
        this.logger.error(
          `[SUPABASE] ERRO ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        );
      }
      // Tentar criar o bucket se ele não existir, usando políticas públicas
      this.initializeBucket(bucketName).catch((error) => {
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
          public: true, // Tornar o bucket público
        });

        if (error) {
          throw error;
        }

        this.logger.log(`Bucket ${bucketName} created successfully`);
      } else {
        this.logger.log(`Bucket ${bucketName} already exists`);

        // Como não podemos alterar as políticas via API cliente, informamos ao usuário
        this.logger.warn(
          `Make sure the bucket ${bucketName} has public access or appropriate RLS policies`,
        );
        this.logger.warn(`You may need to configure this in the Supabase dashboard manually`);
      }
    } catch (error: any) {
      this.logger.error(
        `Error initializing bucket: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
      // Não lançamos o erro para evitar que o serviço falhe durante a inicialização
    }
  }

  /**
   * Upload a file to Supabase Storage
   *
   * Faz upload de um arquivo para o bucket configurado no Supabase Storage
   * e retorna uma URL assinada para acesso direto ao arquivo (funciona para bucket público ou privado).
   *
   * @param filePath Path with filename to store in Supabase (e.g. 'pedidos/pedido-123.pdf')
   * @param fileData File contents as Buffer or Blob
   * @param contentType MIME type of the file
   * @returns Signed URL of the uploaded file
   * @throws {InternalServerErrorException} When upload fails
   */
  async uploadFile(
    filePath: string,
    fileData: Buffer | Blob,
    contentType: string,
  ): Promise<string> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase client not initialized');
      }
      // Upload file
      const { error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileData, {
          contentType,
          upsert: true,
        });
      if (uploadError) {
        this.logger.error(`Error uploading file to Supabase: ${uploadError.message}`);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
      // Generate signed URL (valid for 1 hour)
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, 60 * 60);
      if (error || !data?.signedUrl) {
        this.logger.error(`Error creating signed URL: ${error?.message || 'Unknown error'}`);
        throw new Error('Failed to get signed URL for uploaded file');
      }
      this.logger.log(`File uploaded successfully to Supabase Storage: ${data.signedUrl}`);
      return data.signedUrl;
    } catch (error) {
      // Se for um erro que já tratamos, repassar
      if (error instanceof Error && (error as SupabaseServiceError).code) {
        throw error;
      }
      // Erro não esperado
      this.logger.error(
        `Storage service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );
      // Modo de desenvolvimento/teste: gerar URL local temporária
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn('Using local development fallback for file URL due to Supabase error');
        // Extrair o nome do arquivo do caminho
        const fileName = filePath.split('/').pop() || 'unknownfile';
        return `/uploads/pdfs/${fileName}`;
      }
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Unknown error uploading file to Supabase Storage',
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
      url: publicUrl,
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
        this.logger.error(
          `Error creating signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw new Error(
          `Failed to create signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      if (!data || !data.signedUrl) {
        throw new Error('Failed to get signed URL');
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error(
        `Error generating signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Baixa um arquivo do Supabase Storage
   * @param filePath Caminho do arquivo no bucket
   * @returns Blob de dados do arquivo
   */
  async downloadFile(filePath: string): Promise<{ data: Blob | null; error: any }> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Supabase client not initialized');
    }
    const { data, error } = await this.supabase.storage.from(this.bucketName).download(filePath);
    if (error) {
      this.logger.error(`Erro ao baixar arquivo do Supabase: ${error.message}`);
      return { data: null, error };
    }
    return { data, error: null };
  }
}
