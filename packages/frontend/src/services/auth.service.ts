import { loggers } from '@/utils/logger';

const authLogger = loggers.auth;

// Em desenvolvimento, usar o proxy configurado no Next.js para evitar CORS
// Em produção, usar a URL da API configurada nas variáveis de ambiente
let API_URL =
  process.env.NODE_ENV === 'development'
    ? '/api' // Usar o proxy local configurado em next.config.js
    : process.env.NEXT_PUBLIC_API_URL || 'https://linos-backend.onrender.com';

// Verificar se a URL de produção tem o protocolo correto
if (process.env.NODE_ENV !== 'development' && API_URL && !API_URL.startsWith('http')) {
  API_URL = `https://${API_URL}`;
}

// Debug para verificar a URL
authLogger.debug(`[API] Ambiente: ${process.env.NODE_ENV}, URL da API:`, API_URL);
authLogger.debug('process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: {
    id: number;
    nome: string;
    codigo: string;
    tipo: string;
    nivel: number;
    permissoes: Record<string, string[]>;
  };
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  usuario: Usuario;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      authLogger.debug('Tentando login com:', {
        email: credentials.email,
        senhaLength: credentials.senha?.length,
      });
      authLogger.debug('URL completa:', `${API_URL}/auth/login`);

      // Verificar se a URL está correta apenas em produção
      if (process.env.NODE_ENV !== 'development' && (!API_URL || !API_URL.startsWith('http'))) {
        authLogger.error('URL da API inválida:', API_URL);
        throw new Error('Configuração da API inválida. Verifique a variável NEXT_PUBLIC_API_URL.');
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Incluir cookies se necessário
        body: JSON.stringify(credentials),
      });

      authLogger.debug('Resposta recebida:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Falha na autenticação';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          authLogger.error('Erro ao parsear resposta de erro:', errorText);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      authLogger.debug('Login bem-sucedido, tokens recebidos');
      return data;
    } catch (error) {
      authLogger.error('Erro detalhado no login:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        authLogger.error('Erro de rede no fetch. Possível problema de CORS ou servidor offline.');
      }
      throw error;
    }
  },

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Falha ao renovar token';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // ignore parse error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async serverLogout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      // Logout no servidor é best-effort; não bloquear o logout local
      authLogger.warn('Erro ao revogar token no servidor:', error);
    }
  },

  async getMe(): Promise<Usuario> {
    const token = localStorage.getItem('authToken');

    if (!token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao obter informações do usuário');
    }

    return response.json();
  },

  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  saveRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  },

  saveUserData(userData: Usuario): void {
    localStorage.setItem('userData', JSON.stringify(userData));
  },

  getUserData(): Usuario | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
