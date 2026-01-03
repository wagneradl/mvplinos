'use client';

// SSR Safe - Modificado para funcionar com Next.js SSR
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Produto } from '@/types/produto';

interface ProdutoCardProps {
  produto: Produto;
  onEdit: (produto: Produto) => void;
  onDelete: (id: number) => void;
}

export function ProdutoCard({ produto, onEdit, onDelete }: ProdutoCardProps) {
  const [openDialog, setOpenDialog] = useState(false);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleDelete = () => {
    onDelete(produto.id);
    handleCloseDialog();
  };

  const handleEdit = () => {
    onEdit(produto);
  };

  const formatarPreco = (preco: number) => {
    return preco
      .toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      .replace('R$', 'R$ ');
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" component="div">
            {produto.nome}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {produto.descricao}
          </Typography>
          <Typography variant="body1" color="text.primary">
            {formatarPreco(produto.preco_unitario)}
          </Typography>
        </CardContent>
        <CardActions>
          <Button size="small" onClick={handleEdit}>
            Editar
          </Button>
          <Button size="small" color="error" onClick={handleOpenDialog}>
            Excluir
          </Button>
        </CardActions>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o produto &quot;{produto.nome}&quot;? Esta ação não pode
            ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} data-testid="cancel-delete" color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" autoFocus data-testid="confirm-delete">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// Adicionar exportação default para compatibilidade
export default ProdutoCard;
