const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Falha na autenticação');
    }

    return response.json();
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
