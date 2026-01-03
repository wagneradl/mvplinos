'use client';

import { Box, Typography, Paper, Button, SxProps, Theme } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface ErrorStateProps {
  title?: string;
  message: string;
  retryAction?: () => void;
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Componente para exibir mensagens de erro com opção de tentar novamente
 */
export function ErrorState({
  title = 'Erro ao carregar dados',
  message,
  retryAction,
  icon,
  sx,
}: ErrorStateProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'error.light',
        color: 'error.contrastText',
        border: '1px dashed',
        borderColor: 'error.main',
        borderRadius: 2,
        textAlign: 'center',
        opacity: 0.9,
        ...sx,
      }}
    >
      <Box sx={{ mb: 2, color: 'inherit' }}>{icon || <ErrorIcon fontSize="large" />}</Box>
      <Typography variant="h6" color="inherit" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="inherit" sx={{ mb: retryAction ? 3 : 1 }}>
        {message}
      </Typography>
      {retryAction && (
        <Button
          variant="contained"
          onClick={retryAction}
          sx={{
            bgcolor: 'background.paper',
            color: 'error.main',
            '&:hover': {
              bgcolor: 'background.default',
            },
          }}
        >
          Tentar novamente
        </Button>
      )}
    </Paper>
  );
}

export default ErrorState;
