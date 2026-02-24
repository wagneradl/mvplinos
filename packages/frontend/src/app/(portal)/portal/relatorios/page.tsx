'use client';

import { useState } from 'react';
import { Box, Button, Grid, TextField, CircularProgress } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PageContainer } from '@/components/PageContainer';
import { RelatorioVendas } from '@/components/RelatorioVendas';
import { useSummaryRelatorio } from '@/hooks/usePedidos';
import { format, isValid } from 'date-fns';
import { loggers } from '@/utils/logger';
import { useSnackbar } from 'notistack';

const logger = loggers.pedidos;

/** Formatação segura — retorna undefined se data inválida */
function formatSafe(date: Date | null | undefined, pattern: string): string | undefined {
  if (!date || !isValid(date)) return undefined;
  return format(date, pattern);
}

/**
 * Página de Relatórios do Portal — versão simplificada da admin.
 * Sem filtro de cliente (tenant isolation automática pelo backend).
 */
export default function PortalRelatoriosPage() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showReport, setShowReport] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const { data: relatorio, isLoading: isLoadingRelatorio } = useSummaryRelatorio({
    startDate: formatSafe(startDate, 'yyyy-MM-dd'),
    endDate: formatSafe(endDate, 'yyyy-MM-dd'),
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

  const handleExportPdf = async () => {
    const filtros = {
      data_inicio: formatSafe(startDate, 'yyyy-MM-dd'),
      data_fim: formatSafe(endDate, 'yyyy-MM-dd'),
    };
    logger.debug('Portal: Exportando PDF com filtros:', filtros);
    try {
      await import('@/services/pedidos.service').then(({ PedidosService }) =>
        PedidosService.downloadRelatorioPdf(filtros),
      );
    } catch (error) {
      enqueueSnackbar('Erro ao exportar PDF do relatório', { variant: 'error' });
      logger.error('Erro ao exportar PDF:', error);
    }
  };

  return (
    <PageContainer title="Meus Relatórios">
      <Box component="form" sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <DatePicker
              label="Data Inicial"
              value={startDate}
              onChange={setStartDate}
              renderInput={(params) => <TextField {...params} fullWidth size="small" required />}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <DatePicker
              label="Data Final"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate || undefined}
              renderInput={(params) => <TextField {...params} fullWidth size="small" required />}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleGerarRelatorio}
              disabled={isLoadingRelatorio}
              sx={{ height: 40 }}
            >
              {isLoadingRelatorio ? <CircularProgress size={24} color="inherit" /> : 'Gerar'}
            </Button>
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
