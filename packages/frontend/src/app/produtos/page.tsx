'use client';

// Força renderização no lado do cliente, evitando SSG/SSR
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  CircularProgress,
  Chip,
  TextField,
  MenuItem,
  Grid,
  InputAdornment,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Block as BlockIcon, Search as SearchIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { useProdutos } from '@/hooks/useProdutos';
import Link from 'next/link';
import { formatCurrency } from '@/utils/format';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';

export default function ProdutosPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inputSearchTerm, setInputSearchTerm] = useState<string>('');
  const queryClient = useQueryClient();
  
  // Aplicar debounce ao termo de busca
  const debouncedSearchTerm = useDebounce(inputSearchTerm, 500);
  
  // Atualizar searchTerm quando o valor debounced mudar
  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);
  
  // Valores padrão seguros para evitar erros de referência
  const { 
    produtos = [], 
    meta = { page: 1, limit: 10, itemCount: 0, pageCount: 1, hasPreviousPage: false, hasNextPage: false }, 
    isLoading = false, 
    deletarProduto, 
    reativarProduto 
  } = useProdutos(
    page + 1, 
    rowsPerPage,
    statusFilter,
    searchTerm
  ) || { produtos: [], meta: { page: 1, limit: 10, itemCount: 0, pageCount: 1, hasPreviousPage: false, hasNextPage: false }, isLoading: true };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja inativar este produto? Ele não será excluído, apenas ficará inativo.')) {
      await deletarProduto(id);
      // Força uma nova busca após inativar
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
  };
  
  const handleReativar = async (id: number) => {
    if (window.confirm('Tem certeza que deseja reativar este produto?')) {
      await reativarProduto(id);
      // Força uma nova busca após reativar
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
  };
  
  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatusFilter(event.target.value);
    setPage(0); // Resetar para a primeira página ao mudar o filtro
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputSearchTerm(event.target.value);
    setPage(0); // Resetar para a primeira página ao mudar a busca
  };

  // Renderização segura - verifica se os dados estão disponíveis
  if (isLoading) {
    return (
      <PageContainer title="Produtos">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Verificação adicional de segurança
  if (!produtos) {
    return (
      <PageContainer title="Produtos">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh', 
          flexDirection: 'column' 
        }}>
          <Typography variant="h6" gutterBottom>
            Carregando dados...
          </Typography>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Produtos"
      actions={
        <Button
          component={Link}
          href="/produtos/novo"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Novo Produto
        </Button>
      }
    >
      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Buscar produto"
              variant="outlined"
              fullWidth
              value={inputSearchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Nome do produto"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Status"
              variant="outlined"
              fullWidth
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ativo">Ativos</MenuItem>
              <MenuItem value="inativo">Inativos</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Preço</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtos.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell>{produto.nome}</TableCell>
                <TableCell>{produto.tipo_medida}</TableCell>
                <TableCell align="right">
                  {formatCurrency(produto.preco_unitario)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={produto.status}
                    color={produto.status === 'ativo' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {/* Botão de editar sempre aparece */}
                  <Tooltip title="Editar">
                    <IconButton
                      component={Link}
                      href={`/produtos/${produto.id}/editar`}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  
                  {/* Botão de inativar/reativar dependendo do status */}
                  {produto.status === 'ativo' ? (
                    <Tooltip title="Inativar">
                      <IconButton
                        onClick={() => handleDelete(produto.id)}
                        size="small"
                        color="error"
                      >
                        <BlockIcon />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Reativar">
                      <IconButton
                        onClick={() => handleReativar(produto.id)}
                        size="small"
                        color="success"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={meta?.itemCount ?? 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        labelRowsPerPage="Itens por página"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </PageContainer>
  );
}
