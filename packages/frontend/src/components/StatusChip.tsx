'use client';

import { Chip, ChipProps } from '@mui/material';
import { STATUS_CONFIG, StatusPedido } from '@/constants/status-pedido';

interface StatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: string;
}

/**
 * Chip colorido reutilizável que exibe o status do pedido.
 * Usa STATUS_CONFIG para cores e label.
 * Fallback gracioso para status desconhecido.
 */
export function StatusChip({ status, size = 'small', ...rest }: StatusChipProps) {
  const config = STATUS_CONFIG[status as StatusPedido];

  if (!config) {
    return (
      <Chip
        label={status}
        size={size}
        sx={{ bgcolor: '#E5E7EB', color: '#374151', fontWeight: 600 }}
        {...rest}
      />
    );
  }

  return (
    <Chip
      label={config.label}
      size={size}
      sx={{
        bgcolor: config.bgColor,
        color: config.textColor,
        fontWeight: 600,
        ...rest.sx,
      }}
      {...rest}
    />
  );
}

export default StatusChip;
