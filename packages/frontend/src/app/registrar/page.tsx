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
  Divider,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';

// ── Helpers de máscara ──────────────────────────────────────────────────

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

// ── Schema de validação ─────────────────────────────────────────────────

const registrarSchema = z
  .object({
    razao_social: z.string().min(1, 'Razão social é obrigatória'),
    nome_fantasia: z.string().optional(),
    cnpj: z
      .string()
      .min(1, 'CNPJ é obrigatório')
      .refine(
        (val) => val.replace(/\D/g, '').length === 14,
        'CNPJ deve ter 14 dígitos',
      ),
    email_empresa: z
      .string()
      .min(1, 'Email da empresa é obrigatório')
      .email('Formato de email inválido'),
    telefone: z.string().optional(),
    nome_responsavel: z
      .string()
      .min(1, 'Nome do responsável é obrigatório'),
    email_responsavel: z
      .string()
      .min(1, 'Email do responsável é obrigatório')
      .email('Formato de email inválido'),
    senha: z
      .string()
      .min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmar_senha: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.senha === data.confirmar_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_senha'],
  });

type RegistrarFormData = z.infer<typeof registrarSchema>;

// ── Componente ──────────────────────────────────────────────────────────

export default function RegistrarPage() {
  const [sucesso, setSucesso] = useState(false);
  const [dadosSucesso, setDadosSucesso] = useState<{
    razaoSocial: string;
    email: string;
  } | null>(null);
  const [erro, setErro] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarFormData>({
    resolver: zodResolver(registrarSchema),
    defaultValues: {
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      email_empresa: '',
      telefone: '',
      nome_responsavel: '',
      email_responsavel: '',
      senha: '',
      confirmar_senha: '',
    },
  });

  const cnpjValue = watch('cnpj');
  const telefoneValue = watch('telefone');

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('cnpj', maskCnpj(e.target.value), { shouldValidate: false });
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('telefone', maskTelefone(e.target.value), { shouldValidate: false });
  };

  const onSubmit = async (data: RegistrarFormData) => {
    setErro('');
    try {
      const payload = {
        razao_social: data.razao_social.trim(),
        nome_fantasia: data.nome_fantasia?.trim() || undefined,
        cnpj: data.cnpj.replace(/\D/g, ''),
        email_empresa: data.email_empresa.trim(),
        telefone: data.telefone?.replace(/\D/g, '') || undefined,
        nome_responsavel: data.nome_responsavel.trim(),
        email_responsavel: data.email_responsavel.trim(),
        senha: data.senha,
      };

      await api.post('/auth/registrar-cliente', payload);

      setDadosSucesso({
        razaoSocial: data.razao_social,
        email: data.email_responsavel,
      });
      setSucesso(true);
    } catch (error: any) {
      const statusCode = error?.statusCode;
      const message = error?.message || '';

      if (statusCode === 409) {
        // Conflito — CNPJ ou email duplicado
        if (message.toLowerCase().includes('cnpj')) {
          setError('cnpj', { message: 'CNPJ já cadastrado no sistema' });
        } else if (message.toLowerCase().includes('email')) {
          setError('email_responsavel', { message: 'Email já cadastrado no sistema' });
        } else {
          setErro(message || 'Dados já cadastrados no sistema');
        }
      } else if (statusCode === 400) {
        setErro(message || 'Dados inválidos. Verifique os campos e tente novamente.');
      } else {
        setErro('Erro ao enviar cadastro. Tente novamente.');
      }
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
          {/* Header com logo */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                mx: 'auto',
                mb: 2,
                position: 'relative',
              }}
            >
              <Image
                src="/logo.png"
                alt="Lino's Panificadora"
                width={100}
                height={100}
                style={{ objectFit: 'contain' }}
                priority
              />
            </Box>
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              Lino&apos;s Panificadora
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 0.5, color: 'text.secondary' }}>
              Cadastre sua empresa
            </Typography>
          </Box>

          {sucesso ? (
            /* ── Tela de sucesso ──────────────────────────────────── */
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <CheckCircleOutlineIcon
                sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Cadastro enviado com sucesso!
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: 'text.secondary' }}>
                Recebemos sua solicitação de cadastro
                {dadosSucesso?.razaoSocial && (
                  <>
                    {' '}para <strong>{dadosSucesso.razaoSocial}</strong>
                  </>
                )}
                .
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Um email de confirmação foi enviado para{' '}
                <strong>{dadosSucesso?.email}</strong>.
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Nosso time irá analisar seus dados e você será notificado por
                email quando o cadastro for aprovado.
              </Typography>
              <Link href="/login" passHref legacyBehavior>
                <Button variant="contained" component="a" fullWidth sx={{ py: 1.5 }}>
                  Voltar para Login
                </Button>
              </Link>
            </Box>
          ) : (
            /* ── Formulário ───────────────────────────────────────── */
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{ mt: 1, width: '100%' }}
              noValidate
            >
              {erro && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {erro}
                </Alert>
              )}

              {/* Seção: Dados da Empresa */}
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, mt: 1, color: 'text.secondary', fontWeight: 600 }}
              >
                Dados da Empresa
              </Typography>
              <Divider sx={{ mb: 1 }} />

              <TextField
                margin="dense"
                fullWidth
                label="Razão Social *"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.razao_social}
                helperText={errors.razao_social?.message}
                {...register('razao_social')}
              />

              <TextField
                margin="dense"
                fullWidth
                label="Nome Fantasia"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.nome_fantasia}
                helperText={errors.nome_fantasia?.message}
                {...register('nome_fantasia')}
              />

              <TextField
                margin="dense"
                fullWidth
                label="CNPJ *"
                placeholder="XX.XXX.XXX/XXXX-XX"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.cnpj}
                helperText={errors.cnpj?.message}
                value={cnpjValue}
                onChange={handleCnpjChange}
                inputProps={{ maxLength: 18 }}
              />

              <TextField
                margin="dense"
                fullWidth
                label="Email da Empresa *"
                type="email"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.email_empresa}
                helperText={errors.email_empresa?.message}
                {...register('email_empresa')}
              />

              <TextField
                margin="dense"
                fullWidth
                label="Telefone"
                placeholder="(XX) XXXXX-XXXX"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.telefone}
                helperText={errors.telefone?.message}
                value={telefoneValue}
                onChange={handleTelefoneChange}
                inputProps={{ maxLength: 15 }}
              />

              {/* Seção: Dados do Responsável */}
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, mt: 3, color: 'text.secondary', fontWeight: 600 }}
              >
                Dados do Responsável
              </Typography>
              <Divider sx={{ mb: 1 }} />

              <TextField
                margin="dense"
                fullWidth
                label="Nome Completo *"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.nome_responsavel}
                helperText={errors.nome_responsavel?.message}
                {...register('nome_responsavel')}
              />

              <TextField
                margin="dense"
                fullWidth
                label="Email *"
                type="email"
                autoComplete="email"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.email_responsavel}
                helperText={errors.email_responsavel?.message}
                {...register('email_responsavel')}
              />

              <TextField
                margin="dense"
                fullWidth
                label="Senha *"
                type="password"
                autoComplete="new-password"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.senha}
                helperText={errors.senha?.message || 'Mínimo 8 caracteres'}
                {...register('senha')}
              />

              <TextField
                margin="dense"
                fullWidth
                label="Confirmar Senha *"
                type="password"
                autoComplete="new-password"
                variant="outlined"
                disabled={isSubmitting}
                error={!!errors.confirmar_senha}
                helperText={errors.confirmar_senha?.message}
                {...register('confirmar_senha')}
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
                  'Solicitar Cadastro'
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
                    Já tem conta? Faça login
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
