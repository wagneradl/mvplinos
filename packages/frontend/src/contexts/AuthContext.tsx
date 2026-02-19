'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { loggers } from '@/utils/logger';

const authLogger = loggers.auth;

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
  login: (accessToken: string, refreshToken: string, usuario: Usuario) => void;
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

  const logout = useCallback(async () => {
    // Tentar revogar o token no servidor (best-effort)
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');
      if (accessToken && refreshToken) {
        await authService.serverLogout(accessToken, refreshToken);
      }

      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
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
      authLogger.error('Erro ao validar token:', error);
      return false;
    }
  }, []);

  // Efeito para verificar a autenticação ao carregar a página
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);

      if (typeof window !== 'undefined') {
        try {
          const token = localStorage.getItem('authToken');
          const refreshToken = localStorage.getItem('refreshToken');
          const userData = localStorage.getItem('userData');

          if (token && userData) {
            if (isTokenValid(token)) {
              // Access token válido — usar normalmente
              try {
                const parsedUser = JSON.parse(userData);
                setUsuario(parsedUser);
                setIsAuthenticated(true);
              } catch (error) {
                authLogger.error('Erro ao processar dados do usuário:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userData');
                setIsAuthenticated(false);
                setUsuario(null);
              }
            } else if (refreshToken) {
              // Access token expirado, mas temos refresh token — tentar renovar
              try {
                authLogger.debug('Access token expirado, tentando refresh...');
                const data = await authService.refresh(refreshToken);
                authService.saveToken(data.access_token);
                authService.saveRefreshToken(data.refresh_token);
                authService.saveUserData(data.usuario);
                setUsuario(data.usuario);
                setIsAuthenticated(true);
                authLogger.debug('Token renovado com sucesso no checkAuth');
              } catch (error) {
                authLogger.warn('Falha ao renovar token no checkAuth:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userData');
                setIsAuthenticated(false);
                setUsuario(null);
              }
            } else {
              // Token expirado e sem refresh token
              authLogger.warn('Token expirado e sem refresh token');
              localStorage.removeItem('authToken');
              localStorage.removeItem('userData');
              setIsAuthenticated(false);
              setUsuario(null);
            }
          } else {
            // Sem token ou dados de usuário
            setIsAuthenticated(false);
            setUsuario(null);
          }
        } catch (error) {
          authLogger.error('Erro ao verificar autenticação:', error);
          setIsAuthenticated(false);
          setUsuario(null);
        } finally {
          setLoading(false);
        }
      } else {
        // Não estamos em um ambiente de navegador (SSR)
        setLoading(false);
      }
    };

    checkAuth();
  }, [isTokenValid]);

  // Gerenciar redirecionamentos baseados no estado de autenticação
  useEffect(() => {
    // Só aplicar redirecionamentos se não estivermos carregando
    if (!loading) {
      const currentPath = pathname || '';

      // Redirecionar para dashboard se já estiver autenticado e tentar acessar login
      if (isAuthenticated && currentPath === '/login') {
        authLogger.debug('Já autenticado, redirecionando para dashboard');
        router.push('/pedidos');
      }
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = useCallback(
    async (accessToken: string, refreshToken: string, userData: Usuario) => {
      try {
        if (typeof window !== 'undefined') {
          // Primeiro armazenar dados no localStorage de forma síncrona
          localStorage.setItem('authToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('userData', JSON.stringify(userData));

          // Atualizar estado de forma síncrona para garantir consistência
          setUsuario(userData);
          setIsAuthenticated(true);

          authLogger.debug('Login bem-sucedido, redirecionando para dashboard...');

          // Usar o router do Next.js para navegação sem refresh completo
          router.push('/pedidos');
        }
      } catch (error) {
        authLogger.error('Erro ao realizar login:', error);
        // Limpar quaisquer dados inconsistentes em caso de erro
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        setUsuario(null);
        setIsAuthenticated(false);
        alert('Ocorreu um erro ao fazer login. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

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
