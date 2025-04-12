'use client';

// SSR Safe - Modificado para funcionar com Next.js SSR
import React from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

interface PedidoTemplateProps {
  params: {
    id: string;
  };
}

interface ItemPedido {
  id: number;
  quantidade: number;
  preco_unitario: number;
  valor_total_item: number;
  produto: {
    nome: string;
    tipo_medida: string;
  };
}

async function getPedidoData(id: string) {
  const response = await fetch(`http://localhost:3001/pedidos/${id}`, {
    next: { revalidate: 0 }, // Não cachear
  });
  return response.json();
}

export default async function PedidoTemplate({ params }: PedidoTemplateProps) {
  const pedido = await getPedidoData(params.id);

  return (
    <Box sx={{ p: 4, maxWidth: '210mm', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom align="center">
        Lino&apos;s Padaria
      </Typography>

      <Typography variant="h5" gutterBottom align="center">
        Pedido #{pedido.id}
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Dados do Cliente
        </Typography>
        <Typography>Razão Social: {pedido.cliente.razao_social}</Typography>
        <Typography>CNPJ: {pedido.cliente.cnpj}</Typography>
        <Typography>Telefone: {pedido.cliente.telefone}</Typography>
        <Typography>Email: {pedido.cliente.email}</Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Itens do Pedido
        </Typography>
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="right">Preço Unit.</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedido.itensPedido.map((item: ItemPedido) => (
                <TableRow key={item.id}>
                  <TableCell>{item.produto.nome}</TableCell>
                  <TableCell align="right">
                    {item.quantidade} {item.produto.tipo_medida}
                  </TableCell>
                  <TableCell align="right">R$ {item.preco_unitario.toFixed(2)}</TableCell>
                  <TableCell align="right">R$ {item.valor_total_item.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} align="right">
                  <strong>Total do Pedido:</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>R$ {pedido.valor_total.toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Data do Pedido: {new Date(pedido.data_pedido).toLocaleString()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Status: {pedido.status}
        </Typography>
      </Box>
    </Box>
  );
}
