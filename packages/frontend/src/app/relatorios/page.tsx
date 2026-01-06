'use client';

import { useState } from 'react';
import { Box, Button, Grid, TextField, MenuItem, CircularProgress } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PageContainer } from '@/components/PageContainer';
import { RelatorioVendas } from '@/components/RelatorioVendas';
import { useClientes } from '@/hooks/useClientes';
import { useSummaryRelatorio } from '@/hooks/usePedidos';
import { format, isValid } from 'date-fns';
import { loggers } from '@/utils/logger';
import { useSnackbar } from 'notistack';

const logger = loggers.pedidos;

// Função de formatação segura que não quebra com datas inválidas
function formatSafe(date: Date | null | undefined, pattern: string): string | undefined {
  if (!date || !isValid(date)) {
    return undefined;
  }
  return format(date, pattern);
}

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [clienteId, setClienteId] = useState<string>('');
  const [showReport, setShowReport] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const { clientes = [] } = useClientes(1, 100);
  const { data: relatorio, isLoading: isLoadingRelatorio } = useSummaryRelatorio({
    startDate: formatSafe(startDate, 'yyyy-MM-dd'),
    endDate: formatSafe(endDate, 'yyyy-MM-dd'),
    clienteId: clienteId ? Number(clienteId) : undefined,
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

  // Função para exportar PDF com log dos filtros atuais
  const handleExportPdf = async () => {
    const filtros = {
      data_inicio: formatSafe(startDate, 'yyyy-MM-dd'),
      data_fim: formatSafe(endDate, 'yyyy-MM-dd'),
      cliente_id: clienteId ? Number(clienteId) : undefined,
    };
    logger.debug('Exportando PDF com filtros (snake_case):', filtros);
    try {
      await import('@/services/pedidos.service').then(({ PedidosService }) =>
        PedidosService.downloadRelatorioPdf(filtros)
      );
    } catch (error) {
      enqueueSnackbar('Erro ao exportar PDF do relatório', { variant: 'error' });
      logger.error('Erro ao exportar PDF:', error);
    }
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
              renderInput={(params) => <TextField {...params} fullWidth size="small" required />}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DatePicker
              label="Data Final"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate || undefined}
              renderInput={(params) => <TextField {...params} fullWidth size="small" required />}
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
          data={
            relatorio || {
              data: [],
              summary: { total_orders: 0, total_value: 0, average_value: 0 },
            }
          }
          isLoading={isLoadingRelatorio}
          onExportPdf={handleExportPdf}
        />
      )}
    </PageContainer>
  );
}
