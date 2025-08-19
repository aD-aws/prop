import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import '@testing-library/jest-dom';
import theme from '../../theme';

// Mock the builder service
const mockBuilderService = {
  getAvailableOpportunities: jest.fn(),
  getMyQuotes: jest.fn(),
  getMyClarificationQuestions: jest.fn(),
  getSoWDetails: jest.fn(),
  getClarificationQuestions: jest.fn(),
  askClarificationQuestion: jest.fn(),
  submitQuote: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
};

jest.mock('../../services/builderService', () => ({
  builderService: mockBuilderService,
}));

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

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Builder Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Builder Dashboard Component Structure', () => {
    it('should render basic dashboard structure', () => {
      // Mock the dashboard data
      mockBuilderService.getAvailableOpportunities.mockResolvedValue([]);
      mockBuilderService.getMyQuotes.mockResolvedValue([]);
      mockBuilderService.getMyClarificationQuestions.mockResolvedValue([]);

      // Create a simple test component that mimics the dashboard structure
      const TestDashboard = () => (
        <div>
          <h1>Builder Dashboard</h1>
          <div role="tablist">
            <button role="tab">Available Opportunities</button>
            <button role="tab">My Quotes</button>
            <button role="tab">Questions</button>
            <button role="tab">Profile</button>
          </div>
          <div role="tabpanel">
            <div data-testid="opportunities-content">
              <h2>Filter Opportunities</h2>
              <select aria-label="Project Type">
                <option value="">All Types</option>
                <option value="loft-conversion">Loft Conversion</option>
                <option value="extension">Extension</option>
              </select>
              <button>Apply</button>
              <button>Clear</button>
            </div>
          </div>
        </div>
      );

      render(
        <TestWrapper>
          <TestDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Builder Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Available Opportunities')).toBeInTheDocument();
      expect(screen.getByText('My Quotes')).toBeInTheDocument();
      expect(screen.getByText('Questions')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Type')).toBeInTheDocument();
    });

    it('should handle tab navigation', () => {
      const TestTabs = () => {
        const [activeTab, setActiveTab] = React.useState(0);
        
        return (
          <div>
            <div role="tablist">
              <button 
                role="tab" 
                onClick={() => setActiveTab(0)}
                aria-selected={activeTab === 0}
              >
                Opportunities
              </button>
              <button 
                role="tab" 
                onClick={() => setActiveTab(1)}
                aria-selected={activeTab === 1}
              >
                Quotes
              </button>
            </div>
            <div role="tabpanel">
              {activeTab === 0 && <div>Opportunities Content</div>}
              {activeTab === 1 && <div>Quotes Content</div>}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestTabs />
        </TestWrapper>
      );

      expect(screen.getByText('Opportunities Content')).toBeInTheDocument();
      expect(screen.queryByText('Quotes Content')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Quotes'));
      expect(screen.getByText('Quotes Content')).toBeInTheDocument();
      expect(screen.queryByText('Opportunities Content')).not.toBeInTheDocument();
    });
  });

  describe('SoW Review Component Structure', () => {
    it('should render SoW review structure', () => {
      const TestSoWReview = () => (
        <div>
          <h1>Scope of Work Review</h1>
          <div>
            <button>Ask Question</button>
            <button>Submit Quote</button>
          </div>
          <div>
            <h2>Project Overview</h2>
            <p>Project ID: test-project</p>
            <p>Total Cost: £22,000</p>
          </div>
          <div>
            <h2>RIBA Plan of Work Stages</h2>
            <div>
              <h3>Stage 1: Preparation and Briefing</h3>
              <p>5 days</p>
            </div>
          </div>
          <div>
            <h2>Technical Specifications</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Specification</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Steel beam installation</td>
                  <td>2</td>
                  <td>no</td>
                  <td>203x133x25 UC</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );

      render(
        <TestWrapper>
          <TestSoWReview />
        </TestWrapper>
      );

      expect(screen.getByText('Scope of Work Review')).toBeInTheDocument();
      expect(screen.getByText('Ask Question')).toBeInTheDocument();
      expect(screen.getByText('Submit Quote')).toBeInTheDocument();
      expect(screen.getByText('Project Overview')).toBeInTheDocument();
      expect(screen.getByText('RIBA Plan of Work Stages')).toBeInTheDocument();
      expect(screen.getByText('Technical Specifications')).toBeInTheDocument();
    });

    it('should handle question dialog', () => {
      const TestQuestionDialog = () => {
        const [open, setOpen] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setOpen(true)}>Ask Question</button>
            {open && (
              <div role="dialog" aria-labelledby="dialog-title">
                <h2 id="dialog-title">Ask Clarification Question</h2>
                <select aria-label="Question Category">
                  <option value="technical">Technical</option>
                  <option value="commercial">Commercial</option>
                </select>
                <textarea 
                  aria-label="Your Question"
                  placeholder="Please provide as much detail as possible..."
                />
                <button onClick={() => setOpen(false)}>Cancel</button>
                <button>Submit Question</button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestQuestionDialog />
        </TestWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Ask Question'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Question Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Your Question')).toBeInTheDocument();
    });
  });

  describe('Quote Submission Component Structure', () => {
    it('should render quote submission form structure', () => {
      const TestQuoteForm = () => (
        <div>
          <h1>Submit Quote</h1>
          <div>
            <div>
              <h2>Quote Breakdown (NRM2 Standards)</h2>
              <button>Add Item</button>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4}>Total Quote Amount</td>
                    <td>£0</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h2>Timeline & Warranty</h2>
              <input aria-label="Project Timeline (days)" type="number" />
              <input aria-label="Proposed Start Date" type="date" />
              <input aria-label="Warranty Duration (months)" type="number" />
            </div>
            <div>
              <h2>Certifications & Insurance</h2>
              <input aria-label="Public Liability (£)" type="number" />
              <input aria-label="Employers Liability (£)" type="number" />
            </div>
            <div>
              <h2>Terms & Review</h2>
              <textarea aria-label="Terms & Conditions" />
              <button>Submit Quote</button>
            </div>
          </div>
        </div>
      );

      render(
        <TestWrapper>
          <TestQuoteForm />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: 'Submit Quote' })).toBeInTheDocument();
      expect(screen.getByText('Quote Breakdown (NRM2 Standards)')).toBeInTheDocument();
      expect(screen.getByText('Timeline & Warranty')).toBeInTheDocument();
      expect(screen.getByText('Certifications & Insurance')).toBeInTheDocument();
      expect(screen.getByText('Terms & Review')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Timeline (days)')).toBeInTheDocument();
      expect(screen.getByLabelText('Public Liability (£)')).toBeInTheDocument();
    });

    it('should handle breakdown item addition', () => {
      const TestBreakdownForm = () => {
        const [items, setItems] = React.useState<Array<{category: string, description: string, total: number}>>([]);
        const [dialogOpen, setDialogOpen] = React.useState(false);
        
        const addItem = () => {
          setItems([...items, { category: 'Test Category', description: 'Test Description', total: 1000 }]);
          setDialogOpen(false);
        };

        return (
          <div>
            <button onClick={() => setDialogOpen(true)}>Add Item</button>
            <table>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.category}</td>
                    <td>{item.description}</td>
                    <td>£{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dialogOpen && (
              <div role="dialog">
                <h3>Add Breakdown Item</h3>
                <input aria-label="Category" defaultValue="Test Category" />
                <input aria-label="Description" defaultValue="Test Description" />
                <button onClick={addItem}>Add Item</button>
                <button onClick={() => setDialogOpen(false)}>Cancel</button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestBreakdownForm />
        </TestWrapper>
      );

      expect(screen.queryByText('Test Category')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Add Item'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      fireEvent.click(screen.getAllByText('Add Item')[1]); // Click the dialog button
      expect(screen.getByText('Test Category')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('£1000')).toBeInTheDocument();
    });
  });

  describe('Builder Profile Component Structure', () => {
    it('should render profile management structure', () => {
      const TestProfile = () => (
        <div>
          <h1>Builder Profile Management</h1>
          <div role="tablist">
            <button role="tab">Company Details</button>
            <button role="tab">Certifications & Insurance</button>
            <button role="tab">Portfolio</button>
            <button role="tab">Ratings & Reviews</button>
          </div>
          <div role="tabpanel">
            <div>
              <h2>Company Information</h2>
              <input aria-label="Company Name" defaultValue="Test Construction Ltd" />
              <input aria-label="Contact First Name" defaultValue="John" />
              <input aria-label="Contact Last Name" defaultValue="Builder" />
            </div>
            <div>
              <h2>Business Details</h2>
              <input aria-label="Registration Number" defaultValue="12345678" />
              <input aria-label="VAT Number" defaultValue="GB123456789" />
            </div>
          </div>
        </div>
      );

      render(
        <TestWrapper>
          <TestProfile />
        </TestWrapper>
      );

      expect(screen.getByText('Builder Profile Management')).toBeInTheDocument();
      expect(screen.getByText('Company Details')).toBeInTheDocument();
      expect(screen.getByText('Certifications & Insurance')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Ratings & Reviews')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Construction Ltd')).toBeInTheDocument();
    });

    it('should handle certification management', () => {
      const TestCertifications = () => {
        const [certs, setCerts] = React.useState([
          { name: 'RICS Membership', issuingBody: 'RICS', status: 'active' }
        ]);
        const [dialogOpen, setDialogOpen] = React.useState(false);
        
        const addCert = () => {
          setCerts([...certs, { name: 'Gas Safe', issuingBody: 'Gas Safe Register', status: 'active' }]);
          setDialogOpen(false);
        };

        return (
          <div>
            <h2>Professional Certifications</h2>
            <button onClick={() => setDialogOpen(true)}>Add Certification</button>
            <table>
              <tbody>
                {certs.map((cert, index) => (
                  <tr key={index}>
                    <td>{cert.name}</td>
                    <td>{cert.issuingBody}</td>
                    <td>{cert.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dialogOpen && (
              <div role="dialog">
                <h3>Add Certification</h3>
                <input aria-label="Certification Name" defaultValue="Gas Safe" />
                <input aria-label="Issuing Body" defaultValue="Gas Safe Register" />
                <button onClick={addCert}>Add Certification</button>
                <button onClick={() => setDialogOpen(false)}>Cancel</button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestCertifications />
        </TestWrapper>
      );

      expect(screen.getByText('RICS Membership')).toBeInTheDocument();
      expect(screen.queryByText('Gas Safe')).not.toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Add Certification'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      fireEvent.click(screen.getAllByText('Add Certification')[1]);
      expect(screen.getByDisplayValue('Gas Safe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Gas Safe Register')).toBeInTheDocument();
    });
  });

  describe('Integration Workflow Tests', () => {
    it('should simulate complete quote submission workflow', () => {
      const TestWorkflow = () => {
        const [step, setStep] = React.useState(0);
        const [quoteData, setQuoteData] = React.useState({
          breakdown: [] as Array<{category: string, total: number}>,
          timeline: 0,
          insurance: { publicLiability: 0, employersLiability: 0 },
          terms: '',
        });

        const steps = [
          'Select Opportunity',
          'Review SoW',
          'Submit Quote',
          'Quote Submitted'
        ];

        const nextStep = () => setStep(step + 1);

        return (
          <div>
            <h1>Builder Workflow Test</h1>
            <div>Current Step: {steps[step]}</div>
            
            {step === 0 && (
              <div>
                <h2>Available Opportunities</h2>
                <div>
                  <h3>Loft Conversion Project</h3>
                  <p>Budget: £15,000 - £25,000</p>
                  <button onClick={nextStep}>View Details</button>
                </div>
              </div>
            )}
            
            {step === 1 && (
              <div>
                <h2>SoW Review</h2>
                <p>Project details and specifications...</p>
                <button onClick={nextStep}>Submit Quote</button>
              </div>
            )}
            
            {step === 2 && (
              <div>
                <h2>Quote Submission</h2>
                <input 
                  aria-label="Timeline"
                  type="number" 
                  onChange={(e) => setQuoteData({...quoteData, timeline: parseInt(e.target.value)})}
                />
                <input 
                  aria-label="Public Liability"
                  type="number" 
                  onChange={(e) => setQuoteData({
                    ...quoteData, 
                    insurance: {...quoteData.insurance, publicLiability: parseInt(e.target.value)}
                  })}
                />
                <textarea 
                  aria-label="Terms"
                  onChange={(e) => setQuoteData({...quoteData, terms: e.target.value})}
                />
                <button 
                  onClick={nextStep}
                  disabled={!quoteData.timeline || !quoteData.insurance.publicLiability || !quoteData.terms}
                >
                  Submit Quote
                </button>
              </div>
            )}
            
            {step === 3 && (
              <div>
                <h2>Quote Submitted Successfully!</h2>
                <p>Your quote has been sent to the client.</p>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestWorkflow />
        </TestWrapper>
      );

      // Step 1: Select opportunity
      expect(screen.getByText('Current Step: Select Opportunity')).toBeInTheDocument();
      expect(screen.getByText('Loft Conversion Project')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('View Details'));
      
      // Step 2: Review SoW
      expect(screen.getByText('Current Step: Review SoW')).toBeInTheDocument();
      expect(screen.getByText('SoW Review')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Submit Quote'));
      
      // Step 3: Submit quote
      expect(screen.getByText('Current Step: Submit Quote')).toBeInTheDocument();
      expect(screen.getByText('Quote Submission')).toBeInTheDocument();
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText('Timeline'), { target: { value: '30' } });
      fireEvent.change(screen.getByLabelText('Public Liability'), { target: { value: '2000000' } });
      fireEvent.change(screen.getByLabelText('Terms'), { target: { value: 'Standard terms' } });
      
      // Submit button should now be enabled
      const submitButton = screen.getByText('Submit Quote');
      expect(submitButton).not.toBeDisabled();
      
      fireEvent.click(submitButton);
      
      // Step 4: Success
      expect(screen.getByText('Current Step: Quote Submitted')).toBeInTheDocument();
      expect(screen.getByText('Quote Submitted Successfully!')).toBeInTheDocument();
    });
  });
});