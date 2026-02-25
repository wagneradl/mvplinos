'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Inventory2 as ProdutoIcon,
  SortByAlpha as SortIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useProdutos } from '@/hooks/useProdutos';
import { Produto } from '@/types/produto';
import { useDebounce } from '@/hooks/useDebounce';

// ── Helpers ───────────────────────────────────────────────────────────

const TIPO_MEDIDA_LABELS: Record<string, string> = {
  un: 'unidade',
  kg: 'kg',
  lt: 'litro',
};

function formatTipoMedida(tipo: string): string {
  return TIPO_MEDIDA_LABELS[tipo] || tipo;
}

function formatPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Gera uma cor baseada no nome do produto para o avatar placeholder */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

type SortOption = 'nome_asc' | 'nome_desc' | 'preco_asc' | 'preco_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'nome_asc', label: 'Nome A-Z' },
  { value: 'nome_desc', label: 'Nome Z-A' },
  { value: 'preco_asc', label: 'Menor preço' },
  { value: 'preco_desc', label: 'Maior preço' },
];

// ── Componente ────────────────────────────────────────────────────────

export default function CatalogoPage() {
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('nome_asc');
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  // Buscar todos os produtos ativos (limite alto para catálogo)
  const { produtos, isLoading, meta } = useProdutos(1, 100, 'ativo', debouncedSearch);

  // Ordenar client-side
  const produtosOrdenados = useMemo(() => {
    const sorted = [...produtos];
    switch (sortBy) {
      case 'nome_asc':
        sorted.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        break;
      case 'nome_desc':
        sorted.sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR'));
        break;
      case 'preco_asc':
        sorted.sort((a, b) => a.preco_unitario - b.preco_unitario);
        break;
      case 'preco_desc':
        sorted.sort((a, b) => b.preco_unitario - a.preco_unitario);
        break;
    }
    return sorted;
  }, [produtos, sortBy]);

  // Loading
  if (isLoading) {
    return (
      <PageContainer title="Catálogo de Produtos">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Catálogo de Produtos">
      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              label="Buscar produto"
              variant="outlined"
              fullWidth
              size="small"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Digite o nome do produto..."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Ordenar por"
              variant="outlined"
              fullWidth
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SortIcon />
                  </InputAdornment>
                ),
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: { md: 'right' } }}>
              {meta?.itemCount ?? produtosOrdenados.length} produto{(meta?.itemCount ?? produtosOrdenados.length) !== 1 ? 's' : ''} disponíve{(meta?.itemCount ?? produtosOrdenados.length) !== 1 ? 'is' : 'l'}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Grid de Produtos */}
      {produtosOrdenados.length === 0 ? (
        <EmptyState
          title="Nenhum produto disponível no momento"
          message="Nosso catálogo está sendo atualizado. Volte em breve!"
          icon={<ProdutoIcon fontSize="large" />}
          sx={{ py: 8 }}
        />
      ) : (
        <Grid container spacing={3}>
          {produtosOrdenados.map((produto) => (
            <Grid item xs={12} sm={6} md={4} key={produto.id}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                {/* Placeholder com Avatar */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    py: 3,
                    bgcolor: 'grey.50',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 72,
                      height: 72,
                      bgcolor: stringToColor(produto.nome),
                      fontSize: '1.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {produto.nome.charAt(0).toUpperCase()}
                  </Avatar>
                </Box>

                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.05rem' }}
                    noWrap
                  >
                    {produto.nome}
                  </Typography>

                  {produto.descricao && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {produto.descricao}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1 }}>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                      {formatPreco(produto.preco_unitario)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      /{formatTipoMedida(produto.tipo_medida)}
                    </Typography>
                  </Box>

                  <Chip
                    label={formatTipoMedida(produto.tipo_medida)}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    onClick={() => setSelectedProduto(produto)}
                  >
                    Ver Detalhes
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Dialog: Detalhes do Produto ─────────────────────────────── */}
      <Dialog
        open={!!selectedProduto}
        onClose={() => setSelectedProduto(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedProduto && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pr: 1,
              }}
            >
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                {selectedProduto.nome}
              </Typography>
              <IconButton size="small" onClick={() => setSelectedProduto(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              {/* Avatar grande */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 3,
                  py: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                }}
              >
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: stringToColor(selectedProduto.nome),
                    fontSize: '2.5rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedProduto.nome.charAt(0).toUpperCase()}
                </Avatar>
              </Box>

              {/* Descrição */}
              {selectedProduto.descricao && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Descrição
                  </Typography>
                  <Typography variant="body1">{selectedProduto.descricao}</Typography>
                </Box>
              )}

              {/* Detalhes */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Unidade de medida
                  </Typography>
                  <Chip label={formatTipoMedida(selectedProduto.tipo_medida)} size="small" />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Preço unitário
                  </Typography>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                    {formatPreco(selectedProduto.preco_unitario)}/{formatTipoMedida(selectedProduto.tipo_medida)}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setSelectedProduto(null)}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
}
