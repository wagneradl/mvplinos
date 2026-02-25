'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Alert,
  Collapse,
  CircularProgress,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  ListSubheader,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Usuario } from '@/types/usuario';
import { usePapeis } from '@/hooks/useUsuarios';
import { ClientesService } from '@/services/clientes.service';
import { loggers } from '@/utils/logger';

const logger = loggers.forms;

// Schema base para criação
const createSchema = z
  .object({
    nome: z
      .string()
      .min(3, 'Nome deve ter pelo menos 3 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    email: z
      .string()
      .min(1, 'Email é obrigatório')
      .email('Email inválido'),
    senha: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(
        /(?=.*[a-zA-Z])(?=.*[0-9])/,
        'Deve conter letras e números',
      ),
    confirmarSenha: z.string().min(1, 'Confirme a senha'),
    papel_id: z.number().positive('Selecione um papel'),
    cliente_id: z.number().optional(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

// Schema para edição (senha opcional)
const editSchema = z
  .object({
    nome: z
      .string()
      .min(3, 'Nome deve ter pelo menos 3 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    email: z
      .string()
      .min(1, 'Email é obrigatório')
      .email('Email inválido'),
    senha: z
      .string()
      .transform((val) => (val === '' ? undefined : val))
      .pipe(
        z
          .string()
          .min(8, 'Mínimo 8 caracteres')
          .regex(
            /(?=.*[a-zA-Z])(?=.*[0-9])/,
            'Deve conter letras e números',
          )
          .optional(),
      ),
    confirmarSenha: z.string().optional(),
    papel_id: z.number().positive('Selecione um papel'),
    cliente_id: z.number().optional(),
    status: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.senha && data.senha !== data.confirmarSenha) {
        return false;
      }
      return true;
    },
    {
      message: 'As senhas não coincidem',
      path: ['confirmarSenha'],
    },
  );

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;
type UsuarioFormData = CreateFormData | EditFormData;

interface UsuarioFormProps {
  usuario?: Usuario;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function UsuarioForm({ usuario, onSubmit, isLoading = false }: UsuarioFormProps) {
  const isEditing = !!usuario;
  const router = useRouter();
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { papeis, isLoading: papeisLoading } = usePapeis();

  // Buscar lista de clientes ativos para o dropdown
  const { data: clientes = [], isLoading: clientesLoading } = useQuery({
    queryKey: ['clientes-ativos-select'],
    queryFn: () => ClientesService.listarTodosClientes(100, 'ativo'),
    staleTime: 30000,
  });

  const schema = isEditing ? editSchema : createSchema;

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
    setValue,
    clearErrors,
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      nome: usuario?.nome || '',
      email: usuario?.email || '',
      senha: '',
      confirmarSenha: '',
      papel_id: usuario?.papel_id || 0,
      cliente_id: usuario?.cliente_id || undefined,
      ...(isEditing ? { status: usuario?.status || 'ativo' } : {}),
    },
  });

  const senhaValue = watch('senha');
  const papelIdValue = watch('papel_id');

  // Descrição do papel selecionado
  const papelSelecionado = papeis.find((p) => p.id === papelIdValue);
  const isPapelCliente = papelSelecionado?.tipo === 'CLIENTE';

  // Quando o papel muda de CLIENTE para INTERNO, limpar cliente_id
  useEffect(() => {
    if (papelSelecionado && papelSelecionado.tipo === 'INTERNO') {
      setValue('cliente_id', undefined);
      clearErrors('cliente_id');
    }
  }, [papelSelecionado, setValue, clearErrors]);

  // Agrupar papéis por tipo
  const papeisInternos = papeis.filter((p) => p.tipo === 'INTERNO');
  const papeisCliente = papeis.filter((p) => p.tipo === 'CLIENTE');

  const onFormSubmit = async (data: UsuarioFormData) => {
    try {
      setIsSubmitting(true);
      setErrorAlert(null);

      // Validar cliente_id para papel CLIENTE
      const papelDoForm = papeis.find((p) => p.id === data.papel_id);
      if (papelDoForm?.tipo === 'CLIENTE' && !data.cliente_id) {
        setError('cliente_id', { message: 'Selecione um cliente' });
        setIsSubmitting(false);
        return;
      }

      // Montar payload sem confirmarSenha
      const payload: Record<string, unknown> = {
        nome: data.nome.trim(),
        email: data.email.trim(),
        papel_id: data.papel_id,
      };

      // cliente_id: enviar se papel CLIENTE, enviar null se INTERNO (para limpar no backend)
      if (papelDoForm?.tipo === 'CLIENTE' && data.cliente_id) {
        payload.cliente_id = data.cliente_id;
      } else if (isEditing) {
        // Na edição, enviar null explicitamente para limpar o vínculo
        payload.cliente_id = null;
      }

      // Senha: obrigatória no criar, opcional no editar
      if (data.senha) {
        payload.senha = data.senha;
      }

      // Status: só na edição
      if (isEditing && 'status' in data && data.status) {
        payload.status = data.status;
      }

      logger.debug('Dados do formulário de usuário:', {
        ...payload,
        senha: payload.senha ? '[REDACTED]' : undefined,
      });

      await onSubmit(payload);
    } catch (error: unknown) {
      logger.error('Erro ao processar formulário de usuário:', error);

      // Tratar erro de email duplicado
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      if (
        axiosError?.response?.status === 409 ||
        axiosError?.response?.status === 400
      ) {
        const message = axiosError.response.data?.message || '';
        if (message.toLowerCase().includes('email')) {
          setError('email', { message: 'Este email já está cadastrado' });
          return;
        }
        // Tratar erros de vínculo cliente do backend
        if (message.toLowerCase().includes('cliente')) {
          setError('cliente_id', { message });
          return;
        }
      }

      if (error instanceof Error) {
        setErrorAlert(error.message);
      } else {
        setErrorAlert('Erro ao salvar usuário. Verifique os dados e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
      {/* Alerta de erro */}
      <Collapse in={!!errorAlert}>
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorAlert(null)}>
          {errorAlert}
        </Alert>
      </Collapse>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="nome"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nome"
                fullWidth
                error={!!errors.nome}
                helperText={errors.nome?.message}
                disabled={isSubmitting}
                inputProps={{ maxLength: 100 }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email"
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="senha"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={isEditing ? 'Nova Senha' : 'Senha'}
                type="password"
                fullWidth
                error={!!errors.senha}
                helperText={
                  errors.senha?.message ||
                  (isEditing
                    ? 'Deixe em branco para manter a senha atual'
                    : 'Mínimo 8 caracteres, com letras e números')
                }
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        {(!isEditing || senhaValue) && (
          <Grid item xs={12} sm={6}>
            <Controller
              name="confirmarSenha"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Confirmar Senha"
                  type="password"
                  fullWidth
                  error={!!errors.confirmarSenha}
                  helperText={errors.confirmarSenha?.message}
                  disabled={isSubmitting}
                />
              )}
            />
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <Controller
            name="papel_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.papel_id} disabled={isSubmitting || papeisLoading}>
                <InputLabel id="papel-label">Papel</InputLabel>
                <Select
                  {...field}
                  labelId="papel-label"
                  label="Papel"
                  value={field.value || 0}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                >
                  <MenuItem value={0} disabled>
                    {papeisLoading ? 'Carregando...' : 'Selecione um papel'}
                  </MenuItem>
                  {papeisInternos.length > 0 && (
                    <ListSubheader>Internos</ListSubheader>
                  )}
                  {papeisInternos.map((papel) => (
                    <MenuItem key={papel.id} value={papel.id}>
                      {papel.nome}
                    </MenuItem>
                  ))}
                  {papeisCliente.length > 0 && (
                    <ListSubheader>Cliente</ListSubheader>
                  )}
                  {papeisCliente.map((papel) => (
                    <MenuItem key={papel.id} value={papel.id}>
                      {papel.nome}
                    </MenuItem>
                  ))}
                </Select>
                {errors.papel_id ? (
                  <Alert severity="error" sx={{ mt: 0.5, py: 0 }} variant="standard" icon={false}>
                    {errors.papel_id.message}
                  </Alert>
                ) : papelSelecionado?.descricao ? (
                  <FormHelperText>{papelSelecionado.descricao}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
        </Grid>

        {/* Seletor de Cliente — visível apenas para papéis do tipo CLIENTE */}
        {isPapelCliente && (
          <Grid item xs={12} sm={6}>
            <Controller
              name="cliente_id"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.cliente_id}
                  disabled={isSubmitting || clientesLoading}
                >
                  <InputLabel id="cliente-label">Cliente *</InputLabel>
                  <Select
                    {...field}
                    labelId="cliente-label"
                    label="Cliente *"
                    value={field.value || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      field.onChange(val === 0 ? undefined : val);
                    }}
                  >
                    <MenuItem value={0} disabled>
                      {clientesLoading ? 'Carregando...' : 'Selecione um cliente'}
                    </MenuItem>
                    {clientes.map((cliente) => (
                      <MenuItem key={cliente.id} value={cliente.id}>
                        {cliente.nome_fantasia || cliente.razao_social}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.cliente_id ? (
                    <FormHelperText error>{errors.cliente_id.message}</FormHelperText>
                  ) : (
                    <FormHelperText>
                      Obrigatório para usuários com papel do tipo Cliente
                    </FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>
        )}

        {isEditing && (
          <Grid item xs={12} sm={6}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth disabled={isSubmitting}>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    {...field}
                    labelId="status-label"
                    label="Status"
                    value={field.value || 'ativo'}
                  >
                    <MenuItem value="ativo">Ativo</MenuItem>
                    <MenuItem value="inativo">Inativo</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/usuarios')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || isSubmitting}
              sx={{ minWidth: 120 }}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default UsuarioForm;
