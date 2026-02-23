'use client';

import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon from '@mui/icons-material/Cancel';
import { FLUXO_PRINCIPAL, STATUS_CONFIG, StatusPedido } from '@/constants/status-pedido';

interface StatusTimelineProps {
  statusAtual: string;
}

/**
 * Timeline visual horizontal mostrando a progressão do pedido.
 * Estados completados: check verde
 * Estado atual: destacado com borda pulsante
 * Estados futuros: cinza
 * CANCELADO: ícone X vermelho no ponto onde foi cancelado
 */
export function StatusTimeline({ statusAtual }: StatusTimelineProps) {
  const isCancelado = statusAtual === 'CANCELADO';

  // Determinar índice do status atual no fluxo principal
  const currentIndex = FLUXO_PRINCIPAL.indexOf(statusAtual as StatusPedido);

  // Se cancelado, precisamos determinar "em qual ponto" foi cancelado
  // Vamos inferir pelo último status antes do cancelamento
  // Como não temos esse dado, mostramos todos como indeterminados com X no final
  // Na prática, a timeline mostra o ícone de cancelado no fim
  const cancelIndex = isCancelado ? -1 : -1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        py: 2,
        px: 1,
        overflowX: 'auto',
      }}
    >
      {FLUXO_PRINCIPAL.map((status, index) => {
        const config = STATUS_CONFIG[status];
        const isCompleted = !isCancelado && currentIndex > index;
        const isCurrent = !isCancelado && statusAtual === status;
        const isFuture = !isCancelado && currentIndex < index;

        return (
          <Box key={status} sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Step */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 80,
              }}
            >
              {/* Ícone */}
              {isCompleted && (
                <CheckCircleIcon sx={{ color: '#059669', fontSize: 28 }} />
              )}
              {isCurrent && (
                <RadioButtonCheckedIcon
                  sx={{
                    color: config.textColor,
                    fontSize: 28,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 },
                    },
                  }}
                />
              )}
              {isFuture && (
                <RadioButtonUncheckedIcon sx={{ color: '#D1D5DB', fontSize: 28 }} />
              )}
              {isCancelado && (
                <RadioButtonUncheckedIcon sx={{ color: '#D1D5DB', fontSize: 28 }} />
              )}

              {/* Label */}
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  fontWeight: isCurrent ? 700 : 400,
                  color: isCompleted
                    ? '#059669'
                    : isCurrent
                      ? config.textColor
                      : '#9CA3AF',
                  textAlign: 'center',
                  fontSize: { xs: '0.6rem', sm: '0.75rem' },
                  whiteSpace: 'nowrap',
                }}
              >
                {config.label}
              </Typography>
            </Box>

            {/* Conector (não renderiza no último) */}
            {index < FLUXO_PRINCIPAL.length - 1 && (
              <Box
                sx={{
                  width: { xs: 20, sm: 40 },
                  height: 2,
                  bgcolor: isCompleted ? '#059669' : '#E5E7EB',
                  mx: 0.5,
                  mt: -2,
                }}
              />
            )}
          </Box>
        );
      })}

      {/* Se cancelado, mostrar ícone X vermelho ao final */}
      {isCancelado && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: { xs: 20, sm: 40 },
              height: 2,
              bgcolor: '#EF4444',
              mx: 0.5,
              mt: -2,
            }}
          />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 80,
            }}
          >
            <CancelIcon sx={{ color: '#DC2626', fontSize: 28 }} />
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                fontWeight: 700,
                color: '#DC2626',
                textAlign: 'center',
                fontSize: { xs: '0.6rem', sm: '0.75rem' },
              }}
            >
              Cancelado
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default StatusTimeline;
