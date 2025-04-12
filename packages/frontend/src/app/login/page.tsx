'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LockOutlined } from '@mui/icons-material';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

      // Armazenar token e informações do usuário no localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.usuario));

      // Redirecionar para a página inicial
      router.push('/');
    } catch (error) {
      console.error('Erro de login:', error);
      setError(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper 
        elevation={3} 
        sx={{ 
          mt: 8, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2
        }}
      >
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Box sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}>
            <Image
              src="/logo.png"
              alt="Lino's Panificadora"
              width={120}
              height={120}
              style={{ objectFit: 'contain' }}
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
        
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
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
        </Box>
      </Paper>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Lino's Panificadora. Todos os direitos reservados.
        </Typography>
      </Box>
    </Container>
  );
}

export const dynamic = 'force-dynamic';
