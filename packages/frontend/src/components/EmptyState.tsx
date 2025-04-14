'use client';

import { Box, Typography, Paper, SxProps, Theme } from '@mui/material';
import { SentimentDissatisfied as EmptyIcon } from '@mui/icons-material';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Componente para exibir mensagem quando não há dados para mostrar
 */
export function EmptyState({ 
  title = 'Nenhum item encontrado', 
  message, 
  icon, 
  sx 
}: EmptyStateProps) {
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.default',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 2,
        textAlign: 'center',
        ...sx
      }}
    >
      <Box sx={{ mb: 2, color: 'text.secondary' }}>
        {icon || <EmptyIcon fontSize="large" />}
      </Box>
      <Typography variant="h6" color="text.primary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Paper>
  );
}

export default EmptyState;
