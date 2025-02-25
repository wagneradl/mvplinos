'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Paper,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { Cliente } from '@/types/pedido';

interface PedidosFilterProps {
  clientes: Cliente[];
  onFilterChange: (filters: {
    data_inicio?: string;
    data_fim?: string;
    cliente_id?: number;
    status?: string;
  }) => void;
}

export function PedidosFilter({ clientes, onFilterChange }: PedidosFilterProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [clienteId, setClienteId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const formatarDataParaFiltro = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    try {
      // Garante que a data esteja no formato YYYY-MM-DD sem componentes de hora
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return undefined;
    }
  };

  const applyFilters = (updatedFilters: any = {}) => {
    const novosFilters = {
      data_inicio: formatarDataParaFiltro(startDate),
      data_fim: formatarDataParaFiltro(endDate),
      cliente_id: clienteId ? Number(clienteId) : undefined,
      status: status || undefined,
      ...updatedFilters
    };
    
    console.log('Aplicando filtros:', novosFilters);
    onFilterChange(novosFilters);
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    console.log('Data Inicial selecionada:', formatarDataParaFiltro(date) || 'nenhuma');
    applyFilters({
      data_inicio: formatarDataParaFiltro(date)
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    console.log('Data Final selecionada:', formatarDataParaFiltro(date) || 'nenhuma');
    applyFilters({
      data_fim: formatarDataParaFiltro(date)
    });
  };

  const handleClienteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClienteId(event.target.value);
    applyFilters({
      cliente_id: event.target.value ? Number(event.target.value) : undefined
    });
  };

  // Quando qualquer filtro mudar, aplicamos todos juntos
  const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(event.target.value);
    console.log('Status selecionado:', event.target.value || 'nenhum');
    applyFilters({
      status: event.target.value || undefined
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box component="form">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Data Inicial"
              value={startDate}
              onChange={handleStartDateChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  size="small"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <DatePicker
              label="Data Final"
              value={endDate}
              onChange={handleEndDateChange}
              minDate={startDate || undefined}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  size="small"
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Cliente"
              value={clienteId}
              onChange={handleClienteChange}
            >
              <MenuItem value="">Todos</MenuItem>
              {clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  {cliente.nome_fantasia}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              value={status}
              onChange={handleStatusChange}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ATIVO">Ativo</MenuItem>
              <MenuItem value="CANCELADO">Cancelado</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
