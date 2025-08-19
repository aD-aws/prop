import { apiService } from './api';

export interface SoWOpportunity {
  id: string;
  projectId: string;
  title: string;
  projectType: string;
  propertyAddress: {
    street: string;
    city: string;
    postcode: string;
  };
  budget: {
    min: number;
    max: number;
  };
  timeline: number; // days
  status: 'available' | 'quoted' | 'awarded' | 'expired';
  postedDate: string;
  deadline: string;
  description: string;
  requirements: string[];
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

export interface SoWDetails {
  id: string;
  projectId: string;
  version: number;
  ribaStages: Array<{
    stage: number;
    title: string;
    description: string;
    deliverables: string[];
    duration: number;
    dependencies: string[];
  }>;
  specifications: Array<{
    category: string;
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      specification: string;
    }>;
  }>;
  materials: Array<{
    category: string;
    items: Array<{
      name: string;
      specification: string;
      quantity: number;
      unit: string;
      preferredSuppliers?: string[];
    }>;
  }>;
  costEstimate: {
    totalCost: number;
    breakdown: Array<{
      category: string;
      cost: number;
      methodology: 'NRM1' | 'NRM2';
    }>;
    confidence: number;
  };
  complianceChecks: Array<{
    standard: string;
    requirement: string;
    status: 'compliant' | 'requires_attention' | 'not_applicable';
    notes?: string;
  }>;
}

export interface QuoteSubmission {
  sowId: string;
  totalPrice: number;
  breakdown: Array<{
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    methodology: 'NRM1' | 'NRM2';
    notes?: string;
  }>;
  timeline: number; // days
  startDate: string;
  warranty: {
    duration: number; // months
    coverage: string;
    terms: string;
  };
  certifications: string[];
  insurance: {
    publicLiability: number;
    employersLiability: number;
    professionalIndemnity?: number;
  };
  terms: string;
  validUntil: string;
  additionalNotes?: string;
}

export interface Quote {
  id: string;
  sowId: string;
  projectTitle: string;
  totalPrice: number;
  timeline: number;
  status: 'draft' | 'submitted' | 'selected' | 'rejected' | 'expired';
  submittedAt: string;
  validUntil: string;
  clientResponse?: {
    status: 'pending' | 'accepted' | 'rejected';
    message?: string;
    respondedAt?: string;
  };
}

export interface BuilderProfile {
  id: string;
  companyName: string;
  contactPerson: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    postcode: string;
  };
  businessDetails: {
    registrationNumber: string;
    vatNumber?: string;
    establishedYear: number;
    employeeCount: number;
  };
  certifications: Array<{
    name: string;
    issuingBody: string;
    certificateNumber: string;
    validFrom: string;
    validUntil: string;
    status: 'active' | 'expired' | 'pending';
  }>;
  insurance: {
    publicLiability: {
      provider: string;
      policyNumber: string;
      coverage: number;
      validUntil: string;
    };
    employersLiability: {
      provider: string;
      policyNumber: string;
      coverage: number;
      validUntil: string;
    };
    professionalIndemnity?: {
      provider: string;
      policyNumber: string;
      coverage: number;
      validUntil: string;
    };
  };
  specializations: string[];
  serviceAreas: string[]; // postcodes or regions
  portfolio: Array<{
    id: string;
    title: string;
    description: string;
    projectType: string;
    completedDate: string;
    images: string[];
    clientTestimonial?: string;
  }>;
  ratings: {
    overall: number;
    quality: number;
    timeliness: number;
    communication: number;
    reviewCount: number;
  };
}

export interface ClarificationQuestion {
  id: string;
  sowId: string;
  question: string;
  category: 'technical' | 'commercial' | 'timeline' | 'materials' | 'other';
  askedAt: string;
  response?: {
    answer: string;
    respondedAt: string;
    respondedBy: string;
  };
  status: 'pending' | 'answered' | 'closed';
}

class BuilderService {
  // SoW Opportunities
  async getAvailableOpportunities(filters?: {
    projectType?: string;
    location?: string;
    budgetRange?: { min: number; max: number };
    timeline?: number;
  }): Promise<SoWOpportunity[]> {
    const params = new URLSearchParams();
    if (filters?.projectType) params.append('projectType', filters.projectType);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.budgetRange) {
      params.append('budgetMin', filters.budgetRange.min.toString());
      params.append('budgetMax', filters.budgetRange.max.toString());
    }
    if (filters?.timeline) params.append('timeline', filters.timeline.toString());

    return apiService.get<SoWOpportunity[]>(`/builder/opportunities?${params.toString()}`);
  }

  async getSoWDetails(sowId: string): Promise<SoWDetails> {
    return apiService.get<SoWDetails>(`/builder/sow/${sowId}`);
  }

  // Quote Management
  async submitQuote(quote: QuoteSubmission): Promise<{ id: string; message: string }> {
    return apiService.post<{ id: string; message: string }>('/builder/quotes', quote);
  }

  async getMyQuotes(status?: string): Promise<Quote[]> {
    const params = status ? `?status=${status}` : '';
    return apiService.get<Quote[]>(`/builder/quotes${params}`);
  }

  async getQuoteDetails(quoteId: string): Promise<Quote & QuoteSubmission> {
    return apiService.get<Quote & QuoteSubmission>(`/builder/quotes/${quoteId}`);
  }

  async updateQuote(quoteId: string, updates: Partial<QuoteSubmission>): Promise<void> {
    return apiService.put(`/builder/quotes/${quoteId}`, updates);
  }

  async withdrawQuote(quoteId: string, reason: string): Promise<void> {
    return apiService.post(`/builder/quotes/${quoteId}/withdraw`, { reason });
  }

  // Communication
  async askClarificationQuestion(sowId: string, question: {
    question: string;
    category: ClarificationQuestion['category'];
  }): Promise<{ id: string; message: string }> {
    return apiService.post<{ id: string; message: string }>(`/builder/sow/${sowId}/questions`, question);
  }

  async getClarificationQuestions(sowId: string): Promise<ClarificationQuestion[]> {
    return apiService.get<ClarificationQuestion[]>(`/builder/sow/${sowId}/questions`);
  }

  async getMyClarificationQuestions(): Promise<ClarificationQuestion[]> {
    return apiService.get<ClarificationQuestion[]>('/builder/questions');
  }

  // Profile Management
  async getProfile(): Promise<BuilderProfile> {
    return apiService.get<BuilderProfile>('/builder/profile');
  }

  async updateProfile(updates: Partial<BuilderProfile>): Promise<void> {
    return apiService.put('/builder/profile', updates);
  }

  async uploadCertificate(file: File, certificationType: string): Promise<{ url: string }> {
    return apiService.uploadFile<{ url: string }>(`/builder/certificates/${certificationType}`, file);
  }

  async uploadInsuranceDocument(file: File, insuranceType: string): Promise<{ url: string }> {
    return apiService.uploadFile<{ url: string }>(`/builder/insurance/${insuranceType}`, file);
  }

  async addPortfolioItem(item: Omit<BuilderProfile['portfolio'][0], 'id'>): Promise<{ id: string }> {
    return apiService.post<{ id: string }>('/builder/portfolio', item);
  }

  async uploadPortfolioImages(portfolioId: string, files: File[]): Promise<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`image_${index}`, file);
    });

    return apiService.post<{ urls: string[] }>(`/builder/portfolio/${portfolioId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

export const builderService = new BuilderService();