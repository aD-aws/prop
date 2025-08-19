import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import app from './app';
import serverless from 'serverless-http';

// Create serverless handler from Express app
const handler = serverless(app);

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Set context for Lambda
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Call the serverless handler
    const result = await handler(event, context);
    
    return result as APIGatewayProxyResult;
  } catch (error) {
    console.error('Lambda handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId
      })
    };
  }
};