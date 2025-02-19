import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme';

function render(ui: React.ReactElement, options = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    );
  };

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

// Re-exportar tudo
export * from '@testing-library/react';

// Sobrescrever método render
export { render };