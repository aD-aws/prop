import { TemplateService } from '../../services/TemplateService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock AWS clients
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('TemplateService', () => {
  let templateService: TemplateService;
  let mockDynamoClient: jest.Mocked<DynamoDBDocumentClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDynamoClient = {
      send: jest.fn().mockResolvedValue({})
    } as any;

    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDynamoClient);

    templateService = new TemplateService();
  });

  describe('getTemplate', () => {
    it('should return custom template if available', async () => {
      const mockCustomTemplate = {
        id: 'custom1',
        type: 'project_created',
        subject: 'Custom Subject',
        emailTemplate: '<p>Custom {{message}}</p>',
        inAppTemplate: 'Custom {{message}}',
        variables: ['message'],
        isActive: true
      };

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [mockCustomTemplate]
      });

      const result = await templateService.getTemplate('project_created', 'email');

      expect(result).toEqual(mockCustomTemplate);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: '#type = :type AND isActive = :active'
        })
      );
    });

    it('should return default template if no custom template', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: []
      });

      const result = await templateService.getTemplate('project_created', 'email');

      expect(result.type).toBe('project_created');
      expect(result.subject).toBe('Your Home Improvement Project Has Been Created');
      expect(result.emailTemplate).toContain('Welcome to Your Home Improvement Journey!');
    });

    it('should return basic template on error', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('DynamoDB error'));

      const result = await templateService.getTemplate('project_created', 'email');

      expect(result.type).toBe('project_created');
      expect(result.subject).toBe('{{title}}');
      expect(result.emailTemplate).toBe('<p>{{message}}</p>');
    });

    it('should cache templates', async () => {
      const mockCustomTemplate = {
        id: 'custom1',
        type: 'project_created',
        subject: 'Custom Subject',
        emailTemplate: '<p>Custom {{message}}</p>',
        inAppTemplate: 'Custom {{message}}',
        variables: ['message'],
        isActive: true
      };

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [mockCustomTemplate]
      });

      // First call
      const result1 = await templateService.getTemplate('project_created', 'email');
      
      // Second call should use cache
      const result2 = await templateService.getTemplate('project_created', 'email');

      expect(result1).toEqual(mockCustomTemplate);
      expect(result2).toEqual(mockCustomTemplate);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1); // Only called once due to caching
    });
  });

  describe('renderTemplate', () => {
    it('should render template with variables', async () => {
      const template = {
        id: 'template1',
        emailTemplate: '<p>Hello {{userName}}, your {{projectName}} is ready!</p>',
        variables: ['userName', 'projectName']
      } as any;

      const variables = {
        userName: 'John',
        projectName: 'Kitchen Extension'
      };

      const result = await templateService.renderTemplate(template, variables);

      expect(result).toBe('<p>Hello John, your Kitchen Extension is ready!</p>');
    });

    it('should handle missing variables', async () => {
      const template = {
        id: 'template1',
        emailTemplate: '<p>Hello {{userName}}, your {{projectName}} is ready!</p>',
        variables: ['userName', 'projectName']
      } as any;

      const variables = {
        userName: 'John'
        // projectName is missing
      };

      const result = await templateService.renderTemplate(template, variables);

      expect(result).toBe('<p>Hello John, your  is ready!</p>');
    });

    it('should clean up unreplaced variables', async () => {
      const template = {
        id: 'template1',
        emailTemplate: '<p>Hello {{userName}}, your {{unknownVar}} is ready!</p>',
        variables: ['userName']
      } as any;

      const variables = {
        userName: 'John'
      };

      const result = await templateService.renderTemplate(template, variables);

      expect(result).toBe('<p>Hello John, your  is ready!</p>');
    });

    it('should handle rendering errors', async () => {
      const template = {
        id: 'template1',
        emailTemplate: null, // This will cause an error
        variables: []
      } as any;

      const variables = {
        message: 'Test message'
      };

      const result = await templateService.renderTemplate(template, variables);

      expect(result).toBe('Test message');
    });
  });

  describe('createTemplate', () => {
    it('should create new template', async () => {
      const templateData = {
        name: 'Test Template',
        type: 'project_created' as const,
        subject: 'Test Subject',
        emailTemplate: '<p>Test {{message}}</p>',
        inAppTemplate: 'Test {{message}}',
        variables: ['message'],
        isActive: true
      };

      mockDynamoClient.send.mockResolvedValueOnce({});

      const result = await templateService.createTemplate(templateData);

      expect(result).toMatchObject(templateData);
      expect(result.id).toBeDefined();
      expect(result.PK).toBe(`TEMPLATE#${result.id}`);
      expect(result.SK).toBe('METADATA');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining(templateData)
        })
      );
    });
  });

  describe('default templates', () => {
    it('should have template for project_created', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await templateService.getTemplate('project_created', 'email');

      expect(result.subject).toBe('Your Home Improvement Project Has Been Created');
      expect(result.emailTemplate).toContain('Welcome to Your Home Improvement Journey!');
      expect(result.variables).toContain('userName');
      expect(result.variables).toContain('projectName');
    });

    it('should have template for quote_received', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await templateService.getTemplate('quote_received', 'email');

      expect(result.subject).toBe('New Quote Received for Your Project');
      expect(result.emailTemplate).toContain('has submitted a quote');
      expect(result.variables).toContain('builderName');
      expect(result.variables).toContain('totalCost');
    });

    it('should have template for milestone_reached', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await templateService.getTemplate('milestone_reached', 'email');

      expect(result.subject).toBe('Project Milestone Reached');
      expect(result.emailTemplate).toContain('Milestone Achieved!');
      expect(result.variables).toContain('milestone');
      expect(result.variables).toContain('projectName');
    });

    it('should have template for communication_message', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await templateService.getTemplate('communication_message', 'email');

      expect(result.subject).toBe('New Message: {{subject}}');
      expect(result.emailTemplate).toContain('You have a new message from');
      expect(result.variables).toContain('senderName');
      expect(result.variables).toContain('messageContent');
    });

    it('should have template for contract_signed', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await templateService.getTemplate('contract_signed', 'email');

      expect(result.subject).toBe('Contract Signed - Project Can Begin!');
      expect(result.emailTemplate).toContain('Congratulations! Contract Signed');
      expect(result.variables).toContain('builderName');
    });
  });
});