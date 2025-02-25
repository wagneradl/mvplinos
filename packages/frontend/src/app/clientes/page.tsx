'use client';

import { useState } from 'react';
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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Block as BlockIcon, Search as SearchIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { useClientes } from '@/hooks/useClientes';
import Link from 'next/link';

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
  
  const { clientes, meta, isLoading, deletarCliente, reativarCliente } = useClientes(
    page + 1, 
    rowsPerPage,
    statusFilter,
    searchTerm
  );

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja inativar este cliente? Ele não será excluído, apenas ficará inativo.')) {
      deletarCliente(id);
    }
  };
  
  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatusFilter(event.target.value);
    setPage(0); // Resetar para a primeira página ao mudar o filtro
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Resetar para a primeira página ao mudar a busca
  };
  
  const handleReactivate = async (id: number) => {
    if (window.confirm('Tem certeza que deseja reativar este cliente?')) {
      reativarCliente(id);
    }
  };

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
              value={searchTerm}
              onChange={handleSearchChange}
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
              onChange={handleStatusChange}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ativo">Ativos</MenuItem>
              <MenuItem value="inativo">Inativos</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer>
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
                {clientes?.map((cliente) => (
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
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Botão de inativar/reativar dependendo do status */}
                      {cliente.status === 'ativo' ? (
                        <Tooltip title="Inativar">
                          <IconButton
                            onClick={() => handleDelete(cliente.id)}
                            size="small"
                            color="error"
                          >
                            <BlockIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reativar">
                          <IconButton
                            onClick={() => handleReactivate(cliente.id)}
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
            count={meta?.itemCount || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Itens por página"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : 'mais de ' + to}`
            }
          />
        </>
      )}
    </PageContainer>
  );
}
