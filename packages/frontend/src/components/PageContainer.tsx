'use client';

import { Box, Paper } from '@mui/material';
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
        <Box component="h1" sx={{ typography: 'h5', fontWeight: 'bold', m: 0 }}>
          {title}
        </Box>
        {actions && <Box>{actions}</Box>}
      </Box>
      <Paper sx={{ p: 3 }}>{children}</Paper>
    </>
  );
}

// Simplify export pattern for Render compatibility
// We make PageContainer the default export while still keeping the named export
export default PageContainer;
