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
  Container
} from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LockOutlined } from '@mui/icons-material';
import { LoginContainer } from '@/components/LoginContainer';
import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage } from '@/services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  // Efeito para evitar fazer login se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login');
      }

      // Usar a função login do contexto de autenticação
      login(data.token, data.usuario);
      
    } catch (error) {
      console.error('Erro de login:', error);
      // Usar utilidade de formatação de erro para mensagens mais amigáveis
      setError(extractErrorMessage(error) || 'Falha na autenticação. Verifique seu email e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      py: 4
    }}>
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
            mb: 4
          }}
        >
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box sx={{ width: 120, height: 120, mx: 'auto', mb: 2, position: 'relative' }}>
              <Image
                src="/assets/logo.png"
                alt="Lino's Panificadora"
                width={120}
                height={120}
                style={{ objectFit: 'contain' }}
                onError={(e) => {
                  // Fallback se a imagem não carregar
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/logo.png'; // Tentar caminho alternativo
                }}
              />
            </Box>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Lino's Panificadora
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Sistema de Gestão
            </Typography>
          </Box>
          
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              backgroundColor: 'primary.main', 
              color: 'white', 
              width: 40, 
              height: 40, 
              borderRadius: '50%',
              mb: 2
            }}
          >
            <LockOutlined />
          </Box>
          
          <Typography component="h1" variant="h5" gutterBottom>
            Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
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
              disabled={loading}
              error={!!error}
              InputProps={{
                sx: { borderRadius: 1 }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="senha"
              label="Senha"
              type="password"
              id="senha"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={loading}
              error={!!error}
              InputProps={{
                sx: { borderRadius: 1 }
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.5,
                borderRadius: 1
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
            </Button>
          </Box>
        </Paper>
      </Fade>
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {new Date().getFullYear()} Lino's Panificadora. Todos os direitos reservados.
        </Typography>
      </Box>
    </Container>
  );
}

export const dynamic = 'force-dynamic';
