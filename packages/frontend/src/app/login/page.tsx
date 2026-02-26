'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Fade,
  Container,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { loggers } from '@/utils/logger';

const logger = loggers.auth;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';

  useEffect(() => {
    if (sessionExpired) {
      // Limpar o query param sem recarregar a página
      window.history.replaceState({}, '', '/login');
    }
  }, [sessionExpired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Usar o serviço de autenticação em vez de fetch direto
      const data = await authService.login({ email, senha });
      login(data.access_token, data.refresh_token, data.usuario);
    } catch (error: any) {
      logger.error('Erro de login:', error);

      // auth.service usa fetch nativo → lança Error plain com message do backend
      const message = error?.message || '';

      if (error instanceof TypeError && message.includes('fetch')) {
        // Erro de rede real — servidor down ou CORS
        setError('Servidor temporariamente indisponível. Aguarde alguns segundos e tente novamente.');
      } else if (message) {
        // Mensagem do backend (via auth.service.ts throw new Error(errorMessage))
        setError(message);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <Container
        maxWidth="sm"
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        py: 4,
      }}
    >
      <Fade in={true} timeout={800}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            mb: 4,
          }}
        >
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box sx={{ width: 120, height: 120, mx: 'auto', mb: 2, position: 'relative' }}>
              <Image
                src="/logo.png"
                alt="Lino's Panificadora"
                width={120}
                height={120}
                style={{ objectFit: 'contain' }}
                priority
              />
            </Box>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Lino&apos;s Panificadora
            </Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
            {sessionExpired && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Sua sessão expirou. Por favor, faça login novamente.
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="senha"
              label="Senha"
              type="password"
              id="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              variant="outlined"
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
            </Button>
            <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/esqueci-senha" passHref legacyBehavior>
                <Typography
                  component="a"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Esqueci minha senha
                </Typography>
              </Link>
              <Link href="/registrar" passHref legacyBehavior>
                <Typography
                  component="a"
                  variant="body2"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Não tem conta? Cadastre sua empresa
                </Typography>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Fade>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
        Lino&apos;s Panificadora &copy; {new Date().getFullYear()}
      </Typography>
    </Container>
  );
}

export const dynamic = 'force-dynamic';
