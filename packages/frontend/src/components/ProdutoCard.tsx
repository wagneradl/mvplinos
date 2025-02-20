import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  IconButton, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { IProduto } from '@linos/shared';

interface ProdutoCardProps {
  produto: IProduto;
  onEdit?: (produto: IProduto) => void;
  onDelete?: (id: number) => void;
}

export const ProdutoCard: React.FC<ProdutoCardProps> = ({ produto, onEdit, onDelete }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEdit = () => {
    onEdit?.(produto);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete?.(produto.id);
    setDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace('R$', 'R$').trim();
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h5" component="h2" data-testid="produto-nome">
                {produto.nome}
              </Typography>
              <Typography color="textSecondary" data-testid="produto-preco">
                {formatPrice(produto.preco_unitario)} / {produto.tipo_medida}
              </Typography>
              <Typography 
                color="textSecondary" 
                data-testid="produto-status"
                className={`status-${produto.status.toLowerCase()}`}
              >
                {produto.status.charAt(0).toUpperCase() + produto.status.slice(1)}
              </Typography>
            </Box>
            <Box>
              <IconButton 
                onClick={handleEdit} 
                data-testid="edit-button"
                size="small"
                color="primary"
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                onClick={handleDelete} 
                data-testid="delete-button"
                size="small"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          Tem certeza que deseja excluir o produto "{produto.nome}"?
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete} 
            data-testid="cancel-delete"
            color="primary"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            data-testid="confirm-delete"
            color="error"
            autoFocus
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};