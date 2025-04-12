import { useQuery } from '@tanstack/react-query';
import { PedidosService } from '@/services/pedidos.service';

interface UseRelatoriosProps {
  startDate?: string;
  endDate?: string;
  clienteId?: number;
  groupBy?: 'diario' | 'semanal' | 'mensal';
  enabled?: boolean;
}

export function useRelatorios({
  startDate,
  endDate,
  clienteId,
  groupBy = 'diario',
  enabled = true,
}: UseRelatoriosProps = {}) {
  return useQuery({
    queryKey: ['relatorios', startDate, endDate, clienteId, groupBy],
    queryFn: () => PedidosService.gerarRelatorio({ startDate, endDate, clienteId, groupBy }),
    enabled,
  });
}

// Adicionar exportação default para compatibilidade
export default useRelatorios;
