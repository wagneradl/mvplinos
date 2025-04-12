'use client';

import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

const routeLabels: Record<string, string> = {
  pedidos: 'Pedidos',
  produtos: 'Produtos',
  clientes: 'Clientes',
  relatorios: 'Relatórios',
  novo: 'Novo',
  editar: 'Editar',
};

// Função para verificar se uma string é um ID numérico
function isNumericId(path: string): boolean {
  return /^\d+$/.test(path);
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const paths = pathname?.split('/').filter(Boolean) || [];
    return paths.map((path, index) => {
      const href = `/${paths.slice(0, index + 1).join('/')}`;
      
      // Se for um ID numérico, não criar um link para ele
      // Em vez disso, redirecionar para a página pai
      if (isNumericId(path)) {
        // Se o próximo caminho for "editar", estamos em uma página de edição
        // Neste caso, não mostrar o ID como um breadcrumb separado
        if (index + 1 < paths.length && paths[index + 1] === 'editar') {
          return null;
        }
        
        // Para outros casos, mostrar o ID mas sem link
        return (
          <Typography key={href} color="text.secondary">
            ID: {path}
          </Typography>
        );
      }
      
      const label = routeLabels[path] || path;
      const isLast = index === paths.length - 1;

      if (isLast) {
        return (
          <Typography key={href} color="text.primary">
            {label}
          </Typography>
        );
      }

      return (
        <Link key={href} component={NextLink} href={href} underline="hover" color="inherit">
          {label}
        </Link>
      );
    }).filter(Boolean); // Remover itens nulos
  }, [pathname]);

  if (!breadcrumbs?.length) return null;

  return (
    <MuiBreadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
      <Link component={NextLink} href="/" underline="hover" color="inherit">
        Início
      </Link>
      {breadcrumbs}
    </MuiBreadcrumbs>
  );
}

// Adicionar exportação default para compatibilidade
export default Breadcrumbs;
