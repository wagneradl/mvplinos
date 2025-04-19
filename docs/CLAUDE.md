# CLAUDE.md - Project Guide

## Build & Run Commands
- Main: `yarn dev` - Run all packages in dev mode
- Build: `yarn build` - Build all packages
- Lint: `yarn lint` - Run ESLint on all packages
- Format: `yarn format` - Format all code with Prettier
- Test: `yarn test` - Run all tests

## Backend Specific
- Tests: `yarn workspace @linos/backend test [path]` - Run specific test(s)
- Integration: `yarn workspace @linos/backend test:integration`
- E2E: `yarn workspace @linos/backend test:e2e`
- Database: `yarn workspace @linos/backend seed` - Seed database

## Frontend Specific
- Tests: `yarn workspace @linos/frontend test [path]` - Run specific test(s)
- Watch Tests: `yarn workspace @linos/frontend test:watch`

## Code Style Guidelines
- Use TypeScript for strict typing
- Follow Prettier formatting (singleQuote, 100 char line length)
- Use async/await over Promises
- Import order: external > internal modules
- Use PascalCase for components, interfaces, types
- Use camelCase for variables, functions, methods
- Use NestJS decorators consistently (@Controller, @Injectable)
- Error handling: use try/catch and return appropriate HTTP responses
- Always test components/services with >80% coverage
- React hooks for frontend state management
- Use DTOs for backend data validation