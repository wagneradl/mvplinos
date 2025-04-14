import axios, { AxiosError } from 'axios';
import { loggers } from '@/utils/logger';

const apiLogger = loggers.api;

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

const getApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos de timeout
});

// Função para obter token do localStorage com segurança
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('authToken');
    } catch (error) {
      console.error('Erro ao acessar localStorage:', error);
      return null;
    }
  }
  return null;
};

// Interceptor para logs de requisições
api.interceptors.request.use(
  (config) => {
    const { method, url, params, data } = config;
    
    // Adicionar token de autenticação se disponível
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      apiLogger.debug('Token de autenticação adicionado à requisição');
    } else {
      apiLogger.debug('Requisição sem token de autenticação');
    }
    
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

    // Tratar erros de rede para melhor feedback ao usuário
    if (!error.response) {
      // Mostrar notificação ao usuário se disponível
      if (typeof window !== 'undefined') {
        // Simular uma notificação com alert para fins de demonstração
        // Em produção, usar um sistema de notificação mais elegante como toast
        try {
          const message = "Erro de conexão com o servidor. Verifique sua internet e tente novamente.";
          console.error(message);
          // Evitar múltiplos alertas - mostrar apenas um a cada 5 segundos
          if (!window.__lastNetworkErrorAlert || Date.now() - window.__lastNetworkErrorAlert > 5000) {
            window.__lastNetworkErrorAlert = Date.now();
            setTimeout(() => {
              alert(message);
            }, 100);
          }
        } catch (err) {
          console.error('Erro ao exibir notificação:', err);
        }
      }
    }

    // Tratamento especial para erros de autenticação
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      apiLogger.warn('Token inválido ou expirado, redirecionando para login');
      
      // Limpar dados de autenticação
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Mostrar feedback ao usuário
        console.warn('Sessão expirada. Você será redirecionado para o login.');
        
        // Evitar múltiplos alertas/redirecionamentos
        if (!window.__authRedirectInProgress) {
          window.__authRedirectInProgress = true;
          
          // Mostrar mensagem antes de redirecionar
          if (!window.location.pathname.includes('/login')) {
            alert('Sua sessão expirou. Você será redirecionado para a página de login.');
            window.location.href = '/login?expired=true';
          }
        }
      }
    }

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

    // Incluir o endpoint que falhou para facilitar o diagnóstico
    enhancedError.endpoint = error.config?.url;
    enhancedError.method = error.config?.method;

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
    if (error.statusCode === 401) {
      return `Erro de autenticação: ${error.message}. Por favor, faça login novamente.`;
    }
    if (error.statusCode === 403) {
      return `Acesso negado: ${error.message}. Você não tem permissão para esta ação.`;
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
    
    // Erro 401 - Unauthorized
    else if (error.statusCode === 401) {
      suggestions.push('Sua sessão pode ter expirado. Tente fazer login novamente.');
      suggestions.push('Verifique suas credenciais de acesso.');
    }
    
    // Erro 403 - Forbidden
    else if (error.statusCode === 403) {
      suggestions.push('Você não tem permissão para acessar este recurso.');
      suggestions.push('Contate o administrador do sistema para solicitar acesso.');
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
      suggestions.push('Tente recarregar a página após alguns segundos.');
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
  let details = '';
  
  if (error.isApiError) {
    details += `Status: ${error.statusCode || 'Desconhecido'}\n`;
    details += `Tipo: ${error.errorType || 'Desconhecido'}\n`;
    details += `Mensagem: ${error.message || 'Nenhuma mensagem disponível'}\n`;
    details += `Endpoint: ${error.endpoint || 'Desconhecido'}\n`;
    
    if (error.messages && error.messages.length > 1) {
      details += 'Detalhes:\n';
      error.messages.forEach((msg: string, idx: number) => {
        details += `  ${idx + 1}. ${msg}\n`;
      });
    }
  } else if (error instanceof Error) {
    details += `Erro: ${error.name}\n`;
    details += `Mensagem: ${error.message}\n`;
    if (error.stack) {
      details += `Stack: ${error.stack}\n`;
    }
  } else {
    details += `Erro desconhecido: ${JSON.stringify(error)}`;
  }
  
  return details;
};
