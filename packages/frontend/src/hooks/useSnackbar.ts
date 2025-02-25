import { useSnackbar as useNotistackSnackbar, VariantType, OptionsObject } from 'notistack';

export interface SnackbarOptions extends Partial<OptionsObject> {
  duration?: number;
  action?: React.ReactNode;
}

export function useSnackbar() {
  const { enqueueSnackbar, closeSnackbar } = useNotistackSnackbar();

  const showSuccess = (message: string, options?: SnackbarOptions) => {
    return enqueueSnackbar(message, {
      variant: 'success',
      autoHideDuration: options?.duration || 4000,
      ...options,
    });
  };

  const showError = (message: string, options?: SnackbarOptions) => {
    return enqueueSnackbar(message, {
      variant: 'error',
      autoHideDuration: options?.duration || 6000, // Erros ficam mais tempo visíveis
      ...options,
    });
  };

  const showWarning = (message: string, options?: SnackbarOptions) => {
    return enqueueSnackbar(message, {
      variant: 'warning',
      autoHideDuration: options?.duration || 5000,
      ...options,
    });
  };

  const showInfo = (message: string, options?: SnackbarOptions) => {
    return enqueueSnackbar(message, {
      variant: 'info',
      autoHideDuration: options?.duration || 4000,
      ...options,
    });
  };

  // Utilitário para lidar com erros de API com mensagens mais amigáveis
  const showApiError = (error: any, fallbackMessage = 'Ocorreu um erro inesperado') => {
    let errorMessage = fallbackMessage;
    
    // Erro aprimorado pela nossa API
    if (error.isApiError) {
      if (error.statusCode === 400) {
        errorMessage = `Dados inválidos: ${error.message}`;
      } else if (error.statusCode === 404) {
        errorMessage = `Recurso não encontrado: ${error.message}`;
      } else if (error.statusCode === 500) {
        errorMessage = 'Erro no servidor. Tente novamente mais tarde.';
      } else {
        errorMessage = error.message || fallbackMessage;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return showError(errorMessage, {
      persist: error.statusCode === 500, // Erros 500 são mais críticos, persistem na tela
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showApiError,
    closeSnackbar,
  };
}
