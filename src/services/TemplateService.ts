import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { NotificationTemplate, NotificationType } from '../models/Notification';
import { logger } from '../utils/logger';

export class TemplateService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;
  private templateCache: Map<string, NotificationTemplate> = new Map();

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-west-2'
    });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform';
  }

  async getTemplate(type: NotificationType, channel: 'email' | 'in_app'): Promise<NotificationTemplate> {
    const cacheKey = `${type}_${channel}`;
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    try {
      // Try to get custom template first
      const customTemplate = await this.getCustomTemplate(type);
      if (customTemplate) {
        this.templateCache.set(cacheKey, customTemplate);
        return customTemplate;
      }

      // Fall back to default template
      const defaultTemplate = this.getDefaultTemplate(type, channel);
      this.templateCache.set(cacheKey, defaultTemplate);
      return defaultTemplate;
    } catch (error) {
      logger.error(`Failed to get template for ${type}:`, error);
      // Return basic default template
      return this.getBasicTemplate(type, channel);
    }
  }

  private async getCustomTemplate(type: NotificationType): Promise<NotificationTemplate | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: '#type = :type AND isActive = :active',
        ExpressionAttributeNames: {
          '#type': 'type'
        },
        ExpressionAttributeValues: {
          ':pk': 'TEMPLATE',
          ':type': type,
          ':active': true
        }
      });

      const result = await this.dynamoClient.send(command);
      return result.Items?.[0] as NotificationTemplate || null;
    } catch (error) {
      logger.error('Failed to get custom template:', error);
      return null;
    }
  }

  private getDefaultTemplate(type: NotificationType, channel: 'email' | 'in_app'): NotificationTemplate {
    const templates = this.getDefaultTemplates();
    const template = templates[type];
    
    if (!template) {
      return this.getBasicTemplate(type, channel);
    }

    return {
      PK: `TEMPLATE#default_${type}`,
      SK: 'METADATA',
      id: `default_${type}`,
      name: `Default ${type} Template`,
      type,
      subject: template.subject,
      emailTemplate: template.emailTemplate,
      inAppTemplate: template.inAppTemplate,
      variables: template.variables,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private getBasicTemplate(type: NotificationType, channel: 'email' | 'in_app'): NotificationTemplate {
    return {
      PK: `TEMPLATE#basic_${type}`,
      SK: 'METADATA',
      id: `basic_${type}`,
      name: `Basic ${type} Template`,
      type,
      subject: '{{title}}',
      emailTemplate: '<p>{{message}}</p>',
      inAppTemplate: '{{message}}',
      variables: ['title', 'message'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async renderTemplate(template: NotificationTemplate, variables: Record<string, any>): Promise<string> {
    try {
      const templateContent = template.emailTemplate;
      
      // Simple template rendering - replace {{variable}} with values
      let rendered = templateContent;
      
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, String(value || ''));
      }

      // Clean up any remaining unreplaced variables
      rendered = rendered.replace(/{{[^}]+}}/g, '');

      return rendered;
    } catch (error) {
      logger.error('Failed to render template:', error);
      return variables.message || 'Notification';
    }
  }

  async createTemplate(template: Omit<NotificationTemplate, 'PK' | 'SK' | 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const newTemplate: NotificationTemplate = {
      ...template,
      PK: `TEMPLATE#${id}`,
      SK: 'METADATA',
      id,
      createdAt: now,
      updatedAt: now
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: this.tableName,
      Item: newTemplate
    }));

    // Clear cache to force reload
    this.templateCache.clear();

    return newTemplate;
  }

  private getDefaultTemplates(): Record<NotificationType, {
    subject: string;
    emailTemplate: string;
    inAppTemplate: string;
    variables: string[];
  }> {
    return {
      project_created: {
        subject: 'Your Home Improvement Project Has Been Created',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Your Home Improvement Journey!</h2>
            <p>Hi {{userName}},</p>
            <p>Great news! Your project "{{projectName}}" has been successfully created.</p>
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Upload your structural drawings and specifications</li>
              <li>Complete the project requirements questionnaire</li>
              <li>Review the generated Scope of Work</li>
            </ul>
            <p>We'll guide you through each step to ensure you get accurate quotes from qualified builders.</p>
            <p><a href="{{projectUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Project</a></p>
          </div>
        `,
        inAppTemplate: 'Your project "{{projectName}}" has been created successfully. Click to continue setup.',
        variables: ['userName', 'projectName', 'projectUrl']
      },
      project_updated: {
        subject: 'Project Update: {{projectName}}',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Project Update</h2>
            <p>Hi {{userName}},</p>
            <p>Your project "{{projectName}}" has been updated.</p>
            <p><strong>Changes:</strong> {{updateDetails}}</p>
            <p><a href="{{projectUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Project</a></p>
          </div>
        `,
        inAppTemplate: 'Project "{{projectName}}" has been updated: {{updateDetails}}',
        variables: ['userName', 'projectName', 'updateDetails', 'projectUrl']
      },
      sow_generated: {
        subject: 'Your Scope of Work is Ready',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Scope of Work is Ready!</h2>
            <p>Hi {{userName}},</p>
            <p>We've analyzed your project requirements and generated a comprehensive Scope of Work following UK building standards.</p>
            <p><strong>What's included:</strong></p>
            <ul>
              <li>Detailed specifications following RICS guidelines</li>
              <li>RIBA Plan of Work stages</li>
              <li>Cost estimates using NRM1/NRM2 standards</li>
              <li>Compliance checks for building regulations</li>
            </ul>
            <p><a href="{{sowUrl}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Your SoW</a></p>
          </div>
        `,
        inAppTemplate: 'Your Scope of Work for "{{projectName}}" is ready for review.',
        variables: ['userName', 'projectName', 'sowUrl']
      },
      sow_distributed: {
        subject: 'Your SoW Has Been Sent to Builders',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>SoW Distributed to Builders</h2>
            <p>Hi {{userName}},</p>
            <p>Your Scope of Work has been sent to {{builderCount}} qualified builders in your area.</p>
            <p>You can expect to receive quotes within {{expectedDays}} days.</p>
            <p><a href="{{quotesUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Quotes</a></p>
          </div>
        `,
        inAppTemplate: 'Your SoW has been sent to {{builderCount}} builders. Quotes expected within {{expectedDays}} days.',
        variables: ['userName', 'builderCount', 'expectedDays', 'quotesUrl']
      },
      quote_received: {
        subject: 'New Quote Received for Your Project',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Quote Received!</h2>
            <p>Hi {{userName}},</p>
            <p>{{builderName}} has submitted a quote for your project "{{projectName}}".</p>
            <p><strong>Quote Summary:</strong></p>
            <ul>
              <li>Total Cost: £{{totalCost}}</li>
              <li>Timeline: {{timeline}} weeks</li>
              <li>Warranty: {{warranty}}</li>
            </ul>
            <p><a href="{{quoteUrl}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Quote</a></p>
          </div>
        `,
        inAppTemplate: 'New quote received from {{builderName}} for £{{totalCost}}',
        variables: ['userName', 'projectName', 'builderName', 'totalCost', 'timeline', 'warranty', 'quoteUrl']
      },
      quote_selected: {
        subject: 'Quote Selected - Next Steps',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Quote Selected!</h2>
            <p>Hi {{userName}},</p>
            <p>You've selected the quote from {{builderName}} for your project.</p>
            <p>We're now generating your contract with the agreed terms.</p>
            <p>You'll receive another notification once the contract is ready for review and signing.</p>
          </div>
        `,
        inAppTemplate: 'Quote from {{builderName}} selected. Contract being generated.',
        variables: ['userName', 'builderName']
      },
      contract_generated: {
        subject: 'Your Contract is Ready for Signing',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Contract Ready for Signing</h2>
            <p>Hi {{userName}},</p>
            <p>Your contract with {{builderName}} is ready for review and digital signing.</p>
            <p>The contract includes all agreed terms and complies with UK construction law.</p>
            <p><a href="{{contractUrl}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review & Sign Contract</a></p>
          </div>
        `,
        inAppTemplate: 'Contract with {{builderName}} is ready for signing.',
        variables: ['userName', 'builderName', 'contractUrl']
      },
      contract_signed: {
        subject: 'Contract Signed - Project Can Begin!',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Congratulations! Contract Signed</h2>
            <p>Hi {{userName}},</p>
            <p>Your contract with {{builderName}} has been fully signed.</p>
            <p>Your home improvement project can now begin according to the agreed timeline.</p>
            <p>We'll keep you updated on project milestones and progress.</p>
          </div>
        `,
        inAppTemplate: 'Contract signed with {{builderName}}. Project can now begin!',
        variables: ['userName', 'builderName']
      },
      milestone_reached: {
        subject: 'Project Milestone Reached',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Milestone Achieved!</h2>
            <p>Hi {{userName}},</p>
            <p>Great progress on your project "{{projectName}}"!</p>
            <p><strong>Milestone:</strong> {{milestone}}</p>
            <p>{{milestoneDescription}}</p>
            <p><a href="{{projectUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Progress</a></p>
          </div>
        `,
        inAppTemplate: 'Milestone reached: {{milestone}} for project "{{projectName}}"',
        variables: ['userName', 'projectName', 'milestone', 'milestoneDescription', 'projectUrl']
      },
      communication_message: {
        subject: 'New Message: {{subject}}',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Message</h2>
            <p>Hi {{userName}},</p>
            <p>You have a new message from {{senderName}}:</p>
            <blockquote style="border-left: 4px solid #007bff; padding-left: 15px; margin: 20px 0;">
              {{messageContent}}
            </blockquote>
            <p><a href="{{messageUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reply</a></p>
          </div>
        `,
        inAppTemplate: 'New message from {{senderName}}: {{messageContent}}',
        variables: ['userName', 'senderName', 'subject', 'messageContent', 'messageUrl']
      },
      system_alert: {
        subject: 'System Alert: {{alertType}}',
        emailTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>System Alert</h2>
            <p>Hi {{userName}},</p>
            <p>{{alertMessage}}</p>
            <p>If you need assistance, please contact our support team.</p>
          </div>
        `,
        inAppTemplate: 'System Alert: {{alertMessage}}',
        variables: ['userName', 'alertType', 'alertMessage']
      }
    };
  }
}