'use client';

import React, { useState } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, extractErrorMessage } from '@/services/api';

const esqueciSenhaSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Formato de email inválido'),
});

type EsqueciSenhaFormData = z.infer<typeof esqueciSenhaSchema>;

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EsqueciSenhaFormData>({
    resolver: zodResolver(esqueciSenhaSchema),
  });

  const onSubmit = async (data: EsqueciSenhaFormData) => {
    setErro('');
    try {
      await api.post('/auth/reset-solicitar', { email: data.email });
      setEnviado(true);
    } catch (error) {
      setErro(
        extractErrorMessage(error) ||
          'Erro ao processar solicitação. Tente novamente.',
      );
    }
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
              Recuperar senha
            </Typography>
          </Box>

          {enviado ? (
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                Se o email estiver cadastrado, você receberá um link para
                redefinir sua senha.
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
                  Voltar ao login
                </Typography>
              </Link>
            </Box>
          ) : (
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
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Informe seu email cadastrado para receber um link de
                recuperação de senha.
              </Typography>
              <TextField
                margin="normal"
                fullWidth
                label="Email"
                autoComplete="email"
                autoFocus
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
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
                  'Enviar link de recuperação'
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
          )}
        </Paper>
      </Fade>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
        Lino&apos;s Panificadora &copy; {new Date().getFullYear()}
      </Typography>
    </Container>
  );
}

export const dynamic = 'force-dynamic';
