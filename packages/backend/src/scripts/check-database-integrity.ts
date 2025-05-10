import { PrismaClient } from '@prisma/client';

/**
 * Script para verificar a integridade do banco de dados antes de iniciar o serviço
 * Verifica se a coluna 'observacoes' existe na tabela 'Pedido'
 */
async function checkDatabaseIntegrity() {
  console.log('Verificando integridade do banco de dados...');
  const prisma = new PrismaClient();
  try {
    // Tentar acessar um pedido e verificar se o campo observacoes existe
    const testPedido = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN 'exists' 
          ELSE 'not_exists' 
        END as result
      FROM pragma_table_info('Pedido') 
      WHERE name = 'observacoes'
    `;
    
    const result = Array.isArray(testPedido) ? testPedido[0] : testPedido;
    
    if (result && result.result === 'exists') {
      console.log('✅ Coluna "observacoes" encontrada na tabela "Pedido"');
    } else {
      console.error('❌ ERRO: Coluna "observacoes" NÃO encontrada na tabela "Pedido"');
      console.log('Tentando adicionar a coluna automaticamente...');
      
      try {
        // Tentar adicionar a coluna
        await prisma.$executeRaw`ALTER TABLE "Pedido" ADD COLUMN "observacoes" TEXT;`;
        console.log('✅ Coluna "observacoes" adicionada com sucesso à tabela "Pedido"');
      } catch (addError) {
        console.error('❌ Erro ao adicionar coluna "observacoes":', addError);
        process.exit(1);
      }
    }
    
    console.log('✅ Verificação de integridade concluída com sucesso');
  } catch (error) {
    console.error('❌ Erro ao verificar integridade do banco de dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a verificação
checkDatabaseIntegrity()
  .then(() => console.log('Banco de dados verificado e pronto para uso'))
  .catch((error) => {
    console.error('Erro fatal na verificação do banco de dados:', error);
    process.exit(1);
  });
