'use client';

// SSR Safe - Modificado para funcionar com Next.js SSR
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/utils/format';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface RelatorioData {
  resumo: {
    total_orders: number;
    total_value: number;
    average_value: number;
  };
  detalhes: { pedido: string | number; data: string; valor_total: number }[];
  colunas: string[];
  total: number;
  observacoes?: string;
  periodo?: {
    inicio: string;
    fim: string;
  };
  cliente?: any;
}

interface RelatorioVendasProps {
  data: RelatorioData;
  isLoading: boolean;
  onExportPdf?: () => void;
}

export function RelatorioVendas({ data, isLoading, onExportPdf }: RelatorioVendasProps) {
  if (isLoading) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        {onExportPdf && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={onExportPdf}
          >
            Exportar PDF
          </Button>
        )}
      </Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pedidos
              </Typography>
              <Typography variant="h4">
                {data.resumo?.total_orders ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Valor Total
              </Typography>
              <Typography variant="h4">
                {formatCurrency(data.resumo?.total_value ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Ticket Médio
              </Typography>
              <Typography variant="h4">
                {formatCurrency(data.resumo?.average_value ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pedido</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Valor Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.detalhes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Nenhum dado encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
              {data.detalhes?.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.pedido}</TableCell>
                  <TableCell>{row.data}</TableCell>
                  <TableCell align="right">{formatCurrency(row.valor_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {data.observacoes}
        </Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Total Geral: {formatCurrency(data.total ?? 0)}</Typography>
      </Box>
    </Box>
  );
}

// Adicionar exportação default para compatibilidade
export default RelatorioVendas;
