'use client';

import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import Link from 'next/link';
import { PageContainer } from '@/components/PageContainer';
import { PedidosFilter } from '@/components/PedidosFilter';
import { PedidosTable } from '@/components/PedidosTable';
import { useClientes } from '@/hooks/useClientes';
import { usePedidos } from '@/hooks/usePedidos';

export default function PedidosPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState<{
    data_inicio?: string;
    data_fim?: string;
    cliente_id?: number;
    status?: string;
  }>({});

  const { clientes = [], isLoading: isLoadingClientes } = useClientes(1, 100);
  const { 
    pedidos, 
    isLoading: isLoadingPedidos,
    totalCount,
    page,
    limit,
    totalPages,
    refetch
  } = usePedidos({
    page: currentPage,
    limit: itemsPerPage,
    filters
  });
  
  // Forçar refetch quando a página ou itens por página mudam
  useEffect(() => {
    refetch();
  }, [currentPage, itemsPerPage, refetch]);
  
  console.log('PedidosPage - Pedidos carregados:', pedidos, {
    page: currentPage,
    itemsPerPage,
    totalCount
  });

  if (isLoadingClientes) {
    return (
      <PageContainer title="Pedidos">
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Pedidos"
      actions={
        <Button
          component={Link}
          href="/pedidos/novo"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Novo Pedido
        </Button>
      }
    >
      <PedidosFilter
        clientes={clientes}
        onFilterChange={setFilters}
      />
      <PedidosTable
        pedidos={pedidos}
        isLoading={isLoadingPedidos}
        totalCount={totalCount}
        page={currentPage}
        limit={itemsPerPage}
        onPageChange={(newPage) => setCurrentPage(newPage)}
        onLimitChange={(newLimit) => setItemsPerPage(newLimit)}
      />
    </PageContainer>
  );
}
