describe('User Journey - Project Creation', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('POST', '/api/users/register', {
      statusCode: 200,
      body: {
        token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          userType: 'homeowner',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
    }).as('register');

    cy.intercept('GET', '/api/projects/types', {
      statusCode: 200,
      body: [
        {
          id: 'loft_conversion',
          name: 'Loft Conversion',
          description: 'Convert your loft space',
          estimatedDuration: '4-8 weeks',
          estimatedCost: '£15,000 - £60,000',
          complexity: 'medium',
          requiresPlanning: false,
        },
      ],
    }).as('getProjectTypes');

    cy.intercept('POST', '/api/projects/validate-address', {
      statusCode: 200,
      body: {
        isValid: true,
        councilData: {
          conservationArea: false,
          listedBuilding: false,
          planningRestrictions: [],
          localAuthority: 'Test Council',
        },
      },
    }).as('validateAddress');

    cy.intercept('POST', '/api/projects', {
      statusCode: 200,
      body: {
        id: 'project-1',
        status: 'planning',
        propertyAddress: {
          line1: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'United Kingdom',
        },
        projectType: 'loft_conversion',
        requirements: {
          description: 'Test project description',
        },
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }).as('createProject');
  });

  it('completes the full user journey from registration to project creation', () => {
    // Visit homepage
    cy.visit('/');
    cy.contains('Transform Your Home with AI-Powered Planning').should('be.visible');

    // Navigate to registration
    cy.contains('Sign Up Free').click();
    cy.url().should('include', '/register');

    // Fill registration form
    cy.get('input[name="firstName"]').type('John');
    cy.get('input[name="lastName"]').type('Doe');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Password123');
    cy.get('input[name="confirmPassword"]').type('Password123');
    cy.get('input[value="homeowner"]').check();
    cy.get('input[type="checkbox"]').first().check(); // Terms
    cy.get('input[type="checkbox"]').last().check(); // Privacy

    // Submit registration
    cy.contains('Create Homeowner Account').click();
    cy.wait('@register');

    // Should redirect to dashboard/project creation
    cy.url().should('include', '/dashboard');

    // Navigate to project creation
    cy.contains('Start New Project').click();
    cy.url().should('include', '/projects/create');

    // Step 1: Address
    cy.contains('Property Address').should('be.visible');
    cy.get('input[label="Address Line 1"]').type('123 Test Street');
    cy.get('input[label="City/Town"]').type('London');
    cy.get('input[label="Postcode"]').type('SW1A 1AA');
    cy.contains('Next').click();

    // Step 2: Project Type
    cy.contains('What type of project are you planning?').should('be.visible');
    cy.contains('Loft Conversion').click();
    cy.contains('Next').click();

    // Step 3: Requirements
    cy.contains('Project Requirements').should('be.visible');
    cy.get('textarea[label="Project Description"]').type(
      'I want to convert my loft into a bedroom with an ensuite bathroom. ' +
      'The space should be well-insulated and have plenty of natural light.'
    );
    cy.get('select[label="Preferred Timeline"]').select('Within 3 months');
    cy.contains('Next').click();

    // Step 4: Documents (skip)
    cy.contains('Upload Documents').should('be.visible');
    cy.contains('Next').click();

    // Step 5: Review
    cy.contains('Review Your Project Details').should('be.visible');
    cy.contains('123 Test Street, London, SW1A 1AA').should('be.visible');
    cy.contains('Loft Conversion').should('be.visible');
    cy.contains('Create Project').click();

    cy.wait('@createProject');

    // Should redirect to project dashboard
    cy.url().should('include', '/projects/project-1');
    cy.contains('Loft Conversion Project').should('be.visible');
  });

  it('provides AI assistance throughout the journey', () => {
    cy.visit('/');

    // Open AI assistant
    cy.get('[aria-label="AI Assistant"]').click();
    cy.contains('AI Assistant').should('be.visible');
    cy.contains('Hello! I\'m here to help guide you').should('be.visible');

    // Test quick actions
    cy.contains('What is a loft conversion?').click();
    
    // Should show user message
    cy.contains('What is a loft conversion?').should('be.visible');

    // Close chat
    cy.get('[aria-label="Close chat"]').click();
  });

  it('handles form validation correctly', () => {
    cy.visit('/projects/create');

    // Try to proceed without filling required fields
    cy.contains('Next').should('be.disabled');

    // Fill partial address
    cy.get('input[label="Address Line 1"]').type('123 Test Street');
    cy.contains('Next').should('be.disabled');

    // Complete required fields
    cy.get('input[label="City/Town"]').type('London');
    cy.get('input[label="Postcode"]').type('SW1A 1AA');
    cy.contains('Next').should('not.be.disabled');
  });

  it('displays accessibility features correctly', () => {
    cy.visit('/');

    // Check for skip link
    cy.get('.skip-link').should('exist');

    // Check for proper heading structure
    cy.get('h1').should('contain', 'Transform Your Home with AI-Powered Planning');

    // Check for alt text on important elements
    cy.get('[aria-label]').should('have.length.greaterThan', 0);

    // Check for proper form labels
    cy.visit('/register');
    cy.get('label').should('have.length.greaterThan', 0);
  });
});