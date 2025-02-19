const { execSync } = require('child_process');

module.exports = async () => {
  // Garantir que estamos usando o banco de dados de teste
  process.env.DATABASE_URL = 'file:./test.db';

  // Limpar e recriar o banco de dados de teste
  execSync('rm -f test.db && yarn prisma migrate deploy', {
    env: process.env,
    stdio: 'inherit',
  });
};
