/// <reference types="cypress" />

// Custom command for accessibility testing
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y(undefined, {
    rules: {
      'color-contrast': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'keyboard-navigation': { enabled: true },
    },
  });
});

// Authentication commands
Cypress.Commands.add('register', (email: string, password: string, userType: 'homeowner' | 'builder') => {
  cy.visit('/register');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="confirm-password-input"]').type(password);
  cy.get('[data-testid="user-type-select"]').select(userType);
  cy.get('[data-testid="first-name-input"]').type('Test');
  cy.get('[data-testid="last-name-input"]').type('User');
  
  if (userType === 'builder') {
    cy.get('[data-testid="company-name-input"]').type('Test Construction Ltd');
  }
  
  cy.get('[data-testid="register-submit"]').click();
  cy.url().should('not.include', '/register');
});

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-submit"]').click();
  cy.url().should('not.include', '/login');
});

// Legacy login command for existing tests
Cypress.Commands.add('loginAsHomeowner', () => {
  cy.intercept('POST', '/api/users/login', {
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
  }).as('login');

  cy.visit('/login');
  cy.get('input[name="email"]').type('test@example.com');
  cy.get('input[name="password"]').type('password123');
  cy.contains('Sign In').click();
  cy.wait('@login');
});

// Project creation helpers
Cypress.Commands.add('fillBasicProjectInfo', () => {
  cy.get('[data-testid="address-line1"]').type('123 Test Street');
  cy.get('[data-testid="address-city"]').type('London');
  cy.get('[data-testid="address-postcode"]').type('SW1A 1AA');
  cy.get('[data-testid="address-country"]').select('UK');
  cy.get('[data-testid="validate-address-button"]').click();
  cy.get('[data-testid="address-validation-success"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="next-step-button"]').click();
  
  cy.get('[data-testid="project-type-loft-conversion"]').click();
  cy.get('[data-testid="understand-button"]').click();
  cy.get('[data-testid="next-step-button"]').click();
});

Cypress.Commands.add('fillProjectForm', () => {
  cy.fillBasicProjectInfo();
  
  cy.get('[data-testid="project-description"]').type('Test project description');
  cy.get('[data-testid="dimension-length"]').type('6');
  cy.get('[data-testid="dimension-width"]').type('4');
  cy.get('[data-testid="dimension-height"]').type('2.5');
  cy.get('[data-testid="budget-min"]').type('20000');
  cy.get('[data-testid="budget-max"]').type('35000');
  cy.get('[data-testid="next-step-button"]').click();
  
  // Skip documents
  cy.get('[data-testid="skip-documents-button"]').click();
  cy.get('[data-testid="confirm-skip-button"]').click();
});

// Custom tab command for keyboard navigation testing
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  const focusedElement = subject || cy.focused();
  return focusedElement.trigger('keydown', { key: 'Tab' });
});

declare global {
  namespace Cypress {
    interface Chainable {
      checkA11y(): Chainable<void>
      register(email: string, password: string, userType: 'homeowner' | 'builder'): Chainable<void>
      login(email: string, password: string): Chainable<void>
      loginAsHomeowner(): Chainable<void>
      fillBasicProjectInfo(): Chainable<void>
      fillProjectForm(): Chainable<void>
      tab(): Chainable<JQuery<HTMLElement>>
    }
  }
}