'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, extractErrorMessage } from '@/services/api';

const resetSenhaSchema = z
  .object({
    novaSenha: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(
        /(?=.*[a-zA-Z])(?=.*[0-9])/,
        'Senha deve conter letras e números',
      ),
    confirmarSenha: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type ResetSenhaFormData = z.infer<typeof resetSenhaSchema>;

function ResetSenhaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [validando, setValidando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetSenhaFormData>({
    resolver: zodResolver(resetSenhaSchema),
  });

  useEffect(() => {
    if (!token) {
      setValidando(false);
      return;
    }

    const validarToken = async () => {
      try {
        const { data } = await api.get(`/auth/reset-validar/${token}`);
        setTokenValido(data.valido === true);
      } catch {
        setTokenValido(false);
      } finally {
        setValidando(false);
      }
    };

    validarToken();
  }, [token]);

  const onSubmit = async (data: ResetSenhaFormData) => {
    setErro('');
    try {
      await api.post('/auth/reset-confirmar', {
        token,
        novaSenha: data.novaSenha,
      });
      setSucesso(true);
    } catch (error) {
      setErro(
        extractErrorMessage(error) ||
          'Erro ao redefinir senha. Tente novamente.',
      );
    }
  };

  const renderContent = () => {
    if (validando) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Validando link de recuperação...
          </Typography>
        </Box>
      );
    }

    if (!token || !tokenValido) {
      return (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Link de recuperação inválido ou expirado.
          </Alert>
          <Link href="/esqueci-senha" passHref legacyBehavior>
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
              Solicitar novo link
            </Typography>
          </Link>
        </Box>
      );
    }

    if (sucesso) {
      return (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Senha redefinida com sucesso!
          </Alert>
          <Link href="/login" passHref legacyBehavior>
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
              Ir para o login
            </Typography>
          </Link>
        </Box>
      );
    }

    return (
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ mt: 2, width: '100%' }}
      >
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        )}
        <TextField
          margin="normal"
          fullWidth
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          autoFocus
          variant="outlined"
          disabled={isSubmitting}
          error={!!errors.novaSenha}
          helperText={errors.novaSenha?.message}
          {...register('novaSenha')}
        />
        <TextField
          margin="normal"
          fullWidth
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          variant="outlined"
          disabled={isSubmitting}
          error={!!errors.confirmarSenha}
          helperText={errors.confirmarSenha?.message}
          {...register('confirmarSenha')}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2, py: 1.5 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Redefinir senha'
          )}
        </Button>
        <Box sx={{ textAlign: 'center' }}>
          <Link href="/login" passHref legacyBehavior>
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
              Voltar ao login
            </Typography>
          </Link>
        </Box>
      </Box>
    );
  };

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
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                position: 'relative',
              }}
            >
              <Image
                src="/logo.png"
                alt="Lino's Panificadora"
                width={120}
                height={120}
                style={{ objectFit: 'contain' }}
                priority
              />
            </Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              Lino&apos;s Panificadora
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, color: 'text.secondary' }}>
              Redefinir senha
            </Typography>
          </Box>

          {renderContent()}
        </Paper>
      </Fade>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
        Lino&apos;s Panificadora &copy; {new Date().getFullYear()}
      </Typography>
    </Container>
  );
}

export default function ResetSenhaPage() {
  return (
    <Suspense
      fallback={
        <Container
          maxWidth="sm"
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
        </Container>
      }
    >
      <ResetSenhaContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
