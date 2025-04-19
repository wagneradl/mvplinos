'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Alert,
  Collapse,
  CircularProgress,
  InputLabel,
  Select,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Produto } from '@/types/produto';
import { CreateProdutoDto, ProdutosService } from '@/services/produtos.service';
import { useSnackbar } from '@/hooks/useSnackbar';

// Schema com validações avançadas para casos de borda
const produtoSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome não pode exceder 100 caracteres')
    .refine(val => val.trim().length > 0, 'Nome não pode ser apenas espaços')
    .transform((val) => val.trim()),
  preco_unitario: z.string()
    .min(1, 'Preço é obrigatório')
    .regex(/^\d+(?:,\d{0,2})?$/, 'Formato inválido. Use 0,00')
    .refine(val => {
      const numeroLimpo = val.replace(/\s/g, '').replace(',', '.');
      const numero = Number(numeroLimpo);
      return !isNaN(numero) && numero > 0;
    }, 'Preço deve ser maior que zero')
    .refine(val => {
      const numeroLimpo = val.replace(/\s/g, '').replace(',', '.');
      const numero = Number(numeroLimpo);
      return numero <= 100000;
    }, 'Valor muito alto. Verifique se está correto')
    .transform((val) => {
      // Remove todos os espaços e converte para número
      const numeroLimpo = val.replace(/\s/g, '').replace(',', '.');
      const numero = Number(numeroLimpo);
      
      // Validação adicional para garantir número válido
      if (isNaN(numero)) {
        throw new Error('Valor inválido');
      }
      
      // Garante que temos no máximo 2 casas decimais
      return parseFloat(numero.toFixed(2));
    }),
  tipo_medida: z.enum(['un', 'kg', 'lt'], {
    errorMap: () => ({ message: 'Tipo de medida é obrigatório' }),
  }),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
});

type ProdutoFormData = z.infer<typeof produtoSchema>;

interface ProdutoFormProps {
  produto?: Produto;
  onSubmit: (data: CreateProdutoDto) => void;
  isLoading?: boolean;
}

const tiposMedida = [
  { value: 'un', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'lt', label: 'Litro' },
];

export function ProdutoForm({ produto, onSubmit: submitHandler, isLoading = false }: ProdutoFormProps) {
  // Usar diretamente o status do produto em vez de um state separado
  const [statusProduto, setStatusProduto] = useState<'ativo' | 'inativo'>(produto?.status || 'ativo');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showError, showSuccess, showWarning } = useSnackbar();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    mode: 'onChange', // Validação ao mudar qualquer campo
    defaultValues: {
      nome: produto?.nome || '',
      preco_unitario: produto?.preco_unitario?.toString().replace('.', ',') || '',
      tipo_medida: (produto?.tipo_medida as 'un' | 'kg' | 'lt') || 'un',
      status: (produto?.status as 'ativo' | 'inativo') || 'ativo',
    },
  });
  
  // Atualizar o estado quando o produto mudar (por exemplo, após reativação/inativação)
  useEffect(() => {
    if (produto?.status) {
      setStatusProduto(produto.status);
      setValue('status', produto.status);
    }
  }, [produto, setValue]);

  const onFormSubmit = handleSubmit(async (data: ProdutoFormData) => {
    try {
      setIsSubmitting(true);
      setErrorAlert(null);
      // Verificação adicional do preço
      const validacaoPreco = ProdutosService.validarPreco(parseFloat(data.preco_unitario.toString()));
      if (!validacaoPreco.valido) {
        setErrorAlert(validacaoPreco.mensagem || 'Preço inválido');
        return;
      }
      
      console.log('Dados do formulário validados:', data);
      
      // Convert string price to number for API
      const produtoData: CreateProdutoDto = {
        nome: data.nome,
        tipo_medida: data.tipo_medida,
        status: statusProduto,
        preco_unitario: parseFloat(data.preco_unitario.toString()),
      };
      
      console.log('Dados convertidos:', produtoData);
      await submitHandler(produtoData);
      // Limpa erro após sucesso
      setErrorAlert(null);
      // O feedback de sucesso já é mostrado pelo hook useProdutos
    } catch (error) {
      console.error('Erro completo:', error);
      // Mostrar erro detalhado
      if (error instanceof Error) {
        setErrorAlert(error.message);
        showError(error.message);
      } else {
        setErrorAlert('Erro ao salvar produto. Verifique os dados e tente novamente.');
        showError('Erro ao salvar produto');
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  // Formatar o preço enquanto o usuário digita
  const formatarPreco = (value: string): string => {
    // Remove tudo que não é dígito ou vírgula
    let precoLimpo = value.replace(/[^\d,]/g, '');
    // Garante que não tenha mais de uma vírgula
    const partes = precoLimpo.split(',');
    if (partes.length > 2) {
      precoLimpo = partes[0] + ',' + partes.slice(1).join('');
    }
    // Limita a 2 casas decimais
    if (partes.length === 2 && partes[1].length > 2) {
      precoLimpo = partes[0] + ',' + partes[1].substring(0, 2);
    }
    return precoLimpo;
  };

  return (
    <Box component="form" onSubmit={onFormSubmit} noValidate>
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
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Controller
            name="nome"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id="produto-nome"
                label="Nome do Produto"
                fullWidth
                error={!!errors.nome}
                helperText={errors.nome?.message}
                inputProps={{
                  maxLength: 100,
                }}
                disabled={isSubmitting}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="preco_unitario"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id="produto-preco"
                name="preco_unitario"
                label="Preço Unitário"
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                error={!!errors.preco_unitario}
                helperText={errors.preco_unitario?.message}
                disabled={isSubmitting}
                onChange={(e) => {
                  // Formatar enquanto digita
                  const formattedValue = formatarPreco(e.target.value);
                  field.onChange(formattedValue);
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="tipo_medida"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.tipo_medida} disabled={isSubmitting}>
                <TextField
                  {...field}
                  id="produto-tipo-medida"
                  name="tipo_medida"
                  select
                  label="Tipo de Medida"
                  error={!!errors.tipo_medida}
                >
                  {tiposMedida.map((tipo) => (
                    <MenuItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </MenuItem>
                  ))}
                </TextField>
                {errors.tipo_medida && (
                  <FormHelperText id="produto-tipo-medida-helper">
                    {errors.tipo_medida.message}
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="status-label">Status do Produto</InputLabel>
            <Select
              labelId="status-label"
              id="status-select"
              value={statusProduto}
              label="Status do Produto"
              onChange={(e) => {
                const newValue = e.target.value as 'ativo' | 'inativo';
                setStatusProduto(newValue);
                setValue('status', newValue);
              }}
              disabled={isSubmitting}
            >
              <MenuItem value="ativo">Ativo</MenuItem>
              <MenuItem value="inativo">Inativo</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading || isSubmitting}
              sx={{ minWidth: 120 }}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {produto ? 'Atualizar' : 'Criar'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

// Adicionar exportação default para compatibilidade
export default ProdutoForm;
