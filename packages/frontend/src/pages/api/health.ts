
import type { NextApiRequest, NextApiResponse } from 'next';

type HealthResponse = {
  status: string;
  timestamp: string;
  service: string;
  environment: string;
  version?: string;
};

/**
 * Handler para verificar a saúde do frontend
 * Esta rota não depende mais do backend para funcionar
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Sempre retornar um status OK para o health check do Render
  // Isso é importante para que o deploy possa ser concluído
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'linos-frontend',
    environment: process.env.NODE_ENV || 'production',
    version: process.env.npm_package_version || '1.0.0'
  });
}
