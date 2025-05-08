// Em desenvolvimento, usar o proxy configurado no Next.js para evitar CORS
// Em produção, usar a URL da API configurada nas variáveis de ambiente
let API_URL = process.env.NODE_ENV === 'development' 
  ? '/api' // Usar o proxy local configurado em next.config.js
  : process.env.NEXT_PUBLIC_API_URL || 'https://linos-backend.onrender.com';

// Verificar se a URL de produção tem o protocolo correto
if (process.env.NODE_ENV !== 'development' && API_URL && !API_URL.startsWith('http')) {
  API_URL = `https://${API_URL}`;
}

// Debug para verificar a URL
console.log(`[API] Ambiente: ${process.env.NODE_ENV}, URL da API:`, API_URL);
console.log('process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

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
    permissoes: Record<string, string[]>;
  };
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('Tentando login com:', { email: credentials.email, senhaLength: credentials.senha?.length });
      console.log('URL completa:', `${API_URL}/auth/login`);
      
      // Verificar se a URL está correta apenas em produção
      if (process.env.NODE_ENV !== 'development' && (!API_URL || !API_URL.startsWith('http'))) {
        console.error('URL da API inválida:', API_URL);
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

      console.log('Resposta recebida:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Falha na autenticação';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Erro ao parsear resposta de erro:', errorText);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Login bem-sucedido, token recebido');
      return data;
    } catch (error) {
      console.error('Erro detalhado no login:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Erro de rede no fetch. Possível problema de CORS ou servidor offline.');
      }
      throw error;
    }
  },

  async getMe(): Promise<Usuario> {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('Não autenticado');
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
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

  saveUserData(userData: Usuario): void {
    localStorage.setItem('userData', JSON.stringify(userData));
  },

  getUserData(): Usuario | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};
