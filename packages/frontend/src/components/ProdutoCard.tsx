import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { IProduto } from '@linos/shared';

interface ProdutoCardProps {
  produto: IProduto;
}

export const ProdutoCard: React.FC<ProdutoCardProps> = ({ produto }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" data-testid="produto-nome">
          {produto.nome}
        </Typography>
        <Typography color="textSecondary" data-testid="produto-preco">
          R$ {produto.preco_unitario.toFixed(2)} / {produto.tipo_medida}
        </Typography>
        <Typography color="textSecondary" data-testid="produto-status">
          Status: {produto.status}
        </Typography>
      </CardContent>
    </Card>
  );
};