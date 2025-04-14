'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: {
    id: number;
    nome: string;
    permissoes: Record<string, string[]>;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  usuario: Usuario | null;
  loading: boolean;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  hasPermission: (recurso: string, acao: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    }
    setUsuario(null);
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  // Verifica se o token é válido (não expirado)
  const isTokenValid = useCallback((token: string): boolean => {
    try {
      // Decodificar payload do JWT (segunda parte do token)
      const base64Url = token.split('.')[1];
      if (!base64Url) return false;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      // Verificar expiração
      if (!payload.exp) return false;
      
      // Comparar com o tempo atual (em segundos)
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (error) {
      console.error('Erro ao validar token:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    // Verificar se o usuário está autenticado ao carregar a página
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
          // Verificar se o token não está expirado
          if (isTokenValid(token)) {
            try {
              const parsedUser = JSON.parse(userData);
              setUsuario(parsedUser);
              setIsAuthenticated(true);
            } catch (error) {
              console.error('Erro ao processar dados do usuário:', error);
              logout();
            }
          } else {
            // Token expirado, fazer logout
            console.warn('Token expirado ou inválido');
            logout();
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Não estamos em um ambiente de navegador (SSR)
      setLoading(false);
    }
  }, [logout, isTokenValid]);

  useEffect(() => {
    // Só aplicar redirecionamentos se não estivermos carregando
    if (!loading) {
      const currentPath = pathname || '';
      
      // Redirecionar para login se não estiver autenticado e não estiver na página de login
      if (!isAuthenticated && currentPath !== '/login') {
        console.log('Não autenticado, redirecionando para login');
        router.push('/login');
      }

      // Redirecionar para dashboard se já estiver autenticado e tentar acessar login
      if (isAuthenticated && currentPath === '/login') {
        console.log('Já autenticado, redirecionando para dashboard');
        router.push('/pedidos');
      }
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = useCallback((token: string, userData: Usuario) => {
    try {
      if (typeof window !== 'undefined') {
        // Primeiro armazenar dados no localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
      
        // Então atualizar o estado em uma única operação para evitar renderizações parciais
        setUsuario(userData);
        setIsAuthenticated(true);
        setLoading(false);
      
        console.log('Login bem-sucedido, redirecionando para dashboard...');
        
        // Forçar render e garantir que a UI reflita o estado atualizado antes do redirecionamento
        setTimeout(() => {
          // Redirecionar para a página de pedidos
          window.location.href = '/pedidos';
        }, 100);
      }
    } catch (error) {
      console.error('Erro ao realizar login:', error);
      alert('Ocorreu um erro ao fazer login. Por favor, tente novamente.');
    }
  }, []);

  const hasPermission = (recurso: string, acao: string): boolean => {
    if (!usuario || !usuario.papel || !usuario.papel.permissoes) {
      return false;
    }

    // Administrador tem todas as permissões
    if (usuario.papel.nome === 'Administrador') {
      return true;
    }

    const permissoes = usuario.papel.permissoes;
    return permissoes[recurso]?.includes(acao) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        usuario,
        loading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
