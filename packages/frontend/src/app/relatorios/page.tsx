'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PageContainer } from '@/components/PageContainer';
import { RelatorioVendas } from '@/components/RelatorioVendas';
import { useClientes } from '@/hooks/useClientes';
import { useRelatorio } from '@/hooks/usePedidos';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [clienteId, setClienteId] = useState<string>('');
  const [showReport, setShowReport] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const { clientes = [], isLoading: isLoadingClientes } = useClientes(1, 100);
  const { data: relatorio, isLoading: isLoadingRelatorio } = useRelatorio({
    data_inicio: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    data_fim: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    cliente_id: clienteId ? Number(clienteId) : undefined,
    enabled: showReport,
  });

  const handleGerarRelatorio = () => {
    if (!startDate || !endDate) {
      enqueueSnackbar('Por favor, selecione as datas inicial e final', { variant: 'warning' });
      return;
    }

    if (endDate < startDate) {
      enqueueSnackbar('A data final não pode ser anterior à data inicial', { variant: 'warning' });
      return;
    }

    setShowReport(true);
  };

  return (
    <PageContainer title="Relatório de Vendas">
      <Box component="form" sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <DatePicker
              label="Data Inicial"
              value={startDate}
              onChange={setStartDate}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  size="small"
                  required
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DatePicker
              label="Data Final"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate || undefined}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  size="small"
                  required
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  {cliente.nome_fantasia}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={handleGerarRelatorio}
                disabled={isLoadingRelatorio}
              >
                {isLoadingRelatorio ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Gerar Relatório'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {showReport && (
        <RelatorioVendas
          data={relatorio || { data: [], summary: { total_orders: 0, total_value: 0, average_value: 0 } }}
          isLoading={isLoadingRelatorio}
        />
      )}
    </PageContainer>
  );
}
