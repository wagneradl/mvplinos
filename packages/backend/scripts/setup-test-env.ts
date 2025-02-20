import { execSync } from 'child_process';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const testDbPath = join(process.cwd(), 'test.db');
const testEnvPath = join(process.cwd(), '.env.test');

// Remove test database if it exists
if (existsSync(testDbPath)) {
  unlinkSync(testDbPath);
}

// Create test environment file
const databaseUrl = `file:${testDbPath}`;
writeFileSync(testEnvPath, `DATABASE_URL="${databaseUrl}"\n`);

// Set environment variable
process.env.DATABASE_URL = databaseUrl;

try {
  // Run Prisma migrations
  execSync('npx prisma migrate deploy', {
    env: process.env,
    stdio: 'inherit',
  });
} catch (error) {
  console.error('Error running migrations:', error);
  process.exit(1);
}
