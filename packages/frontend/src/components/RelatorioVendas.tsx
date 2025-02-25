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
  data: {
    date: string;
    total_orders: number;
    total_value: number;
  }[];
  summary: {
    total_orders: number;
    total_value: number;
    average_value: number;
  };
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
              <Typography variant="subtitle2" color="text.secondary">
                Total de Pedidos
              </Typography>
              <Typography variant="h4">
                {data.summary.total_orders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Valor Total
              </Typography>
              <Typography variant="h4">
                {formatCurrency(data.summary.total_value)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Ticket Médio
              </Typography>
              <Typography variant="h4">
                {formatCurrency(data.summary.average_value)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell align="right">Pedidos</TableCell>
              <TableCell align="right">Valor Total</TableCell>
              <TableCell align="right">Média por Pedido</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.data.map((row) => (
              <TableRow key={row.date}>
                <TableCell>
                  {format(new Date(row.date), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell align="right">{row.total_orders}</TableCell>
                <TableCell align="right">
                  {formatCurrency(row.total_value)}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(row.total_value / row.total_orders)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
