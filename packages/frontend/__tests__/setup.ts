import '@testing-library/jest-dom';
import { server } from './utils/msw-server';

// Configure React for testing
global.React = require('react');

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());