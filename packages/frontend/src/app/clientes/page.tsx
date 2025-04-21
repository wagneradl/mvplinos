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
import { Add as AddIcon, Edit as EditIcon, Block as BlockIcon, Search as SearchIcon, CheckCircle as CheckCircleIcon, People as PeopleIcon } from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { useClientes } from '@/hooks/useClientes';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useDebounce } from '@/hooks/useDebounce';

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatTelefone(telefone: string) {
  if (telefone.length === 11) {
    return telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  return telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
}

export default function ClientesPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inputSearchTerm, setInputSearchTerm] = useState<string>('');

  // Aplicar debounce ao termo de busca
  const debouncedSearchTerm = useDebounce(inputSearchTerm, 500);

  // Atualizar searchTerm quando o valor debounced mudar
  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Adiciona valores padrão seguros para evitar erros de referência
  const { 
    clientes = [], 
    meta = { page: 1, limit: 10, itemCount: 0, pageCount: 1, hasPreviousPage: false, hasNextPage: false }, 
    isLoading = false,
    error = null,
    refetch,
    deletarCliente, 
    reativarCliente 
  } = useClientes(
    page + 1, 
    rowsPerPage,
    statusFilter,
    searchTerm
  ) || { clientes: [], meta: { page: 1, limit: 10, itemCount: 0, pageCount: 1, hasPreviousPage: false, hasNextPage: false }, isLoading: true };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja inativar este cliente?')) {
      deletarCliente(id);
    }
  };

  const handleReativar = (id: number) => {
    if (window.confirm('Tem certeza que deseja reativar este cliente?')) {
      reativarCliente(id);
    }
  };

  // Renderização segura - verifica se os dados estão disponíveis
  if (isLoading) {
    return (
      <PageContainer title="Clientes">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // Tratamento de erro
  if (error) {
    return (
      <PageContainer title="Clientes">
        <ErrorState 
          message={`Erro ao carregar clientes: ${error}`}
          retryAction={refetch}
        />
      </PageContainer>
    );
  }

  // Verificação adicional de segurança
  if (!clientes) {
    return (
      <PageContainer title="Clientes">
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
      title="Clientes"
      actions={
        <Button
          component={Link}
          href="/clientes/novo"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Novo Cliente
        </Button>
      }
    >
      {/* Filtros */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Buscar cliente"
              variant="outlined"
              fullWidth
              value={inputSearchTerm}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setInputSearchTerm(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="CNPJ, Razão Social ou Nome Fantasia"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Status"
              variant="outlined"
              fullWidth
              value={statusFilter}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setStatusFilter(event.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ativo">Ativos</MenuItem>
              <MenuItem value="inativo">Inativos</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>
      
      <TableContainer>
        {clientes.length === 0 ? (
          <EmptyState 
            title="Nenhum cliente encontrado"
            message="Não há clientes registrados com os filtros atuais. Você pode adicionar um novo cliente usando o botão 'Novo Cliente'."
            icon={<PeopleIcon fontSize="large" />}
            sx={{ py: 6 }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>CNPJ</TableCell>
                <TableCell>Razão Social</TableCell>
                <TableCell>Nome Fantasia</TableCell>
                <TableCell>Contato</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>{formatCNPJ(cliente.cnpj)}</TableCell>
                  <TableCell>{cliente.razao_social}</TableCell>
                  <TableCell>{cliente.nome_fantasia}</TableCell>
                  <TableCell>
                    <Box>
                      <div>{formatTelefone(cliente.telefone)}</div>
                      <div style={{ color: 'gray', fontSize: '0.875rem' }}>{cliente.email}</div>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cliente.status}
                      color={cliente.status === 'ativo' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {/* Botão de editar sempre aparece */}
                    <Tooltip title="Editar">
                      <IconButton
                        component={Link}
                        href={`/clientes/${cliente.id}/editar`}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Mostra o botão de inativar ou reativar, dependendo do status atual */}
                    {cliente.status === 'ativo' ? (
                      <Tooltip title="Inativar">
                        <IconButton 
                          size="small"
                          onClick={() => handleDelete(cliente.id)}
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reativar">
                        <IconButton 
                          size="small"
                          onClick={() => handleReativar(cliente.id)}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <TablePagination
        component="div"
        count={meta?.itemCount || 0}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Itens por página"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : 'mais de ' + to}`
        }
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </PageContainer>
  );
}
