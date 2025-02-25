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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {actions}
      </Box>
      <Paper sx={{ p: 3 }}>{children}</Paper>
    </>
  );
}
