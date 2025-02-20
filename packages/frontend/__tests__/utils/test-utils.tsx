import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../../src/theme';

// Create a client for React Query
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

function render(
  ui: React.ReactElement,
  { queryClient = createTestQueryClient(), ...options }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider maxSnack={3}>
            {children}
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

// Utility functions
const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={3}>
          {children}
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Re-export everything
export * from '@testing-library/react';

// Override render method and export additional utilities
export {
  render,
  createWrapper,
  waitForLoadingToFinish,
  createTestQueryClient,
};