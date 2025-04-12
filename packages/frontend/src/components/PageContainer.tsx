'use client';

import { Box, Paper, Typography } from '@mui/material';
import { Breadcrumbs } from './Breadcrumbs';

interface PageContainerProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageContainer({ title, actions, children }: PageContainerProps) {
  return (
    <>
      <Breadcrumbs />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        {actions}
      </Box>
      <Paper sx={{ p: 3 }}>{children}</Paper>
    </>
  );
}

// Adicionar exportação default sem remover a exportação nomeada para manter compatibilidade
export default PageContainer;
