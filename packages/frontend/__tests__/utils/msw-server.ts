import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

// Configurar servidor MSW com os handlers definidos
export const server = setupServer(...handlers);