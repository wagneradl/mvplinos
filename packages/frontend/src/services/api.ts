import axios, { AxiosError } from 'axios';
import { loggers } from '@/utils/logger';

const apiLogger = loggers.api;

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logs de requisições
api.interceptors.request.use(
  (config) => {
    const { method, url, params, data } = config;
    
    // Log detalhado para debug
    apiLogger.debug(`Requisição ${method?.toUpperCase()} para ${url}`, { 
      params: params || {}, 
      data: method !== 'get' ? data : undefined 
    });
    
    return config;
  },
  (error) => {
    apiLogger.error('Erro ao configurar requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para formatação de erros da API e logs de respostas
api.interceptors.response.use(
  (response) => {
    const { status, config, data } = response;
    const { method, url } = config;
    
    // Log básico da resposta bem-sucedida
    apiLogger.debug(`Resposta ${status} de ${method?.toUpperCase()} ${url}`, {
      dataSize: JSON.stringify(data).length,
      timing: response.headers['x-response-time'] // Se o backend fornecer
    });
    
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // Log detalhado do erro para diagnóstico
    apiLogger.error('Erro na requisição API:', {
      config: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
        data: error.config?.data
      },
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      },
      message: error.message,
      stack: error.stack
    });

    // Criar um erro mais amigável com informações estruturadas
    const enhancedError: any = new Error();
    enhancedError.isApiError = true;
    
    // Padronizar estrutura da mensagem de erro
    if (error.response?.data) {
      const { message, error: errorType } = error.response.data;
      
      enhancedError.statusCode = error.response.status;
      enhancedError.message = Array.isArray(message) 
        ? message[0] 
        : message || 'Erro desconhecido';
      enhancedError.errorType = errorType;
      enhancedError.messages = Array.isArray(message) ? message : [message];
      enhancedError.originalError = error;
    } else if (error.request) {
      // Erro de rede - o servidor não respondeu
      enhancedError.statusCode = 0;
      enhancedError.message = 'Erro de conexão com o servidor. Verifique sua internet.';
      enhancedError.errorType = 'NETWORK_ERROR';
      enhancedError.originalError = error;
    } else {
      // Erro na configuração da requisição
      enhancedError.statusCode = 0;
      enhancedError.message = error.message || 'Ocorreu um erro na requisição';
      enhancedError.errorType = 'REQUEST_ERROR';
      enhancedError.originalError = error;
    }

    return Promise.reject(enhancedError);
  }
);

// Função utilitária para extrair mensagens de erro da API de forma mais amigável
export const extractErrorMessage = (error: any): string => {
  // Se for nosso erro aprimorado da API
  if (error.isApiError) {
    // Erros específicos por código
    if (error.statusCode === 400) {
      return `Dados inválidos: ${error.message}`;
    }
    if (error.statusCode === 404) {
      return `Recurso não encontrado: ${error.message}`;
    }
    if (error.statusCode === 409) {
      return `Conflito: ${error.message}`;
    }
    if (error.statusCode === 422) {
      return `Validação falhou: ${error.message}`;
    }
    if (error.statusCode === 500) {
      return 'Erro interno do servidor. Por favor, tente novamente mais tarde.';
    }
    return error.message;
  }
  
  // Erro padrão do JavaScript
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback
  return 'Ocorreu um erro inesperado';
};

// Função para converter erros de API em sugestões para o usuário
export const getErrorSuggestions = (error: any): string[] => {
  const suggestions: string[] = [];
  
  // Erros comuns com sugestões específicas
  if (error.isApiError) {
    // Erro 400 - Bad Request
    if (error.statusCode === 400) {
      suggestions.push('Verifique se todos os campos foram preenchidos corretamente.');
      suggestions.push('Certifique-se de que os formatos de dados estão corretos (ex: CNPJ, data, etc).');
    }
    
    // Erro 404 - Not Found
    else if (error.statusCode === 404) {
      suggestions.push('Verifique se o recurso que você está buscando realmente existe.');
      suggestions.push('O item pode ter sido excluído ou movido.');
    }
    
    // Erro 409 - Conflict
    else if (error.statusCode === 409) {
      suggestions.push('Tente com um nome ou identificador diferente.');
      suggestions.push('O recurso que você está tentando criar já existe no sistema.');
    }
    
    // Erro 422 - Unprocessable Entity
    else if (error.statusCode === 422) {
      suggestions.push('Revise os dados informados para garantir que estão no formato correto.');
      
      // Sugestões específicas baseadas na mensagem
      if (error.message.includes('CNPJ')) {
        suggestions.push('O CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX.');
      }
      if (error.message.includes('telefone')) {
        suggestions.push('O telefone deve estar no formato (XX) XXXXX-XXXX.');
      }
      if (error.message.includes('email')) {
        suggestions.push('Verifique se o email está em um formato válido.');
      }
    }
    
    // Erro 500 - Server Error
    else if (error.statusCode === 500) {
      suggestions.push('Tente novamente mais tarde.');
      suggestions.push('Se o problema persistir, entre em contato com o suporte.');
    }
    
    // Erro de rede
    else if (error.errorType === 'NETWORK_ERROR') {
      suggestions.push('Verifique sua conexão com a internet.');
      suggestions.push('Certifique-se de que o servidor está disponível.');
    }
  }
  
  // Sugestões gerais se não houver sugestões específicas
  if (suggestions.length === 0) {
    suggestions.push('Tente recarregar a página e tentar novamente.');
    suggestions.push('Se o problema persistir, entre em contato com o suporte.');
  }
  
  return suggestions;
};

// Função para extrair detalhes técnicos de erro para logs ou debug
export const getErrorDetails = (error: any): string => {
  const details: string[] = [];
  
  // Se for erro aprimorado da API
  if (error.isApiError) {
    details.push(`Código: ${error.statusCode}`);
    details.push(`Tipo: ${error.errorType}`);
    
    if (Array.isArray(error.messages)) {
      details.push(`Mensagens: ${error.messages.join(', ')}`);
    }
    
    if (error.originalError?.config) {
      const { method, url } = error.originalError.config;
      details.push(`Request: ${method?.toUpperCase()} ${url}`);
    }
  }
  
  // Se for erro padrão
  if (error instanceof Error) {
    details.push(`Nome: ${error.name}`);
    details.push(`Stack: ${error.stack}`);
  }
  
  return details.join('\n');
};
