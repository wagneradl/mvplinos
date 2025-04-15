const axios = require('axios');

// Dados de exemplo para criar um pedido (formato corrigido)
const pedidoTeste = {
  cliente_id: 1, // Verifique se esse cliente existe no seu banco
  itens: [
    {
      produto_id: 1, // Verifique se esse produto existe no seu banco
      quantidade: 2
    },
    {
      produto_id: 2, // Verifique se esse produto existe no seu banco
      quantidade: 3
    }
  ]
};

// Função para testar a criação do pedido
async function testaCriacaoPedido() {
  try {
    console.log('Iniciando teste de criação de pedido com upload para Supabase...');
    
    console.log('Tentando criar pedido sem autenticação:');
    try {
      const pedidoResponseSemAuth = await axios.post(
        'http://localhost:3005/pedidos',
        pedidoTeste,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Pedido criado com sucesso (sem autenticação)!');
      console.log('ID do pedido:', pedidoResponseSemAuth.data.id);
      console.log('PDF Local Path:', pedidoResponseSemAuth.data.pdf_path);
      console.log('PDF Supabase URL:', pedidoResponseSemAuth.data.pdf_url);
      
      return pedidoResponseSemAuth.data;
    } catch (errorSemAuth) {
      console.log('Erro ao criar pedido sem autenticação:', errorSemAuth.response?.status, errorSemAuth.response?.data?.message || errorSemAuth.message);
      console.log('Tentando com autenticação...');
    }
    
    // Verificar se o endpoint de autenticação espera um formato diferente
    console.log('\nTentando login com admin@linos.com.br / admin123');
    try {
      const loginResponse = await axios.post('http://localhost:3005/auth/login', {
        email: 'admin@linos.com.br',
        senha: 'admin123'
      });
      
      const token = loginResponse.data.access_token;
      console.log('Login realizado com sucesso! Token JWT:', token.substring(0, 15) + '...');
      
      // Criar pedido com o token de autenticação
      const pedidoResponse = await axios.post(
        'http://localhost:3005/pedidos',
        pedidoTeste,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Pedido criado com sucesso (com autenticação)!');
      console.log('ID do pedido:', pedidoResponse.data.id);
      console.log('PDF Local Path:', pedidoResponse.data.pdf_path);
      console.log('PDF Supabase URL:', pedidoResponse.data.pdf_url);
      
      // Testar o download do PDF
      console.log(`\nPara testar o download do PDF, acesse: http://localhost:3005/pedidos/${pedidoResponse.data.id}/pdf`);
      
      return pedidoResponse.data;
    } catch (loginError) {
      console.log('Erro no login:', loginError.response?.status, loginError.response?.data);
      
      // Tentar alternativa: criar pedido sem autenticação, focando apenas no teste do Supabase
      console.log('\nTentando criar pedido sem necessidade de autenticação para teste do Supabase:');
      
      try {
        // Vamos verificar o controller de pedidos para ver se ele requer autenticação
        console.log('Consultando a lista de pedidos para verificar acesso:');
        const listaPedidos = await axios.get('http://localhost:3005/pedidos');
        console.log('Acesso permitido! Pedidos encontrados:', listaPedidos.data.length);
        
        // Criar pedido sem autenticação
        const pedidoResponse = await axios.post(
          'http://localhost:3005/pedidos',
          pedidoTeste,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Pedido criado com sucesso!');
        console.log('ID do pedido:', pedidoResponse.data.id);
        console.log('PDF Local Path:', pedidoResponse.data.pdf_path);
        console.log('PDF Supabase URL:', pedidoResponse.data.pdf_url);
        
        return pedidoResponse.data;
      } catch (error) {
        console.error('Erro ao criar pedido sem autenticação:', error.response?.status, error.response?.data);
      }
    }
  } catch (error) {
    console.error('Erro ao testar criação de pedido:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Executar o teste
testaCriacaoPedido();
