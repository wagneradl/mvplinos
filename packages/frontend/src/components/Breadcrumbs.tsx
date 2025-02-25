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

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const paths = pathname?.split('/').filter(Boolean) || [];
    return paths.map((path, index) => {
      const href = `/${paths.slice(0, index + 1).join('/')}`;
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
    });
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
