import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand,
  DeleteCommand,
  BatchGetCommand
} from '@aws-sdk/lib-dynamodb';
import { 
  Quote, 
  QuoteStatus,
  QuoteDistribution,
  DistributionStatus,
  QuoteComparison,
  ComparisonMetrics,
  ComparisonRecommendation,
  BuilderCommunication,
  CommunicationType,
  CommunicationStatus,
  QuoteSubmissionRequest,
  QuoteSubmissionResult,
  QuoteValidationResult,
  ValidationError,
  ScopeOfWork,
  User,
  ApiResponse
} from '../types';
import { QuoteModel } from '../models/Quote';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class QuoteService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-west-2'
    });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform';
  }

  async submitQuote(request: QuoteSubmissionRequest): Promise<QuoteSubmissionResult> {
    try {
      logger.info('Submitting quote', { sowId: request.sowId, builderId: request.builderId });

      // Validate the quote
      const quote = QuoteModel.create(request.quote);
      const validationErrors = QuoteModel.validateQuote(quote);

      if (validationErrors.length > 0) {
        return {
          success: false,
          validationErrors,
          warnings: []
        };
      }

      // Check if SoW exists and is in correct status
      const sowResult = await this.getSoW(request.sowId);
      if (!sowResult.success || !sowResult.data) {
        return {
          success: false,
          validationErrors: [{
            field: 'sowId',
            message: 'SoW not found or not available for quoting',
            code: 'SOW_NOT_FOUND'
          }]
        };
      }

      // Check if builder already has a quote for this SoW
      const existingQuote = await this.getBuilderQuoteForSoW(request.sowId, request.builderId);
      if (existingQuote) {
        return {
          success: false,
          validationErrors: [{
            field: 'builderId',
            message: 'Builder already has a quote for this SoW',
            code: 'DUPLICATE_QUOTE'
          }]
        };
      }

      // Update quote status to submitted
      const submittedQuote = QuoteModel.updateStatus(quote, 'submitted');

      // Save quote to database
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: submittedQuote
      }));

      logger.info('Quote submitted successfully', { quoteId: submittedQuote.id });

      return {
        success: true,
        quoteId: submittedQuote.id,
        quote: QuoteModel.sanitizeForResponse(submittedQuote) as Quote,
        warnings: [],
        estimatedProcessingTime: 24 // hours
      };

    } catch (error) {
      logger.error('Error submitting quote', { error, request });
      throw error;
    }
  }

  async getQuote(quoteId: string): Promise<ApiResponse<Quote>> {
    try {
      // We need to find the quote by scanning since we don't have the SoW ID
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `QUOTE#${quoteId}`,
          ':sk': `QUOTE#${quoteId}`
        }
      }));

      if (!result.Items || result.Items.length === 0) {
        return {
          success: false,
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Quote not found',
            details: { quoteId }
          },
          timestamp: new Date().toISOString(),
          requestId: uuidv4()
        };
      }

      const quote = result.Items[0] as Quote;

      return {
        success: true,
        data: QuoteModel.sanitizeForResponse(quote) as Quote,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error getting quote', { error, quoteId });
      throw error;
    }
  }

  async getQuotesForSoW(sowId: string): Promise<ApiResponse<Quote[]>> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `SOW#${sowId}`,
          ':sk': 'QUOTE#'
        }
      }));

      const quotes = (result.Items || []) as Quote[];
      const sanitizedQuotes = quotes.map(quote => QuoteModel.sanitizeForResponse(quote) as Quote);

      return {
        success: true,
        data: sanitizedQuotes,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error getting quotes for SoW', { error, sowId });
      throw error;
    }
  }

  async getBuilderQuotes(builderId: string, status?: QuoteStatus): Promise<ApiResponse<Quote[]>> {
    try {
      let keyCondition = 'GSI3PK = :pk';
      const expressionValues: any = {
        ':pk': builderId
      };

      if (status) {
        keyCondition += ' AND begins_with(GSI3SK, :status)';
        expressionValues[':status'] = status;
      }

      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues
      }));

      const quotes = (result.Items || []) as Quote[];
      const sanitizedQuotes = quotes.map(quote => QuoteModel.sanitizeForResponse(quote) as Quote);

      return {
        success: true,
        data: sanitizedQuotes,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error getting builder quotes', { error, builderId, status });
      throw error;
    }
  }

  async updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<ApiResponse<Quote>> {
    try {
      // First get the quote
      const quoteResult = await this.getQuote(quoteId);
      if (!quoteResult.success || !quoteResult.data) {
        return quoteResult;
      }

      const quote = quoteResult.data as Quote;
      const updatedQuote = QuoteModel.updateStatus(quote, status);

      // Update in database
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: updatedQuote
      }));

      logger.info('Quote status updated', { quoteId, status });

      return {
        success: true,
        data: QuoteModel.sanitizeForResponse(updatedQuote) as Quote,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error updating quote status', { error, quoteId, status });
      throw error;
    }
  }

  async distributeToBuilders(
    sowId: string, 
    homeownerId: string, 
    builderIds: string[], 
    dueDate: string
  ): Promise<ApiResponse<QuoteDistribution>> {
    try {
      logger.info('Distributing SoW to builders', { sowId, builderIds: builderIds.length });

      // Verify SoW exists and is approved
      const sowResult = await this.getSoW(sowId);
      if (!sowResult.success || !sowResult.data) {
        return {
          success: false,
          error: {
            code: 'SOW_NOT_FOUND',
            message: 'SoW not found or not approved for distribution'
          },
          timestamp: new Date().toISOString(),
          requestId: uuidv4()
        };
      }

      const distributionId = uuidv4();
      const now = new Date().toISOString();

      const distribution: QuoteDistribution = {
        PK: `SOW#${sowId}`,
        SK: `DISTRIBUTION#${distributionId}`,
        id: distributionId,
        sowId,
        projectId: sowResult.data.projectId,
        homeownerId,
        selectedBuilders: builderIds,
        distributedAt: now,
        dueDate,
        status: 'active',
        responses: builderIds.map(builderId => ({
          builderId,
          status: 'invited'
        })),
        settings: {
          maxQuotes: builderIds.length,
          responseDeadline: dueDate,
          allowQuestions: true,
          requireCertifications: [],
          anonymizeHomeowner: false
        },
        GSI6PK: homeownerId,
        GSI6SK: now
      };

      // Save distribution
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: distribution
      }));

      // TODO: Send notifications to builders (would integrate with notification service)
      logger.info('SoW distributed to builders', { distributionId, builderCount: builderIds.length });

      return {
        success: true,
        data: distribution,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error distributing to builders', { error, sowId, builderIds });
      throw error;
    }
  }

  async compareQuotes(sowId: string): Promise<ApiResponse<QuoteComparison>> {
    try {
      // Get all quotes for the SoW
      const quotesResult = await this.getQuotesForSoW(sowId);
      if (!quotesResult.success || !quotesResult.data) {
        return {
          success: false,
          error: {
            code: 'NO_QUOTES_FOUND',
            message: 'No quotes found for comparison'
          },
          timestamp: new Date().toISOString(),
          requestId: uuidv4()
        };
      }

      const quotes = quotesResult.data;
      if (quotes.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_QUOTES_FOUND',
            message: 'No quotes found for comparison'
          },
          timestamp: new Date().toISOString(),
          requestId: uuidv4()
        };
      }

      // Calculate comparison metrics
      const prices = quotes.map(q => q.totalPrice);
      const durations = quotes.map(q => q.timeline.totalDuration);
      const complianceScores = quotes.map(q => QuoteModel.getComplianceScore(q));

      const metrics: ComparisonMetrics = {
        priceRange: {
          lowest: Math.min(...prices),
          highest: Math.max(...prices),
          average: prices.reduce((sum, p) => sum + p, 0) / prices.length,
          median: this.calculateMedian(prices)
        },
        timelineRange: {
          shortest: Math.min(...durations),
          longest: Math.max(...durations),
          average: durations.reduce((sum, d) => sum + d, 0) / durations.length
        },
        qualityScores: {
          highest: Math.max(...complianceScores),
          lowest: Math.min(...complianceScores),
          average: complianceScores.reduce((sum, s) => sum + s, 0) / complianceScores.length
        },
        complianceScores: {
          highest: Math.max(...complianceScores),
          lowest: Math.min(...complianceScores),
          average: complianceScores.reduce((sum, s) => sum + s, 0) / complianceScores.length
        },
        warrantyComparison: {
          workmanshipRange: {
            shortest: Math.min(...quotes.map(q => q.warranty.workmanshipWarranty.duration)),
            longest: Math.max(...quotes.map(q => q.warranty.workmanshipWarranty.duration)),
            average: quotes.reduce((sum, q) => sum + q.warranty.workmanshipWarranty.duration, 0) / quotes.length
          },
          materialsRange: {
            shortest: Math.min(...quotes.map(q => q.warranty.materialsWarranty.duration)),
            longest: Math.max(...quotes.map(q => q.warranty.materialsWarranty.duration)),
            average: quotes.reduce((sum, q) => sum + q.warranty.materialsWarranty.duration, 0) / quotes.length
          },
          insuranceBackedCount: quotes.filter(q => q.warranty.insuranceBacked).length
        }
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(quotes, metrics);

      const comparison: QuoteComparison = {
        sowId,
        quotes,
        comparisonMetrics: metrics,
        recommendations,
        riskAnalysis: {
          overallRisk: 'medium',
          priceRisks: [],
          timelineRisks: [],
          qualityRisks: [],
          complianceRisks: [],
          recommendations: []
        },
        generatedAt: new Date().toISOString()
      };

      return {
        success: true,
        data: comparison,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error comparing quotes', { error, sowId });
      throw error;
    }
  }

  async createCommunication(
    sowId: string,
    builderId: string,
    homeownerId: string,
    type: CommunicationType,
    subject: string,
    message: string,
    attachments?: any[]
  ): Promise<ApiResponse<BuilderCommunication>> {
    try {
      const communicationId = uuidv4();
      const now = new Date().toISOString();

      const communication: BuilderCommunication = {
        PK: `SOW#${sowId}`,
        SK: `COMMUNICATION#${communicationId}`,
        id: communicationId,
        sowId,
        builderId,
        homeownerId,
        type,
        subject,
        message,
        attachments: attachments || [],
        status: 'sent',
        priority: 'medium',
        createdAt: now,
        GSI7PK: builderId,
        GSI7SK: now
      };

      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: communication
      }));

      logger.info('Communication created', { communicationId, type, sowId });

      return {
        success: true,
        data: communication,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error creating communication', { error, sowId, builderId });
      throw error;
    }
  }

  async getCommunications(sowId: string): Promise<ApiResponse<BuilderCommunication[]>> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `SOW#${sowId}`,
          ':sk': 'COMMUNICATION#'
        }
      }));

      const communications = (result.Items || []) as BuilderCommunication[];

      return {
        success: true,
        data: communications,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error getting communications', { error, sowId });
      throw error;
    }
  }

  private async getSoW(sowId: string): Promise<ApiResponse<ScopeOfWork>> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `SOW#${sowId}`,
          SK: 'METADATA'
        }
      }));

      if (!result.Item) {
        return {
          success: false,
          error: {
            code: 'SOW_NOT_FOUND',
            message: 'SoW not found'
          },
          timestamp: new Date().toISOString(),
          requestId: uuidv4()
        };
      }

      return {
        success: true,
        data: result.Item as ScopeOfWork,
        timestamp: new Date().toISOString(),
        requestId: uuidv4()
      };

    } catch (error) {
      logger.error('Error getting SoW', { error, sowId });
      throw error;
    }
  }

  private async getBuilderQuoteForSoW(sowId: string, builderId: string): Promise<Quote | null> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'builderId = :builderId',
        ExpressionAttributeValues: {
          ':pk': `SOW#${sowId}`,
          ':sk': 'QUOTE#',
          ':builderId': builderId
        }
      }));

      return result.Items && result.Items.length > 0 ? result.Items[0] as Quote : null;

    } catch (error) {
      logger.error('Error checking existing quote', { error, sowId, builderId });
      return null;
    }
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private generateRecommendations(quotes: Quote[], metrics: ComparisonMetrics): ComparisonRecommendation[] {
    const recommendations: ComparisonRecommendation[] = [];

    // Best value recommendation
    const valueScores = quotes.map(quote => {
      const priceScore = (metrics.priceRange.highest - quote.totalPrice) / 
                        (metrics.priceRange.highest - metrics.priceRange.lowest) * 100;
      const timelineScore = (metrics.timelineRange.longest - quote.timeline.totalDuration) / 
                           (metrics.timelineRange.longest - metrics.timelineRange.shortest) * 100;
      const complianceScore = QuoteModel.getComplianceScore(quote);
      
      return {
        quoteId: quote.id,
        score: (priceScore + timelineScore + complianceScore) / 3
      };
    });

    const bestValue = valueScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    const bestValueQuote = quotes.find(q => q.id === bestValue.quoteId)!;
    recommendations.push({
      type: 'best-value',
      quoteId: bestValue.quoteId,
      reason: 'Best balance of price, timeline, and compliance',
      score: Math.round(bestValue.score),
      pros: [
        `Competitive price: £${bestValueQuote.totalPrice.toLocaleString()}`,
        `Reasonable timeline: ${bestValueQuote.timeline.totalDuration} days`,
        `Good compliance score: ${QuoteModel.getComplianceScore(bestValueQuote)}%`
      ],
      cons: [],
      riskLevel: 'low'
    });

    // Lowest price recommendation
    const lowestPriceQuote = quotes.reduce((lowest, current) => 
      current.totalPrice < lowest.totalPrice ? current : lowest
    );

    recommendations.push({
      type: 'lowest-price',
      quoteId: lowestPriceQuote.id,
      reason: 'Most cost-effective option',
      score: 100,
      pros: [`Lowest price: £${lowestPriceQuote.totalPrice.toLocaleString()}`],
      cons: lowestPriceQuote.totalPrice < metrics.priceRange.average * 0.8 ? 
        ['Significantly below average - verify quality'] : [],
      riskLevel: lowestPriceQuote.totalPrice < metrics.priceRange.average * 0.8 ? 'medium' : 'low'
    });

    // Fastest completion recommendation
    const fastestQuote = quotes.reduce((fastest, current) => 
      current.timeline.totalDuration < fastest.timeline.totalDuration ? current : fastest
    );

    recommendations.push({
      type: 'fastest',
      quoteId: fastestQuote.id,
      reason: 'Shortest completion time',
      score: 100,
      pros: [`Fastest completion: ${fastestQuote.timeline.totalDuration} days`],
      cons: fastestQuote.timeline.totalDuration < metrics.timelineRange.average * 0.8 ? 
        ['Aggressive timeline - verify feasibility'] : [],
      riskLevel: fastestQuote.timeline.totalDuration < metrics.timelineRange.average * 0.8 ? 'medium' : 'low'
    });

    return recommendations;
  }
}