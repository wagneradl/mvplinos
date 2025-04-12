'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ClientSafeWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Um componente wrapper que garante que seu conteúdo só seja renderizado no cliente.
 * Previne erros durante a fase de build do Next.js quando componentes tentam 
 * acessar recursos disponíveis apenas no cliente.
 */
export function ClientSafeWrapper({ children, fallback = <div>Carregando...</div> }: ClientSafeWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default ClientSafeWrapper;
