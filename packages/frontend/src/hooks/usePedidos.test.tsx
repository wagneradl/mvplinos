import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePedidos } from './usePedidos';
import { PedidosService } from '@/services/pedidos.service';
import { ReactNode } from 'react';

jest.mock('@/services/pedidos.service');

describe('usePedidos', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  it('should repeat order successfully', async () => {
    const mockPedido = {
      id: 2,
      cliente_id: 1,
      status: 'PENDENTE',
      valor_total: 100,
    };

    (PedidosService.repetirPedido as jest.Mock).mockResolvedValue(mockPedido);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePedidos(), { wrapper });

    await act(async () => {
      await result.current.repetirPedido(1);
    });

    expect(PedidosService.repetirPedido).toHaveBeenCalledWith(1);
    expect(queryClient.getQueryData(['pedidos'])).toBeDefined();
  });

  it('should handle repeat order error', async () => {
    const error = new Error('Failed to repeat order');
    (PedidosService.repetirPedido as jest.Mock).mockRejectedValue(error);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePedidos(), { wrapper });

    await act(async () => {
      try {
        await result.current.repetirPedido(1);
        fail('Should have thrown an error');
      } catch (e) {
        expect(e).toBe(error);
      }
    });

    expect(PedidosService.repetirPedido).toHaveBeenCalledWith(1);
  });
});


// Adicionar exportação default para compatibilidade
export default usePedidos.test;
