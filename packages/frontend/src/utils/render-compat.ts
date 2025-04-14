/**
 * Render Compatibility Module
 * 
 * Este arquivo garante a correta exportação e importação de módulos
 * na plataforma Render, resolvendo problemas com aliases (@/) e 
 * exportações que podem ocorrer em ambiente de produção.
 */

// Re-exportação de hooks
import { useClientes } from '../hooks/useClientes';
import { usePedidos, usePedido, useRelatorio } from '../hooks/usePedidos';
import { useSnackbar } from '../hooks/useSnackbar';

// Re-exportação de componentes
import { PageContainer } from '../components/PageContainer';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Navigation } from '../components/Navigation';
import { LoginContainer } from '../components/LoginContainer';
import { Providers } from '../components/Providers';

// Exportações para compatibilidade
export {
  // Hooks
  useClientes,
  usePedidos,
  usePedido,
  useRelatorio,
  useSnackbar,
  
  // Componentes
  PageContainer,
  Breadcrumbs,
  Navigation,
  LoginContainer,
  Providers
};

// Exportações default para compatibilidade
export default {
  useClientes,
  usePedidos,
  usePedido,
  useRelatorio,
  useSnackbar,
  PageContainer,
  Breadcrumbs,
  Navigation,
  LoginContainer,
  Providers
};
