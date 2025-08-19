import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { TextractClient } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { config } from './index';

// AWS Client Configuration
const awsConfig = {
  region: config.aws.region,
  ...(config.aws.accessKeyId && config.aws.secretAccessKey && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  }),
};

// DynamoDB Client
const dynamoDBClient = new DynamoDBClient({
  ...awsConfig,
  ...(config.dynamodb.endpoint && { endpoint: config.dynamodb.endpoint }),
});

export const dynamoDBDocClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// S3 Client
export const s3Client = new S3Client({
  region: config.s3.region,
  ...(config.aws.accessKeyId && config.aws.secretAccessKey && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  }),
});

// Textract Client
export const textractClient = new TextractClient(awsConfig);

// Bedrock Runtime Client
export const bedrockClient = new BedrockRuntimeClient({
  region: config.bedrock.region,
  ...(config.aws.accessKeyId && config.aws.secretAccessKey && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  }),
});

// Export table name for convenience
export const TABLE_NAME = config.dynamodb.tableName;