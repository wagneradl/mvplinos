
import type { NextApiRequest, NextApiResponse } from 'next';

type HealthResponse = {
  status: string;
  timestamp: string;
  service: string;
  environment: string;
};

/**
 * Handler para encaminhar requisições de saúde para o backend
 * Esta rota serve como um proxy para o endpoint de saúde do backend
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse | { error: string }>
) {
  try {
    // Fazer requisição para o endpoint de saúde do backend
    const backendUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001/health'
      : `${process.env.NEXT_PUBLIC_API_URL}/health`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Obter os dados da resposta
    const data = await response.json();

    // Retornar os dados como resposta
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[API] Erro ao encaminhar requisição de saúde para o backend:', error);
    
    // Em caso de erro, retornar uma resposta de erro
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'linos-frontend',
      environment: process.env.NODE_ENV || 'development',
      error: 'Não foi possível conectar ao backend',
    });
  }
}
