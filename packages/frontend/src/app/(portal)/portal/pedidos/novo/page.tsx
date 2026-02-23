'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProdutos } from '@/hooks/useProdutos';
import { usePedidos } from '@/hooks/usePedidos';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { PageContainer } from '@/components/PageContainer';
import { Produto } from '@/types/produto';

const TIPO_MEDIDA_LABELS: Record<string, string> = {
  un: 'un',
  kg: 'kg',
  lt: 'lt',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

interface ProdutoComQuantidade extends Produto {
  quantidade: number;
}

export default function NovoPedidoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [observacoes, setObservacoes] = useState('');
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState<'rascunho' | 'enviar' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch all active products
  const { produtos, isLoading: loadingProdutos } = useProdutos(
    1,
    200,
    'ativo',
    debouncedSearch || undefined
  );

  // Pedidos hook with disabled notifications (we handle our own)
  const { criarPedido, atualizarStatus } = usePedidos({ disableNotifications: true });

  // Get quantity for a product
  const getQtd = (produtoId: number) => quantidades[produtoId] || 0;

  // Update quantity
  const setQtd = (produtoId: number, value: number) => {
    const newVal = Math.max(0, Math.floor(value));
    setQuantidades((prev) => {
      if (newVal === 0) {
        const { [produtoId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [produtoId]: newVal };
    });
  };

  const increment = (produtoId: number) => {
    setQtd(produtoId, getQtd(produtoId) + 1);
  };

  const decrement = (produtoId: number) => {
    setQtd(produtoId, getQtd(produtoId) - 1);
  };

  // Selected items (quantity > 0)
  const selectedItems = useMemo(() => {
    return Object.entries(quantidades)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const produto = produtos.find((p) => p.id === Number(id));
        return produto ? { ...produto, quantidade: qty } : null;
      })
      .filter(Boolean) as ProdutoComQuantidade[];
  }, [quantidades, produtos]);

  // Totals
  const totalItens = selectedItems.length;
  const totalQuantidade = selectedItems.reduce((sum, item) => sum + item.quantidade, 0);
  const totalValor = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + item.preco_unitario * item.quantidade,
      0
    );
  }, [selectedItems]);

  // Validation
  const isValid = selectedItems.length > 0;

  // Submit handler
  const handleSubmit = async (mode: 'rascunho' | 'enviar') => {
    if (!isValid || !usuario?.clienteId) return;

    setSubmitting(mode);
    setSubmitError(null);

    try {
      // Build payload matching backend DTO
      const payload = {
        cliente_id: usuario.clienteId,
        itens: selectedItems.map((item) => ({
          produto_id: item.id,
          quantidade: item.quantidade,
        })),
        observacoes: observacoes.trim() || undefined,
      };

      // Create pedido (backend sets status to RASCUNHO for CLIENTE users)
      const novoPedido = await criarPedido(payload as any);

      // If "Enviar Pedido", transition from RASCUNHO to PENDENTE
      if (mode === 'enviar' && novoPedido?.id) {
        await atualizarStatus({
          id: novoPedido.id,
          novoStatus: 'PENDENTE',
        });
      }

      // Redirect to listing with success
      router.push('/portal/pedidos');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Erro ao criar pedido');
      setSubmitError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <PageContainer
      title="Novo Pedido"
      actions={
        <Button
          component={Link}
          href="/portal/pedidos"
          startIcon={<BackIcon />}
          sx={{ textTransform: 'none' }}
        >
          Voltar
        </Button>
      }
    >
      {/* Error alert */}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {/* Search */}
      <TextField
        placeholder="Buscar produto por nome..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* Products table */}
      <TableContainer sx={{ maxHeight: 400, mb: 3 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Produto</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Preco
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Quantidade
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Subtotal
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingProdutos
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : produtos.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {debouncedSearch
                          ? 'Nenhum produto encontrado para a busca.'
                          : 'Nenhum produto disponivel no momento.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
                : produtos.map((produto) => {
                    const qty = getQtd(produto.id);
                    const subtotal = produto.preco_unitario * qty;
                    const isSelected = qty > 0;
                    return (
                      <TableRow
                        key={produto.id}
                        sx={{
                          bgcolor: isSelected ? 'action.selected' : undefined,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                            {produto.nome}
                          </Typography>
                          {produto.descricao && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {produto.descricao}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatCurrency(produto.preco_unitario)}
                            <Typography component="span" variant="caption" color="text.secondary">
                              /{TIPO_MEDIDA_LABELS[produto.tipo_medida] || produto.tipo_medida}
                            </Typography>
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => decrement(produto.id)}
                              disabled={qty === 0}
                              color="primary"
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <TextField
                              value={qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) setQtd(produto.id, val);
                              }}
                              size="small"
                              inputProps={{
                                min: 0,
                                style: {
                                  textAlign: 'center',
                                  width: 48,
                                  padding: '4px 0',
                                },
                              }}
                              variant="outlined"
                            />
                            <IconButton
                              size="small"
                              onClick={() => increment(produto.id)}
                              color="primary"
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={isSelected ? 600 : 400}
                            color={isSelected ? 'primary.main' : 'text.secondary'}
                          >
                            {isSelected ? formatCurrency(subtotal) : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ mb: 3 }} />

      {/* Summary and observacoes */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Observacoes */}
        <Box sx={{ flex: 1 }}>
          <TextField
            label="Observacoes (opcional)"
            placeholder="Ex: Entregar pela porta dos fundos, horario preferencial..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Box>

        {/* Order summary */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            minWidth: { md: 280 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CartIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Resumo do Pedido
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Produtos:
            </Typography>
            <Typography variant="body2">{totalItens}</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Itens totais:
            </Typography>
            <Typography variant="body2">{totalQuantidade}</Typography>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Total:
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {formatCurrency(totalValor)}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Action buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          mt: 3,
        }}
      >
        <Button
          variant="outlined"
          startIcon={
            submitting === 'rascunho' ? <CircularProgress size={18} /> : <SaveIcon />
          }
          onClick={() => handleSubmit('rascunho')}
          disabled={!isValid || !!submitting}
          sx={{ textTransform: 'none' }}
        >
          {submitting === 'rascunho' ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>

        <Button
          variant="contained"
          startIcon={
            submitting === 'enviar' ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
          }
          onClick={() => handleSubmit('enviar')}
          disabled={!isValid || !!submitting}
          sx={{ textTransform: 'none' }}
        >
          {submitting === 'enviar' ? 'Enviando...' : 'Enviar Pedido'}
        </Button>
      </Box>

      {/* Validation hint */}
      {!isValid && !loadingProdutos && produtos.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
          Selecione pelo menos 1 produto para continuar.
        </Typography>
      )}
    </PageContainer>
  );
}
