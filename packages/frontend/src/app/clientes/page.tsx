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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
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
  const { clientes, meta, isLoading, deletarCliente } = useClientes(page + 1, rowsPerPage);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      deletarCliente(id);
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
                      <Tooltip title="Editar">
                        <IconButton
                          component={Link}
                          href={`/clientes/${cliente.id}/editar`}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          onClick={() => handleDelete(cliente.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={meta?.total || -1}
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
