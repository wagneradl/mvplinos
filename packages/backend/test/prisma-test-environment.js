const NodeEnvironment = require('jest-environment-node').default;
const { execSync } = require('child_process');
const { join } = require('path');
const { Client } = require('pg');
const { v4: uuid } = require('uuid');
const { writeFileSync } = require('fs');

class PrismaTestEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);

    // Gerar um schema único para cada worker do Jest
    this.schema = `test_${uuid()}`;
    this.databaseUrl = `file:./test_${this.schema}.db`;
    
    // Gerar arquivo .env.test
    writeFileSync(join(process.cwd(), '.env.test'),
      `DATABASE_URL="${this.databaseUrl}"\n`
    );
  }

  async setup() {
    // Configurar variável de ambiente para o schema
    process.env.DATABASE_URL = this.databaseUrl;
    this.global.process.env.DATABASE_URL = this.databaseUrl;

    // Executar as migrações
    execSync(`yarn prisma migrate deploy`);

    return super.setup();
  }

  async teardown() {
    try {
      // Remover o banco de dados de teste
      execSync(`rm -f ${this.databaseUrl.replace('file:', '')}`);
    } catch (error) {
      console.error('Error removing test database:', error);
    }

    return super.teardown();
  }
}

module.exports = PrismaTestEnvironment;
