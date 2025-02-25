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
  Typography,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Cliente } from '@/types/pedido';
import { useSnackbar } from '@/hooks/useSnackbar';
import { ClientesService } from '@/services/clientes.service';

// Schema com validações aprimoradas
const clienteSchema = z.object({
  cnpj: z.string()
    .min(18, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
    .max(18, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX'),
  razao_social: z.string()
    .min(1, 'Razão Social é obrigatória')
    .max(100, 'Razão Social deve ter no máximo 100 caracteres')
    .refine(val => val.trim().length > 0, 'Razão Social não pode ser apenas espaços'),
  nome_fantasia: z.string()
    .min(1, 'Nome Fantasia é obrigatório')
    .max(100, 'Nome Fantasia deve ter no máximo 100 caracteres')
    .refine(val => val.trim().length > 0, 'Nome Fantasia não pode ser apenas espaços'),
  email: z.string()
    .email('Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  telefone: z.string()
    .min(14, 'Telefone deve estar no formato (XX) XXXXX-XXXX')
    .max(15, 'Telefone deve estar no formato (XX) XXXXX-XXXX')
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (XX) XXXXX-XXXX'),
  status: z.string(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClienteFormProps {
  cliente?: Cliente;
  onSubmit: (data: ClienteFormData) => void;
  isLoading?: boolean;
}

// Função para formatar CNPJ enquanto o usuário digita
function formatarCNPJ(value: string): string {
  // Remove tudo que não é dígito
  const cnpjSoNumeros = value.replace(/\D/g, '');
  
  if (cnpjSoNumeros.length === 0) return '';
  
  // Aplicar máscara
  let cnpjFormatado = '';
  
  if (cnpjSoNumeros.length > 0) {
    cnpjFormatado = cnpjSoNumeros.substring(0, 2);
  }
  if (cnpjSoNumeros.length > 2) {
    cnpjFormatado += '.' + cnpjSoNumeros.substring(2, 5);
  }
  if (cnpjSoNumeros.length > 5) {
    cnpjFormatado += '.' + cnpjSoNumeros.substring(5, 8);
  }
  if (cnpjSoNumeros.length > 8) {
    cnpjFormatado += '/' + cnpjSoNumeros.substring(8, 12);
  }
  if (cnpjSoNumeros.length > 12) {
    cnpjFormatado += '-' + cnpjSoNumeros.substring(12, 14);
  }
  
  return cnpjFormatado;
}

// Função para formatar telefone enquanto o usuário digita
function formatarTelefone(value: string): string {
  // Remove tudo que não é dígito
  const telefoneSoNumeros = value.replace(/\D/g, '');
  
  if (telefoneSoNumeros.length === 0) return '';
  
  // Aplicar máscara
  let telefoneFormatado = '';
  
  if (telefoneSoNumeros.length > 0) {
    telefoneFormatado = '(' + telefoneSoNumeros.substring(0, 2);
  }
  if (telefoneSoNumeros.length > 2) {
    telefoneFormatado += ') ' + telefoneSoNumeros.substring(2, 7);
  }
  if (telefoneSoNumeros.length > 7) {
    telefoneFormatado += '-' + telefoneSoNumeros.substring(7, 11);
  }
  
  return telefoneFormatado;
}

export function ClienteForm({ cliente, onSubmit, isLoading = false }: ClienteFormProps) {
  const [isAtivo, setIsAtivo] = useState<boolean>(cliente?.status !== 'inativo');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cnpjDuplicadoAlerta, setCnpjDuplicadoAlerta] = useState(false);
  const [isSoftDeleted, setIsSoftDeleted] = useState<boolean>(false);
  const { showError, showWarning } = useSnackbar();
  
  // Verificar se o cliente foi soft-deleted e sincronizar o estado do switch
  useEffect(() => {
    if (cliente) {
      // Se o cliente tem deleted_at, ele foi soft-deleted
      setIsSoftDeleted(!!cliente.deleted_at);
      
      // Sincronizar o estado do switch com o status do cliente
      setIsAtivo(cliente.status === 'ativo');
      
      console.log('ClienteForm: cliente atualizado', {
        id: cliente.id,
        status: cliente.status,
        deleted_at: cliente.deleted_at,
        isAtivo: cliente.status === 'ativo'
      });
    }
  }, [cliente]);
  
  // Adicionar um efeito para forçar a atualização do estado quando o formulário é renderizado
  useEffect(() => {
    // Este efeito garante que o estado do switch seja sempre sincronizado
    // mesmo quando o cliente é reativado em outra parte da aplicação
    if (cliente) {
      setIsAtivo(cliente.status === 'ativo');
    }
  }, [cliente?.status]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    mode: 'onChange', // Validação ao mudar qualquer campo
    defaultValues: {
      cnpj: formatarCNPJ(cliente?.cnpj || ''),
      razao_social: cliente?.razao_social || '',
      nome_fantasia: cliente?.nome_fantasia || '',
      email: cliente?.email || '',
      telefone: formatarTelefone(cliente?.telefone || ''),
      status: cliente?.status || 'ativo',
    },
  });
  
  // Efeito para sincronizar o status do formulário com o status do cliente
  useEffect(() => {
    if (cliente) {
      console.log('Sincronizando status do formulário:', {
        clienteStatus: cliente.status,
        formStatus: watch('status')
      });
      
      // Forçar a atualização do campo status no formulário
      setValue('status', cliente.status);
      
      // Atualizar também o estado local
      setIsAtivo(cliente.status === 'ativo');
    }
  }, [cliente, setValue, watch]);

  // Observar o campo CNPJ para validação de duplicidade
  const cnpj = watch('cnpj');
  
  // Efeito para validar CNPJ duplicado
  useEffect(() => {
    const validarCNPJDuplicado = async () => {
      if (cnpj && cnpj.length === 18) { // Só valida se tiver o formato completo
        try {
          const isDuplicado = await ClientesService.verificarCNPJDuplicado(
            cnpj, 
            cliente?.id
          );
          
          setCnpjDuplicadoAlerta(isDuplicado);
          
          if (isDuplicado) {
            showWarning('Já existe um cliente com este CNPJ');
          }
        } catch (error) {
          // Ignora erros de validação - log apenas para diagnóstico
          console.error('Erro ao verificar CNPJ duplicado:', error);
        }
      } else {
        setCnpjDuplicadoAlerta(false);
      }
    };
    
    // Debounce para não fazer muitas requisições
    const timeoutId = setTimeout(validarCNPJDuplicado, 500);
    return () => clearTimeout(timeoutId);
  }, [cnpj, cliente?.id, showWarning]);

  const onFormSubmit = async (data: ClienteFormData) => {
    try {
      setIsSubmitting(true);
      setErrorAlert(null);
      
      // Validação adicional para duplicidade de CNPJ
      if (cnpjDuplicadoAlerta) {
        setErrorAlert('Já existe um cliente cadastrado com este CNPJ. Por favor, verifique.');
        return;
      }
      
      // Validações adicionais específicas
      try {
        ClientesService.validarCNPJ(data.cnpj);
        ClientesService.validarTelefone(data.telefone);
        ClientesService.validarEmail(data.email);
      } catch (error) {
        if (error instanceof Error) {
          setErrorAlert(error.message);
          return;
        }
      }
      
      const clienteData = {
        ...data,
        status: isAtivo ? 'ativo' : 'inativo',
        // Garantir que não há espaços extras
        razao_social: data.razao_social.trim(),
        nome_fantasia: data.nome_fantasia.trim(),
        email: data.email.trim()
      };
      
      await onSubmit(clienteData);
      
      // Não mostramos notificação de sucesso aqui, pois já é mostrada no hook useClientes
    } catch (error) {
      console.error('Erro ao processar formulário:', error);
      
      // Mostrar erro detalhado
      if (error instanceof Error) {
        setErrorAlert(error.message);
        showError(error.message);
      } else {
        setErrorAlert('Erro ao salvar cliente. Verifique os dados e tente novamente.');
        showError('Erro ao salvar cliente');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
      {/* Alerta de erro */}
      <Collapse in={!!errorAlert}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setErrorAlert(null)}
        >
          {errorAlert}
        </Alert>
      </Collapse>
      
      {/* Alerta de CNPJ duplicado */}
      <Collapse in={cnpjDuplicadoAlerta}>
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
        >
          Este CNPJ já está cadastrado no sistema. Verifique a lista de clientes inativos, pois o cliente pode ter sido excluído anteriormente.
        </Alert>
      </Collapse>
      
      {/* Alerta para cliente soft-deleted */}
      <Collapse in={isSoftDeleted}>
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
        >
          Este cliente foi excluído anteriormente. Para reativá-lo, selecione o status "Ativo" e salve as alterações.
        </Alert>
      </Collapse>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="cnpj"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="CNPJ"
                fullWidth
                onChange={(e) => field.onChange(formatarCNPJ(e.target.value))}
                error={!!errors.cnpj || cnpjDuplicadoAlerta}
                helperText={errors.cnpj?.message || (cnpjDuplicadoAlerta ? 'CNPJ já cadastrado' : 'Formato: XX.XXX.XXX/XXXX-XX')}
                inputProps={{
                  maxLength: 18
                }}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="telefone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Telefone"
                fullWidth
                onChange={(e) => field.onChange(formatarTelefone(e.target.value))}
                error={!!errors.telefone}
                helperText={errors.telefone?.message || 'Formato: (XX) XXXXX-XXXX'}
                inputProps={{
                  maxLength: 15
                }}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="razao_social"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Razão Social"
                fullWidth
                error={!!errors.razao_social}
                helperText={errors.razao_social?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="nome_fantasia"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nome Fantasia"
                fullWidth
                error={!!errors.nome_fantasia}
                helperText={errors.nome_fantasia?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
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

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="status-label">Status do Cliente</InputLabel>
            <Select
              labelId="status-label"
              id="status-select"
              value={isAtivo ? 'ativo' : 'inativo'}
              label="Status do Cliente"
              onChange={(e) => {
                const newValue = e.target.value as string;
                setIsAtivo(newValue === 'ativo');
                setValue('status', newValue);
              }}
              disabled={isSubmitting}
            >
              <MenuItem value="ativo">Ativo</MenuItem>
              <MenuItem value="inativo">Inativo</MenuItem>
            </Select>
          </FormControl>
          {isSoftDeleted && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              Este cliente foi excluído anteriormente. Para reativá-lo, selecione "Ativo" e salve as alterações.
            </Typography>
          )}
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || isSubmitting || cnpjDuplicadoAlerta}
              sx={{ minWidth: 120 }}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {cliente ? 'Atualizar' : 'Criar'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
