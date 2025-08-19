// Test setup file
// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
process.env.REDIS_URL = 'redis://localhost:6379';

// Increase timeout for async operations
jest.setTimeout(10000);