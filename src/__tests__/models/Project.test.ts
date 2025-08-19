import { ProjectModel } from '../../models/Project';
import { ProjectType, ProjectStatus, Address, ProjectRequirements } from '../../types';

describe('ProjectModel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockAddress: Address = {
    line1: '123 Test Street',
    line2: 'Apt 4B',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom'
  };

  const mockRequirements: ProjectRequirements = {
    description: 'Test project description',
    dimensions: {
      length: 5,
      width: 4,
      height: 3,
      unit: 'meters' as const
    },
    materials: {
      quality: 'standard' as const,
      preferences: ['brick', 'timber'],
      restrictions: ['asbestos']
    },
    timeline: {
      startDate: '2025-03-01', // Future date
      endDate: '2025-05-01',   // Future date
      flexibility: 'flexible' as const
    },
    budget: {
      min: 10000,
      max: 20000,
      currency: 'GBP' as const
    },
    specialRequirements: ['wheelchair access']
  };

  describe('create', () => {
    it('should create a new project with required fields', () => {
      const projectData = {
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion' as ProjectType
      };

      const project = ProjectModel.create(projectData);

      expect(project.id).toBeDefined();
      expect(project.PK).toBe(`PROJECT#${project.id}`);
      expect(project.SK).toBe('METADATA');
      expect(project.ownerId).toBe('user123');
      expect(project.propertyAddress).toEqual(mockAddress);
      expect(project.projectType).toBe('loft-conversion');
      expect(project.status).toBe('draft');
      expect(project.documents).toEqual([]);
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
      expect(project.GSI2PK).toBe('draft');
      expect(project.GSI2SK).toBe(project.createdAt);
    });

    it('should create a project with partial requirements', () => {
      const projectData = {
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'bathroom-renovation' as ProjectType,
        requirements: {
          description: 'Bathroom renovation',
          budget: { min: 5000, max: 15000, currency: 'GBP' as const }
        }
      };

      const project = ProjectModel.create(projectData);

      expect(project.requirements.description).toBe('Bathroom renovation');
      expect(project.requirements.budget.min).toBe(5000);
      expect(project.requirements.budget.max).toBe(15000);
      expect(project.requirements.materials.quality).toBe('standard');
      expect(project.requirements.timeline.flexibility).toBe('flexible');
    });

    it('should initialize council data with default values', () => {
      const projectData = {
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'kitchen-renovation' as ProjectType
      };

      const project = ProjectModel.create(projectData);

      expect(project.councilData.conservationArea).toBe(false);
      expect(project.councilData.listedBuilding).toBe(false);
      expect(project.councilData.planningRestrictions).toEqual([]);
      expect(project.councilData.localAuthority).toBe('');
      expect(project.councilData.lastChecked).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update project with new values', () => {
      const originalProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion' as ProjectType
      });

      // Wait a bit to ensure different timestamps
      jest.advanceTimersByTime(1000);

      const updates = {
        status: 'requirements-gathering' as ProjectStatus,
        requirements: mockRequirements
      };

      const updatedProject = ProjectModel.update(originalProject, updates);

      expect(updatedProject.status).toBe('requirements-gathering');
      expect(updatedProject.requirements).toEqual(mockRequirements);
      expect(updatedProject.GSI2PK).toBe('requirements-gathering');
      expect(new Date(updatedProject.updatedAt).getTime()).toBeGreaterThan(new Date(originalProject.updatedAt).getTime());
      expect(updatedProject.createdAt).toBe(originalProject.createdAt);
    });

    it('should not update GSI2PK if status is not changed', () => {
      const originalProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion' as ProjectType
      });

      const updates = {
        requirements: mockRequirements
      };

      const updatedProject = ProjectModel.update(originalProject, updates);

      expect(updatedProject.GSI2PK).toBe(originalProject.GSI2PK);
    });
  });

  describe('validateRequirements', () => {
    it('should return no errors for valid requirements', () => {
      const errors = ProjectModel.validateRequirements(mockRequirements, 'loft-conversion');
      expect(errors).toEqual([]);
    });

    it('should require description', () => {
      const invalidRequirements = {
        ...mockRequirements,
        description: ''
      };

      const errors = ProjectModel.validateRequirements(invalidRequirements, 'loft-conversion');
      expect(errors).toContain('Project description is required');
    });

    it('should validate budget constraints', () => {
      const invalidRequirements = {
        ...mockRequirements,
        budget: {
          min: -1000,
          max: 5000,
          currency: 'GBP' as const
        }
      };

      const errors = ProjectModel.validateRequirements(invalidRequirements, 'loft-conversion');
      expect(errors).toContain('Minimum budget cannot be negative');
    });

    it('should validate budget min/max relationship', () => {
      const invalidRequirements = {
        ...mockRequirements,
        budget: {
          min: 20000,
          max: 10000,
          currency: 'GBP' as const
        }
      };

      const errors = ProjectModel.validateRequirements(invalidRequirements, 'loft-conversion');
      expect(errors).toContain('Maximum budget must be greater than minimum budget');
    });

    it('should validate timeline dates', () => {
      const invalidRequirements = {
        ...mockRequirements,
        timeline: {
          startDate: '2025-05-01',
          endDate: '2025-03-01',
          flexibility: 'flexible' as const
        }
      };

      const errors = ProjectModel.validateRequirements(invalidRequirements, 'loft-conversion');
      expect(errors).toContain('End date must be after start date');
    });

    it('should require dimensions for extension projects', () => {
      const invalidRequirements = {
        ...mockRequirements,
        dimensions: {
          unit: 'meters' as const
        }
      };

      const errors = ProjectModel.validateRequirements(invalidRequirements, 'rear-extension');
      expect(errors).toContain('Dimensions are required for this project type');
    });

    it('should validate positive dimensions', () => {
      const invalidRequirements = {
        ...mockRequirements,
        dimensions: {
          length: -5,
          width: 0,
          height: 2,
          unit: 'meters' as const
        }
      };

      const errors = ProjectModel.validateRequirements(invalidRequirements, 'loft-conversion');
      expect(errors).toContain('Length must be greater than 0');
      expect(errors).toContain('Width must be greater than 0');
    });

    it('should not require dimensions for renovation projects', () => {
      const requirementsWithoutDimensions = {
        ...mockRequirements,
        dimensions: {
          unit: 'meters' as const
        }
      };

      const errors = ProjectModel.validateRequirements(requirementsWithoutDimensions, 'bathroom-renovation');
      expect(errors).not.toContain('Dimensions are required for this project type');
    });
  });

  describe('validateAddress', () => {
    it('should return no errors for valid address', () => {
      const errors = ProjectModel.validateAddress(mockAddress);
      expect(errors).toEqual([]);
    });

    it('should require address line 1', () => {
      const invalidAddress = {
        ...mockAddress,
        line1: ''
      };

      const errors = ProjectModel.validateAddress(invalidAddress);
      expect(errors).toContain('Address line 1 is required');
    });

    it('should require city', () => {
      const invalidAddress = {
        ...mockAddress,
        city: ''
      };

      const errors = ProjectModel.validateAddress(invalidAddress);
      expect(errors).toContain('City is required');
    });

    it('should require postcode', () => {
      const invalidAddress = {
        ...mockAddress,
        postcode: ''
      };

      const errors = ProjectModel.validateAddress(invalidAddress);
      expect(errors).toContain('Postcode is required');
    });

    it('should validate UK postcode format', () => {
      const invalidAddress = {
        ...mockAddress,
        postcode: 'INVALID'
      };

      const errors = ProjectModel.validateAddress(invalidAddress);
      expect(errors).toContain('Invalid UK postcode format');
    });

    it('should accept valid UK postcodes', () => {
      const validPostcodes = ['SW1A 1AA', 'M1 1AA', 'B33 8TH', 'W1A 0AX', 'EC1A 1BB'];
      
      validPostcodes.forEach(postcode => {
        const address = { ...mockAddress, postcode };
        const errors = ProjectModel.validateAddress(address);
        expect(errors).not.toContain('Invalid UK postcode format');
      });
    });

    it('should require country', () => {
      const invalidAddress = {
        ...mockAddress,
        country: ''
      };

      const errors = ProjectModel.validateAddress(invalidAddress);
      expect(errors).toContain('Country is required');
    });
  });

  describe('getProjectTypeInfo', () => {
    it('should return correct info for loft conversion', () => {
      const info = ProjectModel.getProjectTypeInfo('loft-conversion');
      
      expect(info.title).toBe('Loft Conversion');
      expect(info.description).toContain('Convert your unused loft space');
      expect(info.planningRequired).toBe(false);
      expect(info.buildingRegsRequired).toBe(true);
      expect(info.keyConsiderations).toContain('Head height must be at least 2.2m');
    });

    it('should return correct info for rear extension', () => {
      const info = ProjectModel.getProjectTypeInfo('rear-extension');
      
      expect(info.title).toBe('Rear Extension');
      expect(info.planningRequired).toBe(true);
      expect(info.buildingRegsRequired).toBe(true);
      expect(info.keyConsiderations).toContain('Permitted development rights may apply');
    });

    it('should return correct info for bathroom renovation', () => {
      const info = ProjectModel.getProjectTypeInfo('bathroom-renovation');
      
      expect(info.title).toBe('Bathroom Renovation');
      expect(info.planningRequired).toBe(false);
      expect(info.buildingRegsRequired).toBe(false);
    });

    it('should return info for all project types', () => {
      const projectTypes: ProjectType[] = [
        'loft-conversion',
        'rear-extension',
        'side-extension',
        'bathroom-renovation',
        'kitchen-renovation',
        'conservatory',
        'garage-conversion',
        'basement-conversion',
        'roof-replacement',
        'other'
      ];

      projectTypes.forEach(type => {
        const info = ProjectModel.getProjectTypeInfo(type);
        expect(info.title).toBeDefined();
        expect(info.description).toBeDefined();
        expect(info.typicalCost).toBeDefined();
        expect(info.timeframe).toBeDefined();
        expect(typeof info.planningRequired).toBe('boolean');
        expect(typeof info.buildingRegsRequired).toBe('boolean');
        expect(Array.isArray(info.keyConsiderations)).toBe(true);
      });
    });
  });

  describe('getNextSteps', () => {
    it('should return correct next steps for draft status', () => {
      const steps = ProjectModel.getNextSteps('draft');
      
      expect(steps.currentStep).toBe('Project Setup');
      expect(steps.nextStep).toBe('Requirements Gathering');
      expect(steps.actionRequired).toContain('Complete your project requirements');
    });

    it('should return correct next steps for requirements-gathering status', () => {
      const steps = ProjectModel.getNextSteps('requirements-gathering');
      
      expect(steps.currentStep).toBe('Requirements Gathering');
      expect(steps.nextStep).toBe('Council Check');
      expect(steps.actionRequired).toContain('Provide complete project details');
    });

    it('should return correct next steps for completed status', () => {
      const steps = ProjectModel.getNextSteps('completed');
      
      expect(steps.currentStep).toBe('Project Completed');
      expect(steps.nextStep).toBe('None');
      expect(steps.actionRequired).toContain('Leave feedback');
    });

    it('should handle all project statuses', () => {
      const statuses: ProjectStatus[] = [
        'draft',
        'requirements-gathering',
        'council-check',
        'sow-generation',
        'quote-collection',
        'quote-review',
        'contract-generation',
        'active',
        'completed',
        'cancelled'
      ];

      statuses.forEach(status => {
        const steps = ProjectModel.getNextSteps(status);
        expect(steps.currentStep).toBeDefined();
        expect(steps.nextStep).toBeDefined();
        expect(steps.description).toBeDefined();
        expect(steps.actionRequired).toBeDefined();
      });
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should return correct percentages for different statuses', () => {
      const testCases = [
        { status: 'draft' as ProjectStatus, expected: 10 },
        { status: 'requirements-gathering' as ProjectStatus, expected: 25 },
        { status: 'council-check' as ProjectStatus, expected: 40 },
        { status: 'sow-generation' as ProjectStatus, expected: 55 },
        { status: 'quote-collection' as ProjectStatus, expected: 70 },
        { status: 'quote-review' as ProjectStatus, expected: 85 },
        { status: 'contract-generation' as ProjectStatus, expected: 95 },
        { status: 'active' as ProjectStatus, expected: 100 },
        { status: 'completed' as ProjectStatus, expected: 100 },
        { status: 'cancelled' as ProjectStatus, expected: 0 }
      ];

      testCases.forEach(({ status, expected }) => {
        const project = ProjectModel.create({
          ownerId: 'user123',
          propertyAddress: mockAddress,
          projectType: 'loft-conversion'
        });
        
        const updatedProject = ProjectModel.update(project, { status });
        const percentage = ProjectModel.calculateCompletionPercentage(updatedProject);
        
        expect(percentage).toBe(expected);
      });
    });
  });

  describe('sanitizeForResponse', () => {
    it('should remove GSI fields from response', () => {
      const project = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      const sanitized = ProjectModel.sanitizeForResponse(project);

      expect(sanitized).not.toHaveProperty('GSI2PK');
      expect(sanitized).not.toHaveProperty('GSI2SK');
      expect(sanitized.id).toBe(project.id);
      expect(sanitized.ownerId).toBe(project.ownerId);
    });
  });

  describe('addDocument', () => {
    it('should add document to project', () => {
      const project = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      jest.advanceTimersByTime(1000);

      const document = {
        id: 'doc123',
        filename: 'test.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        s3Key: 'documents/doc123.pdf',
        uploadedAt: new Date().toISOString()
      };

      const updatedProject = ProjectModel.addDocument(project, document);

      expect(updatedProject.documents).toHaveLength(1);
      expect(updatedProject.documents[0]).toEqual(document);
      expect(new Date(updatedProject.updatedAt).getTime()).toBeGreaterThan(new Date(project.updatedAt).getTime());
    });
  });

  describe('updateCouncilData', () => {
    it('should update council data', () => {
      const project = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      jest.advanceTimersByTime(1000);

      const councilData = {
        conservationArea: true,
        listedBuilding: false,
        planningRestrictions: ['Conservation area consent required'],
        localAuthority: 'Westminster City Council',
        contactDetails: {
          name: 'Planning Department',
          phone: '020 7641 6500',
          email: 'planning@westminster.gov.uk'
        },
        lastChecked: new Date().toISOString()
      };

      const updatedProject = ProjectModel.updateCouncilData(project, councilData);

      expect(updatedProject.councilData).toEqual(councilData);
      expect(new Date(updatedProject.updatedAt).getTime()).toBeGreaterThan(new Date(project.updatedAt).getTime());
    });
  });
});