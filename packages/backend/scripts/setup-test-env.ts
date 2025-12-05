// Setup test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
process.env.DATABASE_URL = 'file:./test.db';

console.log('Test environment configured');
