import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';

// Import components to test
import HomePage from '../../pages/HomePage';
import LoginPage from '../../pages/LoginPage';
import RegisterPage from '../../pages/RegisterPage';
import ProjectCreationPage from '../../pages/ProjectCreationPage';
import ProjectDashboardPage from '../../pages/ProjectDashboardPage';
import BuilderDashboardPage from '../../pages/BuilderDashboardPage';
import { AuthProvider } from '../../contexts/AuthContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('WCAG 2.1 Accessibility Compliance Tests', () => {
  describe('Level A Compliance', () => {
    test('HomePage should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('LoginPage should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('RegisterPage should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper heading hierarchy', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Check for proper heading structure (h1 -> h2 -> h3, etc.)
      const headings = screen.getAllByRole('heading');
      const headingLevels = headings.map(heading => 
        parseInt(heading.tagName.charAt(1))
      );

      // Should start with h1
      expect(headingLevels[0]).toBe(1);

      // Check for logical progression (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i];
        const previousLevel = headingLevels[i - 1];
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    });

    test('should have proper alt text for images', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const images = screen.getAllByRole('img');
      images.forEach(image => {
        expect(image).toHaveAttribute('alt');
        const altText = image.getAttribute('alt');
        expect(altText).not.toBe('');
        expect(altText).not.toBe('image');
        expect(altText).not.toBe('photo');
      });
    });

    test('should have proper form labels', async () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should have proper link text', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        const linkText = link.textContent || link.getAttribute('aria-label');
        expect(linkText).toBeTruthy();
        expect(linkText).not.toBe('click here');
        expect(linkText).not.toBe('read more');
        expect(linkText).not.toBe('link');
      });
    });
  });

  describe('Level AA Compliance', () => {
    test('should have sufficient color contrast', async () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Use axe to check color contrast
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      expect(results).toHaveNoViolations();
    });

    test('should be navigable with keyboard only', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    test('should have proper focus indicators', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      
      await user.tab();
      expect(emailInput).toHaveFocus();

      // Check that focus indicator is visible
      const focusedElement = document.activeElement;
      const computedStyle = window.getComputedStyle(focusedElement as Element);
      
      // Should have some form of focus indicator (outline, box-shadow, etc.)
      expect(
        computedStyle.outline !== 'none' || 
        computedStyle.boxShadow !== 'none' ||
        computedStyle.border !== 'none'
      ).toBe(true);
    });

    test('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <ProjectCreationPage />
        </TestWrapper>
      );

      // Check for proper ARIA landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Check for proper form roles
      const forms = screen.getAllByRole('form');
      expect(forms.length).toBeGreaterThan(0);

      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type');
      });
    });

    test('should provide error messages for form validation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Submit form without filling fields
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
        
        errorMessages.forEach(error => {
          expect(error).toHaveTextContent(/required|invalid/i);
        });
      });
    });

    test('should have proper page titles', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Check that page has a title
      expect(document.title).toBeTruthy();
      expect(document.title).not.toBe('');
      expect(document.title).toContain('UK Home Improvement Platform');
    });
  });

  describe('Level AAA Compliance (Best Practices)', () => {
    test('should have skip links for keyboard navigation', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Look for skip link (usually hidden until focused)
      const skipLink = screen.queryByText(/skip to main content/i);
      if (skipLink) {
        expect(skipLink).toHaveAttribute('href', '#main');
      }
    });

    test('should have proper language attributes', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Check that html element has lang attribute
      const htmlElement = document.documentElement;
      expect(htmlElement).toHaveAttribute('lang');
      expect(htmlElement.getAttribute('lang')).toBe('en');
    });

    test('should provide help text for complex forms', async () => {
      render(
        <TestWrapper>
          <ProjectCreationPage />
        </TestWrapper>
      );

      // Look for help text or descriptions
      const helpTexts = screen.getAllByText(/help|tip|example|format/i);
      expect(helpTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Interactive Elements Accessibility', () => {
    test('should handle modal dialogs accessibly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectDashboardPage />
        </TestWrapper>
      );

      // Look for button that opens modal
      const openModalButton = screen.queryByRole('button', { name: /delete|remove|confirm/i });
      
      if (openModalButton) {
        await user.click(openModalButton);

        await waitFor(() => {
          const dialog = screen.getByRole('dialog');
          expect(dialog).toBeInTheDocument();
          expect(dialog).toHaveAttribute('aria-modal', 'true');
          
          // Check for proper focus management
          const focusedElement = document.activeElement;
          expect(dialog.contains(focusedElement)).toBe(true);
        });
      }
    });

    test('should handle dropdown menus accessibly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCreationPage />
        </TestWrapper>
      );

      // Look for dropdown/select elements
      const dropdowns = screen.getAllByRole('combobox');
      
      for (const dropdown of dropdowns) {
        expect(dropdown).toHaveAttribute('aria-expanded');
        
        await user.click(dropdown);
        
        await waitFor(() => {
          expect(dropdown).toHaveAttribute('aria-expanded', 'true');
        });
      }
    });

    test('should handle tabs accessibly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <BuilderDashboardPage />
        </TestWrapper>
      );

      // Look for tab elements
      const tabs = screen.getAllByRole('tab');
      
      if (tabs.length > 0) {
        const tablist = screen.getByRole('tablist');
        expect(tablist).toBeInTheDocument();
        
        tabs.forEach(tab => {
          expect(tab).toHaveAttribute('aria-selected');
          expect(tab).toHaveAttribute('aria-controls');
        });

        // Test keyboard navigation
        await user.click(tabs[0]);
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        
        // Test arrow key navigation
        fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
        if (tabs[1]) {
          expect(tabs[1]).toHaveFocus();
        }
      }
    });

    test('should provide loading states with proper ARIA', async () => {
      render(
        <TestWrapper>
          <ProjectCreationPage />
        </TestWrapper>
      );

      // Look for loading indicators
      const loadingElements = screen.getAllByRole('status');
      
      loadingElements.forEach(element => {
        expect(element).toHaveAttribute('aria-live');
        expect(element).toHaveTextContent(/loading|processing/i);
      });
    });
  });

  describe('Form Accessibility', () => {
    test('should group related form fields', async () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      // Look for fieldsets
      const fieldsets = screen.getAllByRole('group');
      
      fieldsets.forEach(fieldset => {
        // Should have a legend or aria-labelledby
        expect(
          fieldset.querySelector('legend') || 
          fieldset.hasAttribute('aria-labelledby')
        ).toBeTruthy();
      });
    });

    test('should provide clear error messages', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /register|sign up/i });

      // Enter invalid email
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/valid email/i);
        
        // Error should be associated with the input
        expect(emailInput).toHaveAttribute('aria-describedby');
        const describedBy = emailInput.getAttribute('aria-describedby');
        expect(document.getElementById(describedBy!)).toBe(errorMessage);
      });
    });

    test('should indicate required fields', async () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      const requiredInputs = screen.getAllByRole('textbox', { required: true });
      
      requiredInputs.forEach(input => {
        expect(input).toHaveAttribute('required');
        expect(input).toHaveAttribute('aria-required', 'true');
        
        // Should have visual indicator (*, "required", etc.)
        const label = screen.getByLabelText(new RegExp(input.getAttribute('name') || '', 'i'));
        expect(label.textContent).toMatch(/\*|required/i);
      });
    });
  });

  describe('Dynamic Content Accessibility', () => {
    test('should announce dynamic content changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCreationPage />
        </TestWrapper>
      );

      // Look for live regions
      const liveRegions = screen.getAllByRole('status');
      
      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(
          region.getAttribute('aria-live')
        );
      });
    });

    test('should handle progressive disclosure accessibly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ProjectCreationPage />
        </TestWrapper>
      );

      // Look for expandable sections
      const expandButtons = screen.getAllByRole('button', { expanded: false });
      
      for (const button of expandButtons) {
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(button).toHaveAttribute('aria-controls');
        
        await user.click(button);
        
        await waitFor(() => {
          expect(button).toHaveAttribute('aria-expanded', 'true');
        });
      }
    });
  });

  describe('Mobile Accessibility', () => {
    test('should have appropriate touch targets', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      const links = screen.getAllByRole('link');
      
      [...buttons, ...links].forEach(element => {
        const rect = element.getBoundingClientRect();
        const minSize = 44; // WCAG minimum touch target size
        
        expect(rect.width).toBeGreaterThanOrEqual(minSize);
        expect(rect.height).toBeGreaterThanOrEqual(minSize);
      });
    });

    test('should support zoom up to 200%', async () => {
      // Mock zoom
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2,
      });
      
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Content should still be accessible at 200% zoom
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Compatibility', () => {
    test('should provide proper table headers', async () => {
      render(
        <TestWrapper>
          <BuilderDashboardPage />
        </TestWrapper>
      );

      const tables = screen.getAllByRole('table');
      
      tables.forEach(table => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
        
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope', 'col');
        });
      });
    });

    test('should provide proper list structure', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const lists = screen.getAllByRole('list');
      
      lists.forEach(list => {
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });

    test('should provide proper navigation landmarks', async () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Check for navigation landmarks
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Footer should be present
      const footer = screen.queryByRole('contentinfo');
      if (footer) {
        expect(footer).toBeInTheDocument();
      }
    });
  });
});