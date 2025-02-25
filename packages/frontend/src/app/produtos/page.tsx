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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { PageContainer } from '@/components/PageContainer';
import { useProdutos } from '@/hooks/useProdutos';
import Link from 'next/link';
import { formatCurrency } from '@/utils/format';
import { useQueryClient } from '@tanstack/react-query';

export default function ProdutosPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const queryClient = useQueryClient();
  const { produtos, meta, isLoading, deletarProduto } = useProdutos(page + 1, rowsPerPage);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      await deletarProduto(id);
      // Força uma nova busca após deletar
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    }
  };

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
                      <Box
                        sx={{
                          backgroundColor:
                            produto.status === 'ativo' ? 'success.main' : 'error.main',
                          color: 'white',
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          display: 'inline-block',
                        }}
                      >
                        {produto.status}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton
                          component={Link}
                          href={`/produtos/${produto.id}/editar`}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          onClick={() => handleDelete(produto.id)}
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
            count={meta?.itemCount ?? 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Itens por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </>
      )}
    </PageContainer>
  );
}
