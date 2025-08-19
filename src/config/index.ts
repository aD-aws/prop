import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  },
  aws: {
    region: process.env.AWS_REGION || 'eu-west-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  dynamodb: {
    tableName: process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform',
    endpoint: process.env.DYNAMODB_ENDPOINT,
    region: process.env.AWS_REGION || 'eu-west-2',
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME || 'uk-home-improvement-documents',
    region: process.env.S3_REGION || 'eu-west-2',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bedrock: {
    region: process.env.BEDROCK_REGION || 'us-east-1',
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  postcode: {
    apiUrl: process.env.POSTCODE_API_URL || 'https://api.postcodes.io',
    timeout: parseInt(process.env.POSTCODE_API_TIMEOUT || '5000', 10),
  },
  council: {
    cacheTimeout: parseInt(process.env.COUNCIL_CACHE_TIMEOUT || '86400000', 10), // 24 hours
    requestTimeout: parseInt(process.env.COUNCIL_REQUEST_TIMEOUT || '10000', 10), // 10 seconds
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}