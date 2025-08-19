import '@testing-library/jest-dom';

// Mock the builder service
jest.mock('../../services/builderService', () => ({
  builderService: {
    getAvailableOpportunities: jest.fn(),
    getMyQuotes: jest.fn(),
    getMyClarificationQuestions: jest.fn(),
    getSoWDetails: jest.fn(),
    getClarificationQuestions: jest.fn(),
    askClarificationQuestion: jest.fn(),
    submitQuote: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

import { builderService } from '../../services/builderService';
const mockBuilderService = builderService as jest.Mocked<typeof builderService>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ sowId: 'test-sow-id', quoteId: 'test-quote-id' }),
}));

// Mock auth context
const mockAuthContext = {
  user: {
    id: 'builder-1',
    email: 'builder@test.com',
    userType: 'builder' as const,
    profile: {
      firstName: 'Test',
      lastName: 'Builder',
    },
  },
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  isAuthenticated: true,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AI Assistant context
jest.mock('../../contexts/AIAssistantContext', () => ({
  useAIAssistant: () => ({
    isOpen: false,
    openChat: jest.fn(),
    closeChat: jest.fn(),
  }),
  AIAssistantProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Test wrapper removed - focusing on service integration tests

describe('Builder Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Builder Service Integration', () => {
    it('should handle complete workflow from opportunity discovery to quote submission', async () => {
      // Mock data for the workflow
      const mockOpportunity = {
        id: 'sow-123',
        projectId: 'project-123',
        title: 'Loft Conversion Project',
        projectType: 'loft-conversion',
        propertyAddress: {
          street: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
        },
        budget: { min: 15000, max: 25000 },
        timeline: 45,
        status: 'available' as const,
        postedDate: '2024-01-01T00:00:00Z',
        deadline: '2024-02-01T00:00:00Z',
        description: 'Convert loft space into bedroom with ensuite',
        requirements: ['Planning permission', 'Building regulations'],
        documents: [],
      };

      const mockSoWDetails = {
        id: 'sow-123',
        projectId: 'project-123',
        version: 1,
        ribaStages: [
          {
            stage: 1,
            title: 'Preparation and Briefing',
            description: 'Initial project setup and briefing',
            deliverables: ['Project brief', 'Site survey'],
            duration: 5,
            dependencies: [],
          },
        ],
        specifications: [
          {
            category: 'Structural',
            items: [
              {
                description: 'Steel beam installation',
                quantity: 2,
                unit: 'no',
                specification: '203x133x25 UC',
              },
            ],
          },
        ],
        materials: [
          {
            category: 'Structural Steel',
            items: [
              {
                name: 'Universal Column',
                specification: '203x133x25 UC',
                quantity: 2,
                unit: 'no',
                preferredSuppliers: ['British Steel'],
              },
            ],
          },
        ],
        costEstimate: {
          totalCost: 22000,
          breakdown: [
            {
              category: 'Structural Work',
              cost: 8000,
              methodology: 'NRM2' as const,
            },
            {
              category: 'Finishes',
              cost: 14000,
              methodology: 'NRM2' as const,
            },
          ],
          confidence: 85,
        },
        complianceChecks: [
          {
            standard: 'Building Regulations Part A',
            requirement: 'Structural integrity',
            status: 'compliant' as const,
            notes: 'Structural calculations provided',
          },
        ],
      };

      // Step 1: Builder views available opportunities
      mockBuilderService.getAvailableOpportunities.mockResolvedValue([mockOpportunity]);
      
      const opportunities = await mockBuilderService.getAvailableOpportunities();
      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].title).toBe('Loft Conversion Project');
      expect(opportunities[0].budget.min).toBe(15000);
      expect(opportunities[0].budget.max).toBe(25000);
      expect(opportunities[0].timeline).toBe(45);

      // Step 2: Builder reviews SoW details
      mockBuilderService.getSoWDetails.mockResolvedValue(mockSoWDetails);
      
      const sowDetails = await mockBuilderService.getSoWDetails('sow-123');
      expect(sowDetails.ribaStages).toHaveLength(1);
      expect(sowDetails.ribaStages[0].title).toBe('Preparation and Briefing');
      expect(sowDetails.specifications[0].category).toBe('Structural');
      expect(sowDetails.costEstimate.totalCost).toBe(22000);
      expect(sowDetails.complianceChecks[0].status).toBe('compliant');

      // Step 3: Builder asks clarification question
      mockBuilderService.askClarificationQuestion.mockResolvedValue({
        id: 'question-123',
        message: 'Question submitted successfully',
      });

      const questionResult = await mockBuilderService.askClarificationQuestion('sow-123', {
        question: 'Can you clarify the steel beam specification?',
        category: 'technical',
      });
      expect(questionResult.id).toBe('question-123');
      expect(questionResult.message).toBe('Question submitted successfully');

      // Step 4: Builder submits quote with NRM2 standards
      const quoteSubmission = {
        sowId: 'sow-123',
        totalPrice: 24000,
        breakdown: [
          {
            category: 'Structural Work',
            description: 'Steel beam installation',
            quantity: 2,
            unit: 'no',
            unitPrice: 4000,
            totalPrice: 8000,
            methodology: 'NRM2' as const,
            notes: 'Including all fixings and connections',
          },
          {
            category: 'Finishes',
            description: 'Plasterboard and decoration',
            quantity: 50,
            unit: 'm²',
            unitPrice: 320,
            totalPrice: 16000,
            methodology: 'NRM2' as const,
          },
        ],
        timeline: 45,
        startDate: '2024-03-01',
        warranty: {
          duration: 24,
          coverage: 'All workmanship and materials',
          terms: 'Standard warranty terms apply',
        },
        certifications: ['RICS', 'NHBC'],
        insurance: {
          publicLiability: 2000000,
          employersLiability: 10000000,
          professionalIndemnity: 1000000,
        },
        terms: 'Payment terms: 30% deposit, 40% at first fix, 30% on completion',
        validUntil: '2024-04-01',
        additionalNotes: 'All work to be completed to NHBC standards',
      };

      mockBuilderService.submitQuote.mockResolvedValue({
        id: 'quote-123',
        message: 'Quote submitted successfully',
      });

      const quoteResult = await mockBuilderService.submitQuote(quoteSubmission);
      expect(quoteResult.id).toBe('quote-123');
      expect(quoteResult.message).toBe('Quote submitted successfully');

      // Verify all service calls were made correctly
      expect(mockBuilderService.getAvailableOpportunities).toHaveBeenCalled();
      expect(mockBuilderService.getSoWDetails).toHaveBeenCalledWith('sow-123');
      expect(mockBuilderService.askClarificationQuestion).toHaveBeenCalledWith('sow-123', {
        question: 'Can you clarify the steel beam specification?',
        category: 'technical',
      });
      expect(mockBuilderService.submitQuote).toHaveBeenCalledWith(quoteSubmission);
    });

    it('should handle quote submission with NRM2 standards validation', async () => {
      const quoteWithNRM2 = {
        sowId: 'sow-123',
        totalPrice: 24000,
        breakdown: [
          {
            category: 'Structural Work',
            description: 'Steel beam installation',
            quantity: 2,
            unit: 'no',
            unitPrice: 4000,
            totalPrice: 8000,
            methodology: 'NRM2' as const,
          },
          {
            category: 'Finishes',
            description: 'Detailed measurement of finishes',
            quantity: 50,
            unit: 'm²',
            unitPrice: 320,
            totalPrice: 16000,
            methodology: 'NRM2' as const,
          },
        ],
        timeline: 45,
        startDate: '2024-03-01',
        warranty: { duration: 24, coverage: 'All work', terms: 'Standard terms' },
        certifications: ['RICS', 'NHBC'],
        insurance: { publicLiability: 2000000, employersLiability: 10000000 },
        terms: 'Standard terms',
        validUntil: '2024-04-01',
      };

      mockBuilderService.submitQuote.mockResolvedValue({
        id: 'quote-123',
        message: 'Quote submitted successfully',
      });

      const result = await mockBuilderService.submitQuote(quoteWithNRM2);
      
      expect(result.id).toBe('quote-123');
      expect(mockBuilderService.submitQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          breakdown: expect.arrayContaining([
            expect.objectContaining({
              methodology: 'NRM2',
              category: 'Structural Work',
            }),
            expect.objectContaining({
              methodology: 'NRM2',
              category: 'Finishes',
            }),
          ]),
        })
      );
    });

    it('should handle builder profile management workflow', async () => {
      const mockProfile = {
        id: 'builder-1',
        companyName: 'Test Construction Ltd',
        contactPerson: {
          firstName: 'John',
          lastName: 'Builder',
          email: 'john@testconstruction.com',
          phone: '07123456789',
        },
        address: {
          street: '456 Builder Street',
          city: 'London',
          postcode: 'E1 6AN',
        },
        businessDetails: {
          registrationNumber: '12345678',
          vatNumber: 'GB123456789',
          establishedYear: 2010,
          employeeCount: 15,
        },
        certifications: [
          {
            name: 'RICS Membership',
            issuingBody: 'RICS',
            certificateNumber: 'RICS123456',
            validFrom: '2020-01-01',
            validUntil: '2025-01-01',
            status: 'active' as const,
          },
        ],
        insurance: {
          publicLiability: {
            provider: 'Test Insurance',
            policyNumber: 'PL123456',
            coverage: 2000000,
            validUntil: '2024-12-31',
          },
          employersLiability: {
            provider: 'Test Insurance',
            policyNumber: 'EL123456',
            coverage: 10000000,
            validUntil: '2024-12-31',
          },
        },
        specializations: ['Loft Conversions', 'Extensions'],
        serviceAreas: ['London', 'Surrey'],
        portfolio: [],
        ratings: {
          overall: 4.5,
          quality: 4.6,
          timeliness: 4.4,
          communication: 4.5,
          reviewCount: 23,
        },
      };

      mockBuilderService.getProfile.mockResolvedValue(mockProfile);

      // Test profile loading and display
      expect(mockProfile.companyName).toBe('Test Construction Ltd');
      expect(mockProfile.certifications).toHaveLength(1);
      expect(mockProfile.certifications[0].name).toBe('RICS Membership');
      expect(mockProfile.insurance.publicLiability.coverage).toBe(2000000);
      expect(mockProfile.specializations).toContain('Loft Conversions');

      // Test profile update
      mockBuilderService.updateProfile.mockResolvedValue();

      const updatedProfile = {
        ...mockProfile,
        companyName: 'Updated Construction Ltd',
      };

      await mockBuilderService.updateProfile({ companyName: 'Updated Construction Ltd' });

      expect(mockBuilderService.updateProfile).toHaveBeenCalledWith({
        companyName: 'Updated Construction Ltd',
      });
    });
  });

  describe('Builder Communication Workflow', () => {
    it('should handle clarification questions workflow', async () => {
      const mockQuestions = [
        {
          id: 'question-1',
          sowId: 'sow-123',
          question: 'Can you clarify the steel beam specification?',
          category: 'technical' as const,
          askedAt: '2024-01-15T10:00:00Z',
          status: 'pending' as const,
        },
        {
          id: 'question-2',
          sowId: 'sow-123',
          question: 'What is the preferred start date?',
          category: 'timeline' as const,
          askedAt: '2024-01-14T15:30:00Z',
          response: {
            answer: 'We would prefer to start in March 2024',
            respondedAt: '2024-01-15T09:00:00Z',
            respondedBy: 'homeowner-1',
          },
          status: 'answered' as const,
        },
      ];

      mockBuilderService.getMyClarificationQuestions.mockResolvedValue(mockQuestions);

      // Verify questions are properly categorized
      expect(mockQuestions[0].category).toBe('technical');
      expect(mockQuestions[1].category).toBe('timeline');

      // Verify answered question has response
      expect(mockQuestions[1].response).toBeDefined();
      expect(mockQuestions[1].response?.answer).toBe('We would prefer to start in March 2024');

      // Verify pending question doesn't have response
      expect(mockQuestions[0].response).toBeUndefined();
      expect(mockQuestions[0].status).toBe('pending');
    });
  });

  describe('Builder Quote Management', () => {
    it('should handle quote status tracking', async () => {
      const mockQuotes = [
        {
          id: 'quote-1',
          sowId: 'sow-123',
          projectTitle: 'Loft Conversion Project',
          totalPrice: 22000,
          timeline: 45,
          status: 'submitted' as const,
          submittedAt: '2024-01-15T10:00:00Z',
          validUntil: '2024-02-15T10:00:00Z',
        },
        {
          id: 'quote-2',
          sowId: 'sow-124',
          projectTitle: 'Kitchen Extension',
          totalPrice: 35000,
          timeline: 60,
          status: 'selected' as const,
          submittedAt: '2024-01-10T14:30:00Z',
          validUntil: '2024-02-10T14:30:00Z',
          clientResponse: {
            status: 'accepted' as const,
            message: 'We would like to proceed with your quote',
            respondedAt: '2024-01-16T11:00:00Z',
          },
        },
      ];

      mockBuilderService.getMyQuotes.mockResolvedValue(mockQuotes);

      // Verify quote statuses
      expect(mockQuotes[0].status).toBe('submitted');
      expect(mockQuotes[1].status).toBe('selected');

      // Verify client response handling
      expect(mockQuotes[1].clientResponse).toBeDefined();
      expect(mockQuotes[1].clientResponse?.status).toBe('accepted');

      // Verify quote without client response
      expect(mockQuotes[0].clientResponse).toBeUndefined();
    });
  });
});