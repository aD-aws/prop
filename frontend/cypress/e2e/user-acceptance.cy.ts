describe('User Acceptance Tests - Complete User Journeys', () => {
  beforeEach(() => {
    // Reset database state before each test
    cy.task('resetDatabase');
    cy.visit('/');
  });

  describe('Homeowner Journey - Loft Conversion Project', () => {
    it('should complete full homeowner journey from registration to contract signing', () => {
      // Step 1: User Registration
      cy.get('[data-testid="register-button"]').click();
      cy.get('[data-testid="email-input"]').type('homeowner@example.com');
      cy.get('[data-testid="password-input"]').type('SecurePassword123!');
      cy.get('[data-testid="confirm-password-input"]').type('SecurePassword123!');
      cy.get('[data-testid="user-type-select"]').select('homeowner');
      cy.get('[data-testid="first-name-input"]').type('John');
      cy.get('[data-testid="last-name-input"]').type('Smith');
      cy.get('[data-testid="register-submit"]').click();

      // Verify registration success
      cy.url().should('include', '/onboarding');
      cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome, John');

      // Step 2: Onboarding Process
      cy.get('[data-testid="start-project-button"]').click();
      cy.url().should('include', '/project-creation');

      // Step 3: Property Address Input
      cy.get('[data-testid="address-line1"]').type('123 Test Street');
      cy.get('[data-testid="address-city"]').type('London');
      cy.get('[data-testid="address-postcode"]').type('SW1A 1AA');
      cy.get('[data-testid="address-country"]').select('UK');
      cy.get('[data-testid="validate-address-button"]').click();

      // Wait for address validation
      cy.get('[data-testid="address-validation-success"]', { timeout: 10000 })
        .should('be.visible');
      cy.get('[data-testid="next-step-button"]').click();

      // Step 4: Project Type Selection
      cy.get('[data-testid="project-type-loft-conversion"]').click();
      cy.get('[data-testid="project-info-modal"]').should('be.visible');
      cy.get('[data-testid="understand-button"]').click();
      cy.get('[data-testid="next-step-button"]').click();

      // Step 5: Requirements Input
      cy.get('[data-testid="project-description"]')
        .type('Convert loft into master bedroom with en-suite bathroom');
      
      // Dimensions
      cy.get('[data-testid="dimension-length"]').type('6');
      cy.get('[data-testid="dimension-width"]').type('4');
      cy.get('[data-testid="dimension-height"]').type('2.5');

      // Materials
      cy.get('[data-testid="flooring-select"]').select('engineered_wood');
      cy.get('[data-testid="insulation-select"]').select('mineral_wool');

      // Timeline
      cy.get('[data-testid="start-date"]').type('2024-04-01');
      cy.get('[data-testid="end-date"]').type('2024-06-01');

      // Budget
      cy.get('[data-testid="budget-min"]').type('20000');
      cy.get('[data-testid="budget-max"]').type('35000');

      // Special requirements
      cy.get('[data-testid="special-requirement-velux-windows"]').check();
      cy.get('[data-testid="special-requirement-en-suite"]').check();

      cy.get('[data-testid="next-step-button"]').click();

      // Step 6: Document Upload
      cy.get('[data-testid="document-upload-area"]').should('be.visible');
      
      // Upload structural drawing
      const fileName = 'structural-drawing.pdf';
      cy.fixture(fileName).then(fileContent => {
        cy.get('[data-testid="file-input"]').selectFile({
          contents: Cypress.Buffer.from(fileContent),
          fileName: fileName,
          mimeType: 'application/pdf'
        });
      });

      cy.get('[data-testid="document-type-select"]').select('structural_drawing');
      cy.get('[data-testid="upload-button"]').click();

      // Wait for upload and processing
      cy.get('[data-testid="upload-success"]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-testid="ai-analysis-complete"]', { timeout: 60000 }).should('be.visible');

      cy.get('[data-testid="next-step-button"]').click();

      // Step 7: Review and Submit
      cy.get('[data-testid="project-summary"]').should('be.visible');
      cy.get('[data-testid="project-summary"]').should('contain', 'loft conversion');
      cy.get('[data-testid="project-summary"]').should('contain', '£20,000 - £35,000');
      
      cy.get('[data-testid="submit-project-button"]').click();

      // Step 8: SoW Generation
      cy.get('[data-testid="sow-generation-progress"]', { timeout: 10000 })
        .should('be.visible');
      cy.get('[data-testid="sow-generation-complete"]', { timeout: 120000 })
        .should('be.visible');

      // Verify SoW content
      cy.get('[data-testid="sow-content"]').should('be.visible');
      cy.get('[data-testid="riba-stages"]').should('have.length', 8);
      cy.get('[data-testid="cost-estimate"]').should('be.visible');
      cy.get('[data-testid="compliance-checks"]').should('be.visible');

      // Step 9: SoW Review and Approval
      cy.get('[data-testid="sow-review-section"]').should('be.visible');
      cy.get('[data-testid="approve-sow-button"]').click();

      // Step 10: Builder Selection
      cy.get('[data-testid="builder-selection-modal"]').should('be.visible');
      cy.get('[data-testid="builder-checkbox"]').first().check();
      cy.get('[data-testid="builder-checkbox"]').eq(1).check();
      cy.get('[data-testid="builder-checkbox"]').eq(2).check();
      cy.get('[data-testid="send-to-builders-button"]').click();

      // Verify distribution success
      cy.get('[data-testid="distribution-success"]').should('be.visible');
      cy.get('[data-testid="go-to-dashboard-button"]').click();

      // Step 11: Dashboard - Wait for Quotes
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="project-status"]').should('contain', 'Awaiting Quotes');
      cy.get('[data-testid="quotes-received"]').should('contain', '0 of 3');

      // Simulate quote submission (this would normally be done by builders)
      cy.task('submitMockQuotes', { projectId: 'test-project-id' });

      // Refresh to see quotes
      cy.reload();
      cy.get('[data-testid="quotes-received"]', { timeout: 10000 })
        .should('contain', '3 of 3');

      // Step 12: Quote Comparison
      cy.get('[data-testid="view-quotes-button"]').click();
      cy.get('[data-testid="quote-comparison-table"]').should('be.visible');
      
      // Verify quote details
      cy.get('[data-testid="quote-row"]').should('have.length', 3);
      cy.get('[data-testid="quote-price"]').should('be.visible');
      cy.get('[data-testid="quote-timeline"]').should('be.visible');
      cy.get('[data-testid="quote-rating"]').should('be.visible');

      // Step 13: Quote Selection
      cy.get('[data-testid="select-quote-button"]').first().click();
      cy.get('[data-testid="selection-confirmation-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-selection-button"]').click();

      // Step 14: Contract Generation
      cy.get('[data-testid="contract-generation-progress"]', { timeout: 10000 })
        .should('be.visible');
      cy.get('[data-testid="contract-ready"]', { timeout: 60000 })
        .should('be.visible');

      // Step 15: Contract Review
      cy.get('[data-testid="review-contract-button"]').click();
      cy.get('[data-testid="contract-content"]').should('be.visible');
      cy.get('[data-testid="contract-terms"]').should('contain', 'loft conversion');
      cy.get('[data-testid="contract-price"]').should('be.visible');

      // Step 16: Digital Signature
      cy.get('[data-testid="sign-contract-button"]').click();
      cy.get('[data-testid="digital-signature-modal"]').should('be.visible');
      cy.get('[data-testid="signature-pad"]').should('be.visible');
      
      // Simulate signature
      cy.get('[data-testid="signature-pad"]').trigger('mousedown', { which: 1 });
      cy.get('[data-testid="signature-pad"]').trigger('mousemove', { clientX: 100, clientY: 100 });
      cy.get('[data-testid="signature-pad"]').trigger('mouseup');
      
      cy.get('[data-testid="confirm-signature-button"]').click();

      // Step 17: Journey Completion
      cy.get('[data-testid="contract-signed-success"]').should('be.visible');
      cy.get('[data-testid="project-status"]').should('contain', 'Contract Signed');
      cy.get('[data-testid="next-steps"]').should('be.visible');
      cy.get('[data-testid="builder-contact-info"]').should('be.visible');
    });

    it('should handle project creation with missing information gracefully', () => {
      // Register and login
      cy.register('incomplete@example.com', 'Password123!', 'homeowner');
      cy.login('incomplete@example.com', 'Password123!');

      // Start project creation
      cy.visit('/project-creation');

      // Skip address validation
      cy.get('[data-testid="next-step-button"]').click();
      cy.get('[data-testid="address-error"]').should('be.visible');

      // Fill minimal address info
      cy.get('[data-testid="address-postcode"]').type('SW1A 1AA');
      cy.get('[data-testid="validate-address-button"]').click();
      cy.get('[data-testid="address-validation-success"]', { timeout: 10000 })
        .should('be.visible');
      cy.get('[data-testid="next-step-button"]').click();

      // Select project type but skip requirements
      cy.get('[data-testid="project-type-extension"]').click();
      cy.get('[data-testid="understand-button"]').click();
      cy.get('[data-testid="next-step-button"]').click();

      // Try to proceed without requirements
      cy.get('[data-testid="next-step-button"]').click();
      cy.get('[data-testid="requirements-error"]').should('be.visible');

      // Fill minimal requirements
      cy.get('[data-testid="project-description"]').type('Basic extension');
      cy.get('[data-testid="dimension-length"]').type('4');
      cy.get('[data-testid="dimension-width"]').type('3');
      cy.get('[data-testid="budget-min"]').type('15000');
      cy.get('[data-testid="budget-max"]').type('25000');

      cy.get('[data-testid="next-step-button"]').click();

      // Skip document upload
      cy.get('[data-testid="skip-documents-button"]').click();
      cy.get('[data-testid="skip-confirmation-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-skip-button"]').click();

      // Should still be able to generate SoW with AI assistance
      cy.get('[data-testid="submit-project-button"]').click();
      cy.get('[data-testid="sow-generation-complete"]', { timeout: 120000 })
        .should('be.visible');
    });
  });

  describe('Builder Journey - Quote Submission Process', () => {
    it('should complete full builder journey from registration to quote submission', () => {
      // Step 1: Builder Registration
      cy.get('[data-testid="register-button"]').click();
      cy.get('[data-testid="email-input"]').type('builder@example.com');
      cy.get('[data-testid="password-input"]').type('BuilderPass123!');
      cy.get('[data-testid="confirm-password-input"]').type('BuilderPass123!');
      cy.get('[data-testid="user-type-select"]').select('builder');
      cy.get('[data-testid="first-name-input"]').type('Mike');
      cy.get('[data-testid="last-name-input"]').type('Johnson');
      cy.get('[data-testid="company-name-input"]').type('Johnson Construction Ltd');
      cy.get('[data-testid="register-submit"]').click();

      // Step 2: Builder Profile Setup
      cy.url().should('include', '/builder-onboarding');
      
      // Add certifications
      cy.get('[data-testid="add-certification-button"]').click();
      cy.get('[data-testid="certification-name"]').type('NHBC Registered');
      cy.get('[data-testid="certification-number"]').type('NH123456');
      cy.get('[data-testid="certification-expiry"]').type('2025-12-31');
      cy.get('[data-testid="save-certification-button"]').click();

      // Add insurance details
      cy.get('[data-testid="insurance-provider"]').type('BuildSure Insurance');
      cy.get('[data-testid="insurance-policy"]').type('BS789012');
      cy.get('[data-testid="insurance-amount"]').type('2000000');
      cy.get('[data-testid="insurance-expiry"]').type('2024-12-31');

      cy.get('[data-testid="complete-profile-button"]').click();

      // Step 3: Builder Dashboard
      cy.url().should('include', '/builder-dashboard');
      cy.get('[data-testid="available-projects"]').should('be.visible');

      // Create a mock SoW for the builder to quote on
      cy.task('createMockSoW', {
        projectType: 'loft_conversion',
        location: 'London',
        budget: { min: 20000, max: 35000 }
      });

      // Refresh to see new SoW
      cy.reload();
      cy.get('[data-testid="sow-invitation"]', { timeout: 10000 }).should('be.visible');

      // Step 4: SoW Review
      cy.get('[data-testid="view-sow-button"]').first().click();
      cy.get('[data-testid="sow-details-modal"]').should('be.visible');
      
      // Review SoW content
      cy.get('[data-testid="project-description"]').should('be.visible');
      cy.get('[data-testid="riba-stages"]').should('be.visible');
      cy.get('[data-testid="specifications"]').should('be.visible');
      cy.get('[data-testid="materials-list"]').should('be.visible');

      // Step 5: Ask Clarification Question
      cy.get('[data-testid="ask-question-button"]').click();
      cy.get('[data-testid="question-modal"]').should('be.visible');
      cy.get('[data-testid="question-text"]')
        .type('Could you clarify the preferred type of Velux windows?');
      cy.get('[data-testid="send-question-button"]').click();
      cy.get('[data-testid="question-sent-confirmation"]').should('be.visible');

      cy.get('[data-testid="close-modal-button"]').click();

      // Step 6: Quote Preparation
      cy.get('[data-testid="prepare-quote-button"]').click();
      cy.get('[data-testid="quote-form"]').should('be.visible');

      // Fill quote details
      cy.get('[data-testid="total-price"]').type('28500');
      cy.get('[data-testid="timeline-days"]').type('45');

      // Add itemized breakdown
      cy.get('[data-testid="add-line-item-button"]').click();
      cy.get('[data-testid="line-item-description"]').type('Structural work and steel beams');
      cy.get('[data-testid="line-item-quantity"]').type('1');
      cy.get('[data-testid="line-item-rate"]').type('8500');
      cy.get('[data-testid="save-line-item-button"]').click();

      cy.get('[data-testid="add-line-item-button"]').click();
      cy.get('[data-testid="line-item-description"]').type('Insulation and flooring');
      cy.get('[data-testid="line-item-quantity"]').type('24');
      cy.get('[data-testid="line-item-unit"]').select('m²');
      cy.get('[data-testid="line-item-rate"]').type('125');
      cy.get('[data-testid="save-line-item-button"]').click();

      cy.get('[data-testid="add-line-item-button"]').click();
      cy.get('[data-testid="line-item-description"]').type('Velux windows and installation');
      cy.get('[data-testid="line-item-quantity"]').type('2');
      cy.get('[data-testid="line-item-rate"]').type('1200');
      cy.get('[data-testid="save-line-item-button"]').click();

      // Add warranty information
      cy.get('[data-testid="warranty-period"]').type('10');
      cy.get('[data-testid="warranty-terms"]')
        .type('Full structural warranty for 10 years, materials warranty for 5 years');

      // Add terms and conditions
      cy.get('[data-testid="payment-terms"]')
        .type('25% deposit, 50% at first fix, 25% on completion');
      cy.get('[data-testid="additional-terms"]')
        .type('Price valid for 30 days. Excludes planning permission costs.');

      // Step 7: Quote Submission
      cy.get('[data-testid="submit-quote-button"]').click();
      cy.get('[data-testid="quote-confirmation-modal"]').should('be.visible');
      
      // Review quote summary
      cy.get('[data-testid="quote-total"]').should('contain', '£28,500');
      cy.get('[data-testid="quote-timeline"]').should('contain', '45 days');
      
      cy.get('[data-testid="confirm-quote-submission"]').click();

      // Step 8: Submission Success
      cy.get('[data-testid="quote-submitted-success"]').should('be.visible');
      cy.get('[data-testid="quote-reference"]').should('be.visible');
      
      // Return to dashboard
      cy.get('[data-testid="return-to-dashboard-button"]').click();
      cy.url().should('include', '/builder-dashboard');

      // Step 9: Track Quote Status
      cy.get('[data-testid="submitted-quotes"]').should('be.visible');
      cy.get('[data-testid="quote-status"]').should('contain', 'Submitted');
      cy.get('[data-testid="quote-date"]').should('be.visible');

      // Simulate quote selection by homeowner
      cy.task('selectQuote', { quoteId: 'test-quote-id' });

      // Refresh to see status update
      cy.reload();
      cy.get('[data-testid="quote-status"]', { timeout: 10000 })
        .should('contain', 'Selected');
      
      // Step 10: Contract Notification
      cy.get('[data-testid="contract-notification"]').should('be.visible');
      cy.get('[data-testid="view-contract-button"]').click();
      
      // Review contract
      cy.get('[data-testid="contract-details"]').should('be.visible');
      cy.get('[data-testid="contract-terms"]').should('contain', 'loft conversion');
      
      // Sign contract
      cy.get('[data-testid="sign-contract-button"]').click();
      cy.get('[data-testid="digital-signature-modal"]').should('be.visible');
      
      // Simulate signature
      cy.get('[data-testid="signature-pad"]').trigger('mousedown', { which: 1 });
      cy.get('[data-testid="signature-pad"]').trigger('mousemove', { clientX: 150, clientY: 80 });
      cy.get('[data-testid="signature-pad"]').trigger('mouseup');
      
      cy.get('[data-testid="confirm-signature-button"]').click();

      // Step 11: Project Commencement
      cy.get('[data-testid="contract-signed-success"]').should('be.visible');
      cy.get('[data-testid="project-status"]').should('contain', 'Active');
      cy.get('[data-testid="homeowner-contact"]').should('be.visible');
      cy.get('[data-testid="project-timeline"]').should('be.visible');
    });

    it('should handle quote rejection gracefully', () => {
      // Setup: Register builder and create mock SoW
      cy.register('rejected@example.com', 'Password123!', 'builder');
      cy.login('rejected@example.com', 'Password123!');
      cy.task('createMockSoW', { projectType: 'extension' });

      cy.visit('/builder-dashboard');
      
      // Submit a quote
      cy.get('[data-testid="prepare-quote-button"]').first().click();
      cy.get('[data-testid="total-price"]').type('35000');
      cy.get('[data-testid="timeline-days"]').type('60');
      cy.get('[data-testid="submit-quote-button"]').click();
      cy.get('[data-testid="confirm-quote-submission"]').click();

      // Simulate quote rejection
      cy.task('rejectQuote', { quoteId: 'test-quote-id' });

      // Check rejection notification
      cy.reload();
      cy.get('[data-testid="quote-status"]', { timeout: 10000 })
        .should('contain', 'Not Selected');
      cy.get('[data-testid="rejection-feedback"]').should('be.visible');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', () => {
      // Simulate network failure
      cy.intercept('POST', '/api/projects', { forceNetworkError: true }).as('networkError');

      cy.register('network@example.com', 'Password123!', 'homeowner');
      cy.login('network@example.com', 'Password123!');

      // Try to create project with network failure
      cy.visit('/project-creation');
      cy.fillProjectForm();
      cy.get('[data-testid="submit-project-button"]').click();

      // Should show error message and retry option
      cy.get('[data-testid="network-error"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');

      // Restore network and retry
      cy.intercept('POST', '/api/projects').as('projectCreation');
      cy.get('[data-testid="retry-button"]').click();

      cy.wait('@projectCreation');
      cy.get('[data-testid="sow-generation-progress"]').should('be.visible');
    });

    it('should handle session expiration during long processes', () => {
      cy.register('session@example.com', 'Password123!', 'homeowner');
      cy.login('session@example.com', 'Password123!');

      // Start project creation
      cy.visit('/project-creation');
      cy.fillProjectForm();

      // Simulate session expiration
      cy.clearCookies();
      cy.clearLocalStorage();

      cy.get('[data-testid="submit-project-button"]').click();

      // Should redirect to login with return URL
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should('be.visible');

      // Login again
      cy.get('[data-testid="email-input"]').type('session@example.com');
      cy.get('[data-testid="password-input"]').type('Password123!');
      cy.get('[data-testid="login-submit"]').click();

      // Should return to project creation with data preserved
      cy.url().should('include', '/project-creation');
      cy.get('[data-testid="project-description"]').should('not.be.empty');
    });

    it('should handle file upload failures', () => {
      cy.register('upload@example.com', 'Password123!', 'homeowner');
      cy.login('upload@example.com', 'Password123!');

      cy.visit('/project-creation');
      cy.fillBasicProjectInfo();

      // Navigate to document upload
      cy.get('[data-testid="next-step-button"]').click();
      cy.get('[data-testid="next-step-button"]').click();
      cy.get('[data-testid="next-step-button"]').click();

      // Simulate upload failure
      cy.intercept('POST', '/api/projects/*/documents', { statusCode: 500 }).as('uploadError');

      // Try to upload file
      cy.fixture('test-document.pdf').then(fileContent => {
        cy.get('[data-testid="file-input"]').selectFile({
          contents: Cypress.Buffer.from(fileContent),
          fileName: 'test-document.pdf',
          mimeType: 'application/pdf'
        });
      });

      cy.get('[data-testid="upload-button"]').click();

      // Should show error and retry option
      cy.get('[data-testid="upload-error"]').should('be.visible');
      cy.get('[data-testid="retry-upload-button"]').should('be.visible');

      // Should allow continuing without documents
      cy.get('[data-testid="continue-without-documents"]').should('be.visible');
      cy.get('[data-testid="continue-without-documents"]').click();

      cy.get('[data-testid="next-step-button"]').click();
      cy.get('[data-testid="submit-project-button"]').should('be.visible');
    });
  });

  describe('Accessibility User Journey', () => {
    it('should be fully navigable using keyboard only', () => {
      cy.visit('/');

      // Navigate to registration using keyboard
      cy.get('body').tab();
      cy.focused().should('contain', 'Register');
      cy.focused().type('{enter}');

      // Fill registration form using keyboard
      cy.focused().type('keyboard@example.com');
      cy.focused().tab().type('Password123!');
      cy.focused().tab().type('Password123!');
      cy.focused().tab().select('homeowner');
      cy.focused().tab().type('Keyboard');
      cy.focused().tab().type('User');
      cy.focused().tab().type('{enter}');

      // Continue navigation through project creation
      cy.url().should('include', '/onboarding');
      cy.get('body').tab();
      cy.focused().type('{enter}');

      // Verify all interactive elements are reachable
      cy.get('[data-testid="address-line1"]').should('be.visible');
      cy.focused().type('123 Keyboard Street');
      
      // Continue through the form using tab navigation
      for (let i = 0; i < 10; i++) {
        cy.focused().tab();
      }

      // Should be able to complete entire journey with keyboard
      cy.get('[data-testid="submit-project-button"]').should('be.visible');
    });

    it('should work with screen reader announcements', () => {
      cy.visit('/');
      
      // Check for proper ARIA labels and live regions
      cy.get('[aria-live="polite"]').should('exist');
      cy.get('[role="main"]').should('exist');
      cy.get('[role="navigation"]').should('exist');

      // Register and start project
      cy.register('screen@example.com', 'Password123!', 'homeowner');
      cy.login('screen@example.com', 'Password123!');

      cy.visit('/project-creation');

      // Check that form progress is announced
      cy.get('[data-testid="progress-indicator"]').should('have.attr', 'aria-live');
      cy.get('[data-testid="step-description"]').should('have.attr', 'aria-live');

      // Fill form and check announcements
      cy.get('[data-testid="address-line1"]').type('123 Screen Reader Street');
      cy.get('[data-testid="validation-message"]').should('have.attr', 'role', 'status');

      // Check error announcements
      cy.get('[data-testid="next-step-button"]').click();
      cy.get('[role="alert"]').should('be.visible');
    });
  });

  describe('Mobile User Journey', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should complete project creation on mobile device', () => {
      cy.register('mobile@example.com', 'Password123!', 'homeowner');
      cy.login('mobile@example.com', 'Password123!');

      cy.visit('/project-creation');

      // Check mobile-specific UI elements
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
      cy.get('[data-testid="mobile-progress-bar"]').should('be.visible');

      // Fill form on mobile
      cy.get('[data-testid="address-line1"]').type('123 Mobile Street');
      cy.get('[data-testid="address-postcode"]').type('SW1A 1AA');
      cy.get('[data-testid="validate-address-button"]').click();

      // Check mobile-optimized interactions
      cy.get('[data-testid="mobile-next-button"]').should('be.visible');
      cy.get('[data-testid="mobile-next-button"]').click();

      // Select project type on mobile
      cy.get('[data-testid="mobile-project-type-grid"]').should('be.visible');
      cy.get('[data-testid="project-type-loft-conversion"]').click();

      // Continue through mobile flow
      cy.get('[data-testid="mobile-next-button"]').click();

      // Fill requirements with mobile-optimized inputs
      cy.get('[data-testid="mobile-description-textarea"]').type('Mobile loft conversion');
      cy.get('[data-testid="mobile-dimension-slider-length"]').invoke('val', 6).trigger('input');
      cy.get('[data-testid="mobile-dimension-slider-width"]').invoke('val', 4).trigger('input');

      // Complete mobile journey
      cy.get('[data-testid="mobile-submit-button"]').click();
      cy.get('[data-testid="sow-generation-progress"]').should('be.visible');
    });

    it('should handle mobile document upload', () => {
      cy.register('mobiledoc@example.com', 'Password123!', 'homeowner');
      cy.login('mobiledoc@example.com', 'Password123!');

      cy.visit('/project-creation');
      cy.fillBasicProjectInfo();

      // Navigate to document upload
      cy.get('[data-testid="mobile-next-button"]').click();
      cy.get('[data-testid="mobile-next-button"]').click();
      cy.get('[data-testid="mobile-next-button"]').click();

      // Test mobile camera integration
      cy.get('[data-testid="mobile-camera-button"]').should('be.visible');
      cy.get('[data-testid="mobile-gallery-button"]').should('be.visible');

      // Upload from gallery
      cy.fixture('mobile-photo.jpg').then(fileContent => {
        cy.get('[data-testid="mobile-file-input"]').selectFile({
          contents: Cypress.Buffer.from(fileContent),
          fileName: 'mobile-photo.jpg',
          mimeType: 'image/jpeg'
        });
      });

      cy.get('[data-testid="mobile-upload-progress"]').should('be.visible');
      cy.get('[data-testid="mobile-upload-success"]', { timeout: 30000 }).should('be.visible');
    });
  });
});