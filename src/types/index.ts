import { Request } from 'express';

// User Types
export interface User {
  PK: string; // USER#{userId}
  SK: string; // PROFILE
  id: string;
  email: string;
  userType: 'homeowner' | 'builder' | 'admin';
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
  gdprConsent: boolean;
  emailVerified: boolean;
  GSI1PK: string; // email for lookup
  GSI1SK: string; // userType
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: Address;
  companyName?: string; // For builders
  certifications?: string[]; // For builders
  insurance?: InsuranceDetails; // For builders
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface InsuranceDetails {
  provider: string;
  policyNumber: string;
  expiryDate: string;
  coverageAmount: number;
}

// Project Types
export interface Project {
  PK: string; // PROJECT#{projectId}
  SK: string; // METADATA
  id: string;
  ownerId: string;
  propertyAddress: Address;
  projectType: ProjectType;
  status: ProjectStatus;
  requirements: ProjectRequirements;
  documents: Document[];
  councilData: CouncilData;
  sowId?: string;
  selectedQuoteId?: string;
  contractId?: string;
  createdAt: string;
  updatedAt: string;
  GSI2PK: string; // status for filtering
  GSI2SK: string; // createdAt for sorting
}

export type ProjectType = 
  | 'loft-conversion'
  | 'rear-extension'
  | 'side-extension'
  | 'bathroom-renovation'
  | 'kitchen-renovation'
  | 'conservatory'
  | 'garage-conversion'
  | 'basement-conversion'
  | 'roof-replacement'
  | 'other';

export type ProjectStatus = 
  | 'draft'
  | 'requirements-gathering'
  | 'council-check'
  | 'sow-generation'
  | 'quote-collection'
  | 'quote-review'
  | 'contract-generation'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface ProjectRequirements {
  description: string;
  dimensions: Dimensions;
  materials: MaterialPreferences;
  timeline: Timeline;
  budget: BudgetRange;
  specialRequirements: string[];
}

export interface Dimensions {
  length?: number;
  width?: number;
  height?: number;
  area?: number;
  unit: 'meters' | 'feet';
}

export interface MaterialPreferences {
  quality: 'budget' | 'standard' | 'premium';
  preferences: string[];
  restrictions: string[];
}

export interface Timeline {
  startDate?: string;
  endDate?: string;
  flexibility: 'rigid' | 'flexible' | 'very-flexible';
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: 'GBP';
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  uploadedAt: string;
  processedAt?: string;
  extractedText?: string;
  metadata?: DocumentMetadata;
  version: number;
  status: DocumentStatus;
  classification?: DocumentClassification;
  auditTrail: DocumentAuditEntry[];
}

export type DocumentStatus = 
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'archived';

export interface DocumentMetadata {
  fileType: string;
  dimensions?: {
    width: number;
    height: number;
    pages?: number;
  };
  technicalSpecs?: TechnicalSpecification[];
  extractedData?: Record<string, any>;
  confidence?: number;
  processingTime?: number;
}

export interface DocumentClassification {
  type: DocumentType;
  confidence: number;
  subType?: string;
  aiAnalysis?: string;
}

export type DocumentType = 
  | 'structural-drawing'
  | 'architectural-plan'
  | 'structural-calculation'
  | 'building-regulation-document'
  | 'planning-application'
  | 'survey-report'
  | 'specification-document'
  | 'photograph'
  | 'other';

export interface TechnicalSpecification {
  category: string;
  specification: string;
  value?: string;
  unit?: string;
  confidence: number;
}

export interface DocumentAuditEntry {
  action: 'uploaded' | 'processed' | 'classified' | 'updated' | 'archived';
  timestamp: string;
  userId: string;
  details?: Record<string, any>;
}

export interface DocumentProcessingResult {
  documentId: string;
  extractedText?: string;
  classification?: DocumentClassification;
  metadata?: DocumentMetadata;
  success: boolean;
  error?: string;
  processingTime: number;
}

export interface CouncilData {
  conservationArea: boolean;
  listedBuilding: boolean;
  planningRestrictions: string[];
  localAuthority: string;
  contactDetails: ContactInfo;
  lastChecked: string;
}

export interface ContactInfo {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: Address;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

// JWT Types
export interface JWTPayload {
  userId: string;
  email: string;
  userType: string;
  iat: number;
  exp: number;
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// Address Validation Types
export interface PostcodeValidationResult {
  valid: boolean;
  postcode?: string;
  normalizedPostcode?: string;
  address?: PostcodeAddress;
  error?: string;
}

export interface PostcodeAddress {
  postcode: string;
  country: string;
  region: string;
  adminDistrict: string;
  adminCounty?: string | null;
  adminWard: string;
  parish?: string | null;
  constituency: string;
  longitude: number;
  latitude: number;
}

// Council Data Types
export interface CouncilDataResult {
  success: boolean;
  data?: CouncilData;
  error?: string;
  source: 'cache' | 'api' | 'scraping' | 'fallback';
  lastUpdated: string;
}

export interface CouncilSearchResult {
  localAuthority: string;
  website?: string;
  planningPortal?: string;
  conservationAreas?: string[];
  listedBuildings?: string[];
  contactDetails: ContactInfo;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Compliance Types
export interface ComplianceCheckResult {
  projectType: ProjectType;
  overallScore: ComplianceScore;
  ricsCompliance: RICSStandardsCheck;
  ribaCompliance: RIBAStageValidation;
  nhbcCompliance: NHBCStandardsCheck;
  buildingControlRequirements: BuildingControlRequirement[];
  violations: ComplianceViolation[];
  recommendations: string[];
  checkedAt: string;
  processingTime: number;
}

export interface ComplianceScore {
  score: number; // 0-100
  confidence: number; // 0-1
  breakdown: {
    documentation?: number;
    regulatory?: number;
    professional?: number;
    risk?: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

export interface ComplianceViolation {
  standard?: string;
  chapter?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requirement: string;
  recommendation: string;
}

export interface RICSStandardsCheck {
  compliant: boolean;
  score: number;
  standardsChecked: string[];
  violations: ComplianceViolation[];
  requiredActions: string[];
  aiAnalysis: string;
}

export interface RIBAStageValidation {
  currentStage: number;
  applicableStages: number[];
  stageValidation: RIBAStageCheck[];
  overallCompliance: boolean;
  nextStageRequirements: string[];
  aiAnalysis: string;
}

export interface RIBAStageCheck {
  stage: number;
  stageName: string;
  required: boolean;
  compliant: boolean;
  deliverables: string[];
  missingItems: string[];
  recommendations: string[];
}

export interface NHBCStandardsCheck {
  applicable: boolean;
  compliant: boolean;
  score: number;
  standardsChecked: string[];
  violations: ComplianceViolation[];
  warrantyEligible: boolean;
  warrantyConditions?: string[];
  aiAnalysis: string;
}

export interface BuildingControlRequirement {
  regulation: string;
  required: boolean;
  applicationType: 'Full Plans' | 'Building Notice' | 'Not Required';
  reason: string;
  documentation: string[];
  inspections: string[];
  certificates: string[];
  timeline: string;
  fees: string;
}

export interface ComplianceKnowledgeBase {
  buildingRegulations: Record<string, string>;
  ricsStandards: string[];
  ribaStages: Record<number, string>;
  nhbcChapters: Record<string, string>;
}

// Cost Estimation Types (NRM1/NRM2)
export interface CostEstimate {
  id: string;
  projectId: string;
  methodology: 'NRM1' | 'NRM2';
  totalCost: number;
  currency: 'GBP';
  breakdown: CostBreakdown[];
  confidence: ConfidenceScore;
  marketRates: MarketRateData;
  lastUpdated: string;
  validUntil: string;
  version: number;
  status: 'draft' | 'approved' | 'outdated';
}

export interface CostBreakdown {
  category: NRM1Category | NRM2Element;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalCost: number;
  source: CostDataSource;
  confidence: number;
  lastUpdated: string;
  subItems?: CostBreakdown[];
}

// NRM1 Categories (Order of Cost Estimating)
export type NRM1Category = 
  | 'facilitating-works'
  | 'building-works'
  | 'building-services'
  | 'external-works'
  | 'demolition-works'
  | 'temporary-works'
  | 'professional-fees'
  | 'other-development-costs'
  | 'risk-allowances'
  | 'inflation'
  | 'vat';

// NRM2 Elements (Detailed Measurement)
export type NRM2Element = 
  | 'substructure'
  | 'superstructure'
  | 'internal-finishes'
  | 'fittings-furnishings'
  | 'services'
  | 'external-works'
  | 'preliminaries'
  | 'overheads-profit';

export interface ConfidenceScore {
  overall: number; // 0-1
  dataQuality: number; // 0-1
  marketStability: number; // 0-1
  projectComplexity: number; // 0-1
  timeHorizon: number; // 0-1
  explanation: string;
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface MarketRateData {
  region: string;
  lastUpdated: string;
  source: string;
  rates: MaterialRate[];
  labourRates: LabourRate[];
  overheadFactors: OverheadFactor[];
}

export interface MaterialRate {
  material: string;
  category: string;
  unit: string;
  rate: number;
  supplier?: string;
  quality: 'budget' | 'standard' | 'premium';
  availability: 'readily-available' | 'limited' | 'special-order';
  priceVolatility: 'stable' | 'moderate' | 'volatile';
  lastUpdated: string;
}

export interface LabourRate {
  trade: string;
  skill: 'apprentice' | 'skilled' | 'specialist';
  hourlyRate: number;
  region: string;
  availability: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export interface OverheadFactor {
  category: string;
  percentage: number;
  description: string;
  applicability: string[];
}

export interface CostDataSource {
  provider: string;
  type: 'api' | 'database' | 'manual' | 'estimated';
  reliability: number; // 0-1
  lastUpdated: string;
  coverage: string; // geographic or category coverage
}

export interface CostEstimationRequest {
  projectId: string;
  methodology: 'NRM1' | 'NRM2';
  projectType: ProjectType;
  requirements: ProjectRequirements;
  location: Address;
  timeline?: Timeline;
  qualityLevel?: 'budget' | 'standard' | 'premium';
  includeContingency?: boolean;
  contingencyPercentage?: number;
}

export interface CostUpdateResult {
  estimateId: string;
  previousTotal: number;
  newTotal: number;
  changePercentage: number;
  updatedItems: string[];
  reasons: string[];
  timestamp: string;
}

// Scope of Work (SoW) Types
export interface ScopeOfWork {
  PK: string; // SOW#{sowId}
  SK: string; // METADATA
  id: string;
  projectId: string;
  version: number;
  ribaStages: RibaStage[];
  specifications: Specification[];
  materials: MaterialList;
  costEstimate: CostEstimate;
  complianceChecks: ComplianceCheckResult[];
  workPhases: WorkPhase[];
  deliverables: Deliverable[];
  generatedAt: string;
  approvedAt?: string;
  status: SoWStatus;
  aiGenerationMetadata: AIGenerationMetadata;
  validationResults: SoWValidationResult[];
  GSI4PK?: string; // projectId for lookup
  GSI4SK?: string; // status#version for sorting
}

export type SoWStatus = 'draft' | 'generated' | 'validated' | 'approved' | 'distributed' | 'outdated';

export interface RibaStage {
  stage: number; // 0-7
  title: string;
  description: string;
  deliverables: string[];
  duration: number; // days
  dependencies: string[];
  workPackages: WorkPackage[];
  milestones: Milestone[];
  riskFactors: RiskFactor[];
  qualityStandards: QualityStandard[];
}

export interface WorkPackage {
  id: string;
  title: string;
  description: string;
  trade: string;
  sequence: number;
  duration: number;
  dependencies: string[];
  specifications: string[];
  materials: string[];
  qualityRequirements: string[];
  testingRequirements: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate?: string;
  dependencies: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
}

export interface RiskFactor {
  category: 'technical' | 'regulatory' | 'environmental' | 'commercial' | 'safety';
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  owner: string;
}

export interface QualityStandard {
  standard: string;
  requirement: string;
  testMethod?: string;
  acceptanceCriteria: string;
  frequency: string;
  responsibility: string;
}

export interface Specification {
  id: string;
  category: SpecificationCategory;
  title: string;
  description: string;
  technicalRequirements: TechnicalRequirement[];
  materials: MaterialSpecification[];
  workmanship: WorkmanshipStandard[];
  testing: TestingRequirement[];
  compliance: ComplianceRequirement[];
  aiGenerated: boolean;
  confidence: number;
}

export type SpecificationCategory = 
  | 'structural'
  | 'architectural'
  | 'mechanical'
  | 'electrical'
  | 'plumbing'
  | 'finishes'
  | 'external-works'
  | 'temporary-works'
  | 'health-safety';

export interface TechnicalRequirement {
  parameter: string;
  value: string;
  unit?: string;
  tolerance?: string;
  standard: string;
  testMethod?: string;
  critical: boolean;
}

export interface MaterialSpecification {
  material: string;
  specification: string;
  grade?: string;
  finish?: string;
  supplier?: string;
  alternatives: string[];
  sustainability: SustainabilityRating;
  cost: MaterialCost;
  availability: MaterialAvailability;
}

export interface SustainabilityRating {
  rating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';
  criteria: string[];
  certifications: string[];
  recyclability: number; // percentage
  embodiedCarbon: number; // kg CO2e
}

export interface MaterialCost {
  unitCost: number;
  unit: string;
  currency: 'GBP';
  supplier: string;
  lastUpdated: string;
  priceVolatility: 'stable' | 'moderate' | 'volatile';
}

export interface MaterialAvailability {
  status: 'readily-available' | 'limited' | 'special-order' | 'discontinued';
  leadTime: number; // days
  minimumOrder?: number;
  supplier: string;
  lastChecked: string;
}

export interface WorkmanshipStandard {
  trade: string;
  standard: string;
  requirement: string;
  qualityLevel: 'basic' | 'standard' | 'high' | 'exceptional';
  inspection: InspectionRequirement;
  certification?: string;
}

export interface InspectionRequirement {
  stage: string;
  inspector: 'contractor' | 'client' | 'third-party' | 'building-control';
  frequency: string;
  documentation: string[];
  acceptanceCriteria: string[];
}

export interface TestingRequirement {
  test: string;
  standard: string;
  frequency: string;
  timing: 'before' | 'during' | 'after' | 'ongoing';
  responsibility: string;
  documentation: string[];
  passFailCriteria: string[];
}

export interface ComplianceRequirement {
  regulation: string;
  requirement: string;
  evidence: string[];
  responsibility: string;
  timing: string;
  consequences: string;
}

export interface MaterialList {
  categories: MaterialCategory[];
  totalEstimatedCost: number;
  currency: 'GBP';
  lastUpdated: string;
  supplierRecommendations: SupplierRecommendation[];
  sustainabilityScore: number;
  aiGenerated: boolean;
}

export interface MaterialCategory {
  category: string;
  items: MaterialItem[];
  subtotal: number;
  notes?: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  specification: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier: string;
  alternatives: MaterialAlternative[];
  sustainability: SustainabilityRating;
  availability: MaterialAvailability;
  aiRecommended: boolean;
  confidence: number;
}

export interface MaterialAlternative {
  name: string;
  specification: string;
  costDifference: number; // percentage
  qualityDifference: string;
  availabilityDifference: string;
  sustainabilityDifference: string;
  pros: string[];
  cons: string[];
}

export interface SupplierRecommendation {
  supplier: string;
  category: string;
  rating: number; // 1-5
  strengths: string[];
  coverage: string[];
  contactInfo: ContactInfo;
  terms: SupplierTerms;
  aiRecommended: boolean;
}

export interface SupplierTerms {
  paymentTerms: string;
  deliveryTerms: string;
  minimumOrder?: number;
  discounts: DiscountTier[];
  warranty: string;
}

export interface DiscountTier {
  threshold: number;
  discount: number; // percentage
  description: string;
}

export interface WorkPhase {
  id: string;
  phase: number;
  title: string;
  description: string;
  duration: number; // days
  startDate?: string;
  endDate?: string;
  dependencies: string[];
  workPackages: string[]; // references to WorkPackage IDs
  resources: ResourceRequirement[];
  risks: RiskFactor[];
  qualityGates: QualityGate[];
  aiOptimized: boolean;
}

export interface ResourceRequirement {
  type: 'labour' | 'equipment' | 'materials' | 'services';
  resource: string;
  quantity: number;
  unit: string;
  duration?: number; // days
  cost: number;
  critical: boolean;
  alternatives: string[];
}

export interface QualityGate {
  id: string;
  title: string;
  criteria: string[];
  inspector: string;
  documentation: string[];
  dependencies: string[];
  mandatory: boolean;
}

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  type: DeliverableType;
  ribaStage: number;
  workPhase: string;
  format: string[];
  recipient: string;
  dueDate?: string;
  dependencies: string[];
  acceptanceCriteria: string[];
  aiGenerated: boolean;
}

export type DeliverableType = 
  | 'drawing'
  | 'specification'
  | 'calculation'
  | 'report'
  | 'certificate'
  | 'approval'
  | 'sample'
  | 'prototype'
  | 'documentation';

export interface AIGenerationMetadata {
  model: string;
  version: string;
  promptVersion: string;
  generationTime: number; // milliseconds
  tokensUsed: number;
  confidence: number; // 0-1
  iterationsRequired: number;
  validationPassed: boolean;
  knowledgeBaseSources: string[];
  customizations: AICustomization[];
}

export interface AICustomization {
  parameter: string;
  value: string;
  reason: string;
  confidence: number;
}

export interface SoWValidationResult {
  validator: 'ai' | 'rules' | 'human';
  validationType: 'compliance' | 'completeness' | 'quality' | 'cost' | 'feasibility';
  passed: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  recommendations: string[];
  validatedAt: string;
  validatorDetails?: string;
}

export interface ValidationIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  description: string;
  location: string; // section/item reference
  suggestion: string;
  impact: string;
  autoFixable: boolean;
}

// SoW Generation Request Types
export interface SoWGenerationRequest {
  projectId: string;
  projectType: ProjectType;
  requirements: ProjectRequirements;
  documents: Document[];
  councilData: CouncilData;
  preferences: SoWGenerationPreferences;
  costConstraints?: CostConstraints;
}

export interface SoWGenerationPreferences {
  methodology: 'standard' | 'fast-track' | 'detailed' | 'premium';
  ribaStages: number[]; // which stages to include
  detailLevel: 'basic' | 'standard' | 'detailed' | 'comprehensive';
  sustainabilityFocus: 'none' | 'standard' | 'high' | 'maximum';
  qualityLevel: 'budget' | 'standard' | 'premium' | 'luxury';
  timelinePreference: 'fastest' | 'balanced' | 'quality-focused';
  customRequirements: string[];
  excludeItems: string[];
}

export interface CostConstraints {
  maxBudget: number;
  priorityAreas: string[];
  costOptimization: 'minimize' | 'balance' | 'quality-first';
  contingencyPercentage: number;
  valueEngineering: boolean;
}

// SoW Generation Response Types
export interface SoWGenerationResult {
  success: boolean;
  sowId?: string;
  sow?: ScopeOfWork;
  generationTime: number;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  nextSteps: string[];
  estimatedCost: number;
  confidence: number;
}

// AI Prompt Templates
export interface AIPromptTemplate {
  id: string;
  name: string;
  projectType: ProjectType;
  version: string;
  template: string;
  variables: PromptVariable[];
  examples: PromptExample[];
  validationRules: string[];
  lastUpdated: string;
  performance: PromptPerformance;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: string;
}

export interface PromptExample {
  input: Record<string, any>;
  expectedOutput: string;
  quality: 'good' | 'excellent';
  notes?: string;
}

export interface PromptPerformance {
  averageGenerationTime: number;
  successRate: number;
  averageConfidence: number;
  userSatisfaction: number;
  lastEvaluated: string;
}

// Quote Management Types
export interface Quote {
  PK: string; // SOW#{sowId}
  SK: string; // QUOTE#{quoteId}
  id: string;
  sowId: string;
  builderId: string;
  builderProfile: BuilderProfile;
  totalPrice: number;
  currency: 'GBP';
  breakdown: QuoteBreakdown[];
  timeline: QuoteTimeline;
  warranty: WarrantyDetails;
  certifications: BuilderCertification[];
  terms: QuoteTerms;
  methodology: 'NRM1' | 'NRM2';
  complianceStatement: ComplianceStatement;
  validUntil: string;
  status: QuoteStatus;
  submittedAt: string;
  updatedAt: string;
  version: number;
  GSI3PK: string; // builderId for builder's quotes
  GSI3SK: string; // status#submittedAt for sorting
  GSI5PK?: string; // sowId for SoW quotes lookup
  GSI5SK?: string; // totalPrice for price sorting
}

export type QuoteStatus = 
  | 'draft'
  | 'submitted'
  | 'under-review'
  | 'clarification-requested'
  | 'revised'
  | 'selected'
  | 'rejected'
  | 'withdrawn'
  | 'expired';

export interface BuilderProfile {
  companyName: string;
  tradingName?: string;
  registrationNumber?: string;
  vatNumber?: string;
  address: Address;
  contactPerson: ContactPerson;
  website?: string;
  establishedYear?: number;
  employeeCount?: number;
  specializations: string[];
  serviceAreas: string[];
  rating: BuilderRating;
}

export interface ContactPerson {
  name: string;
  title: string;
  phone: string;
  email: string;
  mobile?: string;
}

export interface BuilderRating {
  overall: number; // 1-5
  reviewCount: number;
  qualityScore: number;
  timelinessScore: number;
  communicationScore: number;
  valueScore: number;
  lastUpdated: string;
}

export interface QuoteBreakdown {
  id: string;
  category: NRM2Element;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalCost: number;
  labourCost: number;
  materialCost: number;
  equipmentCost: number;
  overheadPercentage: number;
  profitPercentage: number;
  notes?: string;
  alternatives?: QuoteAlternative[];
  riskFactors?: QuoteRiskFactor[];
  subItems?: QuoteBreakdown[];
}

export interface QuoteAlternative {
  description: string;
  costDifference: number;
  timeImpact: number; // days
  qualityImpact: 'better' | 'same' | 'lower';
  pros: string[];
  cons: string[];
  recommendation: string;
}

export interface QuoteRiskFactor {
  risk: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  costImpact?: number;
  timeImpact?: number;
}

export interface QuoteTimeline {
  startDate?: string;
  endDate?: string;
  totalDuration: number; // working days
  phases: QuotePhase[];
  criticalPath: string[];
  bufferDays: number;
  weatherDependency: boolean;
  seasonalFactors: string[];
}

export interface QuotePhase {
  id: string;
  name: string;
  description: string;
  startDay: number; // relative to project start
  duration: number; // working days
  dependencies: string[];
  resources: QuoteResource[];
  deliverables: string[];
  milestones: QuoteMilestone[];
}

export interface QuoteResource {
  type: 'labour' | 'equipment' | 'materials' | 'subcontractor';
  description: string;
  quantity: number;
  unit: string;
  dailyRate?: number;
  totalCost: number;
  availability: 'confirmed' | 'provisional' | 'to-be-confirmed';
  critical: boolean;
}

export interface QuoteMilestone {
  name: string;
  day: number; // relative to project start
  description: string;
  paymentTrigger: boolean;
  inspectionRequired: boolean;
}

export interface WarrantyDetails {
  workmanshipWarranty: WarrantyPeriod;
  materialsWarranty: WarrantyPeriod;
  structuralWarranty?: WarrantyPeriod;
  exclusions: string[];
  conditions: string[];
  insuranceBacked: boolean;
  insuranceProvider?: string;
  claimsProcess: string;
}

export interface WarrantyPeriod {
  duration: number;
  unit: 'months' | 'years';
  coverage: string;
  limitations: string[];
}

export interface BuilderCertification {
  name: string;
  issuingBody: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate?: string;
  scope: string;
  verified: boolean;
  verificationDate?: string;
}

export interface QuoteTerms {
  paymentSchedule: PaymentSchedule;
  variationPolicy: string;
  cancellationPolicy: string;
  delayPenalties?: DelayPenalty;
  bonusIncentives?: BonusIncentive[];
  retentionPercentage: number;
  retentionPeriod: number; // months
  disputeResolution: string;
  governingLaw: string;
  additionalTerms: string[];
}

export interface PaymentSchedule {
  type: 'milestone' | 'monthly' | 'weekly' | 'completion';
  schedule: PaymentMilestone[];
  retentionHeld: number; // percentage
  paymentTerms: number; // days
  lateFees?: LateFee;
}

export interface PaymentMilestone {
  milestone: string;
  percentage: number;
  amount: number;
  trigger: string;
  documentation: string[];
}

export interface LateFee {
  type: 'percentage' | 'fixed';
  rate: number;
  gracePeriod: number; // days
  compounding: boolean;
}

export interface DelayPenalty {
  type: 'percentage' | 'daily' | 'weekly';
  rate: number;
  threshold: number; // days
  maximum?: number; // total penalty cap
  exclusions: string[];
}

export interface BonusIncentive {
  type: 'early-completion' | 'quality' | 'safety' | 'environmental';
  criteria: string;
  bonus: number;
  maximum?: number;
}

export interface ComplianceStatement {
  ribaCompliance: boolean;
  ribaStagesAddressed: number[];
  nrmCompliance: boolean;
  nrmMethodology: 'NRM1' | 'NRM2';
  nhbcCompliance: boolean;
  nhbcChapters: string[];
  ricsCompliance: boolean;
  ricsStandards: string[];
  buildingRegulationsCompliance: boolean;
  regulationsAddressed: string[];
  additionalStandards: string[];
  complianceNotes: string;
  certificationRequired: string[];
}

// Quote Distribution Types
export interface QuoteDistribution {
  PK: string; // SOW#{sowId}
  SK: string; // DISTRIBUTION#{distributionId}
  id: string;
  sowId: string;
  projectId: string;
  homeownerId: string;
  selectedBuilders: string[]; // builder IDs
  distributedAt: string;
  dueDate: string;
  status: DistributionStatus;
  responses: DistributionResponse[];
  settings: DistributionSettings;
  GSI6PK?: string; // homeownerId for homeowner's distributions
  GSI6SK?: string; // distributedAt for sorting
}

export type DistributionStatus = 
  | 'pending'
  | 'active'
  | 'responses-received'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface DistributionResponse {
  builderId: string;
  status: 'invited' | 'viewed' | 'quoted' | 'declined' | 'no-response';
  viewedAt?: string;
  respondedAt?: string;
  quoteId?: string;
  declineReason?: string;
}

export interface DistributionSettings {
  maxQuotes: number;
  responseDeadline: string;
  allowQuestions: boolean;
  requireCertifications: string[];
  minimumRating?: number;
  geographicRadius?: number; // km
  specializations?: string[];
  budgetRange?: BudgetRange;
  anonymizeHomeowner: boolean;
}

// Quote Comparison Types
export interface QuoteComparison {
  sowId: string;
  quotes: Quote[];
  comparisonMetrics: ComparisonMetrics;
  recommendations: ComparisonRecommendation[];
  riskAnalysis: ComparisonRiskAnalysis;
  generatedAt: string;
}

export interface ComparisonMetrics {
  priceRange: {
    lowest: number;
    highest: number;
    average: number;
    median: number;
  };
  timelineRange: {
    shortest: number;
    longest: number;
    average: number;
  };
  qualityScores: {
    highest: number;
    lowest: number;
    average: number;
  };
  complianceScores: {
    highest: number;
    lowest: number;
    average: number;
  };
  warrantyComparison: WarrantyComparison;
}

export interface WarrantyComparison {
  workmanshipRange: {
    shortest: number;
    longest: number;
    average: number;
  };
  materialsRange: {
    shortest: number;
    longest: number;
    average: number;
  };
  insuranceBackedCount: number;
}

export interface ComparisonRecommendation {
  type: 'best-value' | 'lowest-price' | 'fastest' | 'highest-quality' | 'most-compliant';
  quoteId: string;
  reason: string;
  score: number;
  pros: string[];
  cons: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ComparisonRiskAnalysis {
  overallRisk: 'low' | 'medium' | 'high';
  priceRisks: PriceRisk[];
  timelineRisks: TimelineRisk[];
  qualityRisks: QualityRisk[];
  complianceRisks: ComplianceRisk[];
  recommendations: string[];
}

export interface PriceRisk {
  quoteId: string;
  risk: string;
  severity: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  impact: string;
  mitigation: string;
}

export interface TimelineRisk {
  quoteId: string;
  risk: string;
  severity: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  impact: string;
  mitigation: string;
}

export interface QualityRisk {
  quoteId: string;
  risk: string;
  severity: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  impact: string;
  mitigation: string;
}

export interface ComplianceRisk {
  quoteId: string;
  risk: string;
  severity: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  impact: string;
  mitigation: string;
}

// Builder Communication Types
export interface BuilderCommunication {
  PK: string; // SOW#{sowId}
  SK: string; // COMMUNICATION#{communicationId}
  id: string;
  sowId: string;
  builderId: string;
  homeownerId: string;
  type: CommunicationType;
  subject: string;
  message: string;
  attachments?: CommunicationAttachment[];
  status: CommunicationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  respondedAt?: string;
  response?: string;
  responseAttachments?: CommunicationAttachment[];
  GSI7PK?: string; // builderId for builder's communications
  GSI7SK?: string; // createdAt for sorting
}

export type CommunicationType = 
  | 'clarification-request'
  | 'specification-query'
  | 'site-access-request'
  | 'variation-proposal'
  | 'general-inquiry'
  | 'response';

export type CommunicationStatus = 
  | 'sent'
  | 'delivered'
  | 'read'
  | 'responded'
  | 'closed';

export interface CommunicationAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  uploadedAt: string;
}

// Quote Request Types
export interface QuoteRequest {
  sowId: string;
  builderId: string;
  dueDate: string;
  requirements: QuoteRequirements;
  restrictions?: QuoteRestrictions;
  preferences?: QuotePreferences;
}

export interface QuoteRequirements {
  methodology: 'NRM1' | 'NRM2';
  detailLevel: 'summary' | 'detailed' | 'comprehensive';
  includeAlternatives: boolean;
  includeRiskAnalysis: boolean;
  certificationRequired: string[];
  warrantyMinimum: {
    workmanship: number; // months
    materials: number; // months
  };
  insuranceRequired: boolean;
  complianceStandards: string[];
}

export interface QuoteRestrictions {
  maxPrice?: number;
  maxTimeline?: number; // days
  startDateAfter?: string;
  endDateBefore?: string;
  excludedMaterials?: string[];
  excludedMethods?: string[];
  accessRestrictions?: string[];
}

export interface QuotePreferences {
  sustainabilityFocus: 'none' | 'standard' | 'high' | 'maximum';
  qualityLevel: 'budget' | 'standard' | 'premium' | 'luxury';
  timelinePreference: 'fastest' | 'balanced' | 'quality-focused';
  paymentPreference: 'milestone' | 'monthly' | 'completion';
  communicationPreference: 'email' | 'phone' | 'platform' | 'all';
}

// Quote Submission Types
export interface QuoteSubmissionRequest {
  sowId: string;
  builderId: string;
  quote: Omit<Quote, 'PK' | 'SK' | 'id' | 'version' | 'GSI3PK' | 'GSI3SK' | 'GSI5PK' | 'GSI5SK'>;
}

export interface QuoteSubmissionResult {
  success: boolean;
  quoteId?: string;
  quote?: Quote;
  validationErrors?: ValidationError[];
  warnings?: string[];
  estimatedProcessingTime?: number;
}

// Quote Validation Types
export interface QuoteValidationResult {
  valid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  complianceCheck: QuoteComplianceCheck;
  costAnalysis: QuoteCostAnalysis;
  timelineAnalysis: QuoteTimelineAnalysis;
  qualityAssessment: QuoteQualityAssessment;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'info' | 'warning';
  suggestion?: string;
}

export interface QuoteComplianceCheck {
  overall: boolean;
  nrmCompliance: boolean;
  ribaCompliance: boolean;
  nhbcCompliance: boolean;
  ricsCompliance: boolean;
  buildingRegsCompliance: boolean;
  missingRequirements: string[];
  recommendations: string[];
}

export interface QuoteCostAnalysis {
  reasonable: boolean;
  marketComparison: 'below' | 'within' | 'above';
  variancePercentage: number;
  costBreakdownValid: boolean;
  rateAnalysis: RateAnalysis[];
  riskFactors: string[];
}

export interface RateAnalysis {
  category: string;
  quotedRate: number;
  marketRate: number;
  variance: number;
  reasonable: boolean;
  notes: string;
}

export interface QuoteTimelineAnalysis {
  realistic: boolean;
  comparison: 'optimistic' | 'realistic' | 'conservative';
  criticalPathValid: boolean;
  resourceAllocationValid: boolean;
  seasonalFactorsConsidered: boolean;
  riskFactors: string[];
}

export interface QuoteQualityAssessment {
  completeness: number; // 0-100
  detailLevel: 'insufficient' | 'adequate' | 'good' | 'excellent';
  professionalPresentation: boolean;
  clarityScore: number; // 0-100
  technicalAccuracy: number; // 0-100
  improvementSuggestions: string[];
}

// Contract Management Types
export interface Contract {
  PK: string; // CONTRACT#{contractId}
  SK: string; // METADATA
  id: string;
  projectId: string;
  sowId: string;
  quoteId: string;
  homeownerId: string;
  builderId: string;
  contractNumber: string;
  version: number;
  status: ContractStatus;
  terms: ContractTerms;
  signatures: ContractSignature[];
  milestones: ContractMilestone[];
  variations: ContractVariation[];
  payments: ContractPayment[];
  documents: ContractDocument[];
  legalCompliance: LegalCompliance;
  consumerProtection: ConsumerProtectionTerms;
  disputeResolution: DisputeResolutionTerms;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
  completedAt?: string;
  terminatedAt?: string;
  GSI7PK?: string; // homeownerId for homeowner's contracts
  GSI7SK?: string; // status#createdAt for sorting
  GSI8PK?: string; // builderId for builder's contracts
  GSI8SK?: string; // status#createdAt for sorting
}

export type ContractStatus = 
  | 'draft'
  | 'pending-signatures'
  | 'partially-signed'
  | 'fully-signed'
  | 'active'
  | 'suspended'
  | 'completed'
  | 'terminated'
  | 'disputed'
  | 'cancelled';

export interface ContractTerms {
  workDescription: string;
  totalValue: number;
  currency: 'GBP';
  paymentSchedule: ContractPaymentSchedule;
  timeline: ContractTimeline;
  warranty: ContractWarranty;
  variations: VariationTerms;
  termination: TerminationTerms;
  insurance: InsuranceRequirements;
  healthSafety: HealthSafetyRequirements;
  qualityStandards: QualityStandardsTerms;
  materials: MaterialsTerms;
  subcontracting: SubcontractingTerms;
  intellectualProperty: IntellectualPropertyTerms;
  confidentiality: ConfidentialityTerms;
  forceMajeure: ForceMajeureTerms;
  additionalTerms: string[];
}

export interface ContractPaymentSchedule {
  type: 'milestone' | 'stage' | 'monthly' | 'weekly';
  totalAmount: number;
  currency: 'GBP';
  schedule: ContractPaymentMilestone[];
  retentionPercentage: number;
  retentionAmount: number;
  retentionReleaseTerms: string;
  paymentTerms: number; // days
  lateFees: ContractLateFees;
  advancePayment?: AdvancePaymentTerms;
}

export interface ContractPaymentMilestone {
  id: string;
  description: string;
  percentage: number;
  amount: number;
  trigger: string;
  requiredDocuments: string[];
  inspectionRequired: boolean;
  dueDate?: string;
  status: 'pending' | 'due' | 'paid' | 'overdue' | 'disputed';
}

export interface ContractLateFees {
  enabled: boolean;
  type: 'percentage' | 'fixed' | 'daily';
  rate: number;
  gracePeriod: number; // days
  maximum?: number;
  compounding: boolean;
}

export interface AdvancePaymentTerms {
  amount: number;
  percentage: number;
  purpose: string;
  securityRequired: boolean;
  securityType?: 'bond' | 'guarantee' | 'insurance';
  refundTerms: string;
}

export interface ContractTimeline {
  startDate: string;
  completionDate: string;
  totalDuration: number; // working days
  phases: ContractPhase[];
  keyDates: ContractKeyDate[];
  delayPenalties: DelayPenaltyTerms;
  extensionTerms: ExtensionTerms;
  weatherAllowances: WeatherAllowanceTerms;
}

export interface ContractPhase {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number; // working days
  dependencies: string[];
  deliverables: string[];
  paymentTrigger: boolean;
  criticalPath: boolean;
}

export interface ContractKeyDate {
  id: string;
  description: string;
  date: string;
  type: 'start' | 'milestone' | 'completion' | 'inspection' | 'payment';
  critical: boolean;
  consequences: string;
}

export interface DelayPenaltyTerms {
  enabled: boolean;
  type: 'percentage' | 'daily' | 'weekly';
  rate: number;
  threshold: number; // days
  maximum?: number;
  exclusions: string[];
  liquidatedDamages: boolean;
}

export interface ExtensionTerms {
  allowedReasons: string[];
  notificationPeriod: number; // days
  documentationRequired: string[];
  approvalProcess: string;
  costImplications: string;
}

export interface WeatherAllowanceTerms {
  enabled: boolean;
  allowedDays: number;
  conditions: string[];
  measurementMethod: string;
  disputeResolution: string;
}

export interface ContractWarranty {
  workmanship: WarrantyTerms;
  materials: WarrantyTerms;
  structural?: WarrantyTerms;
  defectsLiability: DefectsLiabilityTerms;
  maintenanceRequirements: MaintenanceRequirement[];
  exclusions: string[];
  transferability: boolean;
}

export interface WarrantyTerms {
  duration: number;
  unit: 'months' | 'years';
  coverage: string;
  startDate: 'completion' | 'handover' | 'occupation';
  limitations: string[];
  claimsProcess: string;
  remedyOptions: string[];
}

export interface DefectsLiabilityTerms {
  period: number; // months
  coverage: string;
  responseTime: number; // days
  remedyTimeframe: number; // days
  costResponsibility: string;
  emergencyProcedures: string;
}

export interface MaintenanceRequirement {
  item: string;
  frequency: string;
  responsibility: 'homeowner' | 'builder' | 'specialist';
  instructions: string;
  warrantyImpact: string;
}

export interface VariationTerms {
  allowedTypes: string[];
  approvalProcess: string;
  pricingMethod: 'daywork' | 'schedule-rates' | 'quotation';
  timeExtensions: boolean;
  documentationRequired: string[];
  disputeResolution: string;
  maximumValue?: number;
  minimumValue?: number;
}

export interface TerminationTerms {
  terminationRights: TerminationRight[];
  noticePeriods: NoticePeriod[];
  paymentOnTermination: string;
  materialOwnership: string;
  workInProgress: string;
  subcontractorTermination: string;
  disputeResolution: string;
}

export interface TerminationRight {
  party: 'homeowner' | 'builder' | 'either';
  reason: string;
  noticePeriod: number; // days
  consequences: string;
  remedyPeriod?: number; // days
}

export interface NoticePeriod {
  reason: string;
  period: number; // days
  method: string[];
  consequences: string;
}

export interface InsuranceRequirements {
  publicLiability: InsuranceRequirement;
  employersLiability: InsuranceRequirement;
  professionalIndemnity?: InsuranceRequirement;
  contractWorks?: InsuranceRequirement;
  allRisks?: InsuranceRequirement;
  evidenceRequired: string[];
  renewalNotification: boolean;
  additionalInsured: boolean;
}

export interface InsuranceRequirement {
  required: boolean;
  minimumCover: number;
  currency: 'GBP';
  validityPeriod: string;
  deductible?: number;
  specificCoverage: string[];
  exclusions: string[];
}

export interface HealthSafetyRequirements {
  cdmCompliance: boolean;
  riskAssessments: string[];
  methodStatements: string[];
  competentPersons: string[];
  trainingRequirements: string[];
  reportingProcedures: string;
  emergencyProcedures: string;
  inspectionSchedule: string;
  documentationRequired: string[];
}

export interface QualityStandardsTerms {
  applicableStandards: string[];
  inspectionSchedule: InspectionScheduleTerms;
  testingRequirements: TestingRequirementTerms[];
  nonConformanceProcess: string;
  remedialWorkProcess: string;
  qualityAssurance: string;
  certificationRequired: string[];
}

export interface InspectionScheduleTerms {
  stages: string[];
  inspector: 'client' | 'third-party' | 'building-control' | 'contractor';
  noticePeriod: number; // hours
  failureConsequences: string;
  reinspectionProcess: string;
  costs: string;
}

export interface TestingRequirementTerms {
  test: string;
  standard: string;
  frequency: string;
  responsibility: 'homeowner' | 'builder' | 'third-party';
  costs: string;
  failureProcess: string;
  certification: boolean;
}

export interface MaterialsTerms {
  specificationCompliance: boolean;
  approvalProcess: string;
  substitutionPolicy: string;
  qualityStandards: string[];
  deliveryResponsibility: string;
  storageRequirements: string;
  wasteDisposal: string;
  sustainabilityRequirements: string[];
  certificationRequired: string[];
}

export interface SubcontractingTerms {
  allowed: boolean;
  approvalRequired: boolean;
  approvalProcess: string;
  liabilityTerms: string;
  paymentResponsibility: string;
  qualificationRequirements: string[];
  insuranceRequirements: string[];
  directPaymentRights: boolean;
}

export interface IntellectualPropertyTerms {
  designOwnership: string;
  licenseGrants: string;
  modifications: string;
  thirdPartyRights: string;
  confidentialInformation: string;
  useRestrictions: string[];
}

export interface ConfidentialityTerms {
  scope: string;
  duration: string;
  exceptions: string[];
  returnRequirements: string;
  breachConsequences: string;
  survivability: boolean;
}

export interface ForceMajeureTerms {
  definition: string;
  events: string[];
  notificationRequirements: string;
  mitigationObligations: string;
  suspensionRights: string;
  terminationRights: string;
  costAllocation: string;
}

export interface ContractSignature {
  id: string;
  party: 'homeowner' | 'builder' | 'witness' | 'guarantor';
  signerName: string;
  signerTitle?: string;
  signerEmail: string;
  signatureType: 'electronic' | 'digital' | 'wet';
  signatureData?: string; // base64 encoded signature image or digital signature
  signedAt?: string;
  ipAddress?: string;
  deviceInfo?: string;
  location?: string;
  witnessRequired: boolean;
  witnessName?: string;
  witnessSignature?: string;
  witnessedAt?: string;
  status: SignatureStatus;
  verificationCode?: string;
  legalValidity: LegalValidityCheck;
}

export type SignatureStatus = 
  | 'pending'
  | 'invited'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'invalid';

export interface LegalValidityCheck {
  valid: boolean;
  checks: ValidityCheck[];
  timestamp: string;
  certificate?: string;
  auditTrail: string[];
}

export interface ValidityCheck {
  check: string;
  passed: boolean;
  details: string;
  timestamp: string;
}

export interface ContractMilestone {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  actualDate?: string;
  status: MilestoneStatus;
  dependencies: string[];
  deliverables: string[];
  paymentTrigger: boolean;
  inspectionRequired: boolean;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export type MilestoneStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'delayed'
  | 'cancelled'
  | 'disputed';

export interface ContractVariation {
  id: string;
  variationNumber: string;
  description: string;
  reason: string;
  requestedBy: 'homeowner' | 'builder';
  requestedAt: string;
  status: VariationStatus;
  costImpact: number;
  timeImpact: number; // days
  specification: string;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  implementedAt?: string;
  documents: string[];
  notes?: string;
}

export type VariationStatus = 
  | 'requested'
  | 'under-review'
  | 'approved'
  | 'rejected'
  | 'implemented'
  | 'cancelled';

export interface ContractPayment {
  id: string;
  milestoneId: string;
  amount: number;
  currency: 'GBP';
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  reference?: string;
  invoiceNumber?: string;
  retentionHeld: number;
  vatAmount?: number;
  netAmount: number;
  documents: string[];
  notes?: string;
}

export type PaymentStatus = 
  | 'pending'
  | 'due'
  | 'paid'
  | 'overdue'
  | 'disputed'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 
  | 'bank-transfer'
  | 'cheque'
  | 'card'
  | 'cash'
  | 'escrow'
  | 'other';

export interface ContractDocument {
  id: string;
  type: ContractDocumentType;
  name: string;
  description: string;
  s3Key: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  status: 'active' | 'superseded' | 'archived';
  signatures: string[]; // signature IDs
  accessLevel: 'public' | 'parties-only' | 'confidential';
}

export type ContractDocumentType = 
  | 'main-contract'
  | 'schedule'
  | 'specification'
  | 'drawing'
  | 'variation'
  | 'certificate'
  | 'invoice'
  | 'correspondence'
  | 'insurance'
  | 'warranty'
  | 'other';

export interface LegalCompliance {
  ukConstructionLaw: boolean;
  consumerRights: boolean;
  unfairTermsRegulations: boolean;
  constructionAct1996: boolean;
  cdmRegulations: boolean;
  buildingRegulations: boolean;
  planningPermission: boolean;
  dataProtection: boolean;
  healthSafety: boolean;
  environmentalRegulations: boolean;
  complianceCheckedAt: string;
  complianceNotes: string[];
}

export interface ConsumerProtectionTerms {
  coolingOffPeriod: CoolingOffPeriod;
  rightToCancel: RightToCancelTerms;
  unfairTermsProtection: boolean;
  disputeResolution: ConsumerDisputeResolution;
  informationRequirements: InformationRequirement[];
  guaranteeRights: GuaranteeRights;
  remedyRights: RemedyRights;
}

export interface CoolingOffPeriod {
  applicable: boolean;
  duration: number; // days
  startDate: 'contract-signing' | 'work-commencement';
  exclusions: string[];
  cancellationProcess: string;
  refundTerms: string;
}

export interface RightToCancelTerms {
  grounds: string[];
  noticePeriod: number; // days
  process: string;
  consequences: string;
  refundRights: string;
  workStoppageRights: string;
}

export interface ConsumerDisputeResolution {
  internalProcess: string;
  mediationRights: boolean;
  arbitrationRights: boolean;
  courtRights: boolean;
  ombudsmanRights: boolean;
  legalAidRights: boolean;
  costsProtection: string;
}

export interface InformationRequirement {
  requirement: string;
  provided: boolean;
  method: string;
  timing: string;
  consequences: string;
}

export interface GuaranteeRights {
  statutoryRights: string[];
  contractualRights: string[];
  insuranceRights: string[];
  transferRights: boolean;
  enforcementRights: string;
}

export interface RemedyRights {
  defectiveWork: string[];
  delayedCompletion: string[];
  breachOfContract: string[];
  unsatisfactoryWork: string[];
  costOverruns: string[];
  safetyIssues: string[];
}

export interface DisputeResolutionTerms {
  negotiation: NegotiationTerms;
  mediation: MediationTerms;
  arbitration: ArbitrationTerms;
  litigation: LitigationTerms;
  expertDetermination: ExpertDeterminationTerms;
  adjudication: AdjudicationTerms;
  escalationProcess: string[];
  costsAllocation: string;
  interimMeasures: string;
}

export interface NegotiationTerms {
  mandatory: boolean;
  timeframe: number; // days
  process: string;
  representatives: string;
  confidentiality: boolean;
  goodFaith: boolean;
}

export interface MediationTerms {
  mandatory: boolean;
  provider: string;
  timeframe: number; // days
  costs: string;
  binding: boolean;
  confidentiality: boolean;
}

export interface ArbitrationTerms {
  mandatory: boolean;
  rules: string;
  seat: string;
  language: string;
  arbitrators: number;
  costs: string;
  appeals: boolean;
  enforcement: string;
}

export interface LitigationTerms {
  jurisdiction: string;
  courts: string;
  governingLaw: string;
  serviceOfProcess: string;
  costs: string;
  appeals: boolean;
}

export interface ExpertDeterminationTerms {
  applicable: boolean;
  scope: string[];
  expert: string;
  timeframe: number; // days
  costs: string;
  binding: boolean;
  appeals: boolean;
}

export interface AdjudicationTerms {
  applicable: boolean;
  scheme: string;
  timeframe: number; // days
  costs: string;
  binding: boolean;
  enforcement: string;
}

// Contract Generation Types
export interface ContractGenerationRequest {
  projectId: string;
  sowId: string;
  quoteId: string;
  homeownerId: string;
  builderId: string;
  preferences: ContractGenerationPreferences;
  customTerms?: CustomContractTerms;
}

export interface ContractGenerationPreferences {
  template: 'standard' | 'detailed' | 'simple' | 'custom';
  paymentScheduleType: 'milestone' | 'stage' | 'monthly';
  warrantyPeriod: number; // months
  retentionPercentage: number;
  delayPenalties: boolean;
  variationAllowance: number; // percentage
  insuranceRequirements: 'standard' | 'enhanced' | 'minimal';
  disputeResolution: 'negotiation' | 'mediation' | 'arbitration' | 'all';
  additionalProtections: string[];
}

export interface CustomContractTerms {
  additionalClauses: string[];
  modifiedTerms: ModifiedTerm[];
  excludedStandardTerms: string[];
  specialConditions: string[];
  attachments: string[];
}

export interface ModifiedTerm {
  section: string;
  originalTerm: string;
  modifiedTerm: string;
  reason: string;
  legalReview: boolean;
}

export interface ContractGenerationResult {
  success: boolean;
  contractId?: string;
  contract?: Contract;
  generationTime: number;
  warnings: string[];
  errors: string[];
  legalReviewRequired: boolean;
  complianceIssues: string[];
  recommendations: string[];
}

// Digital Signature Types
export interface DigitalSignatureRequest {
  contractId: string;
  signerEmail: string;
  signerName: string;
  signerRole: 'homeowner' | 'builder' | 'witness' | 'guarantor';
  signatureType: 'electronic' | 'digital';
  witnessRequired: boolean;
  expiryDays: number;
  reminderDays: number[];
  customMessage?: string;
}

export interface DigitalSignatureResponse {
  success: boolean;
  signatureId?: string;
  signingUrl?: string;
  expiryDate: string;
  verificationCode: string;
  error?: string;
}

export interface SignatureVerificationResult {
  valid: boolean;
  signatureId: string;
  verificationChecks: VerificationCheck[];
  certificate?: SignatureCertificate;
  auditTrail: SignatureAuditEntry[];
  legalValidity: boolean;
  timestamp: string;
}

export interface VerificationCheck {
  type: 'identity' | 'integrity' | 'timestamp' | 'certificate' | 'revocation';
  status: 'passed' | 'failed' | 'warning';
  details: string;
  timestamp: string;
}

export interface SignatureCertificate {
  issuer: string;
  subject: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  keyUsage: string[];
  certificateChain: string[];
  revocationStatus: 'valid' | 'revoked' | 'unknown';
}

export interface SignatureAuditEntry {
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  details: Record<string, any>;
}

// Contract Status Tracking Types
export interface ContractStatusUpdate {
  contractId: string;
  previousStatus: ContractStatus;
  newStatus: ContractStatus;
  reason: string;
  updatedBy: string;
  updatedAt: string;
  automaticUpdate: boolean;
  notifications: NotificationRecipient[];
}

export interface NotificationRecipient {
  userId: string;
  email: string;
  notificationType: 'email' | 'sms' | 'push' | 'in-app';
  sent: boolean;
  sentAt?: string;
  error?: string;
}

// Contract Audit Trail Types
export interface ContractAuditEntry {
  id: string;
  contractId: string;
  action: ContractAuditAction;
  performedBy: string;
  performedAt: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  previousValue?: any;
  newValue?: any;
}

export type ContractAuditAction = 
  | 'created'
  | 'updated'
  | 'signed'
  | 'milestone-completed'
  | 'payment-made'
  | 'variation-added'
  | 'status-changed'
  | 'document-added'
  | 'terminated'
  | 'disputed'
  | 'resolved';

// Contract Template Types
export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'detailed' | 'simple' | 'custom';
  projectTypes: ProjectType[];
  template: string;
  variables: ContractTemplateVariable[];
  clauses: ContractClause[];
  version: string;
  status: 'active' | 'deprecated' | 'draft';
  createdAt: string;
  updatedAt: string;
  legalReviewDate?: string;
  complianceChecked: boolean;
}

export interface ContractTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: string;
  source: 'project' | 'quote' | 'sow' | 'user-input' | 'calculated';
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  category: 'payment' | 'timeline' | 'warranty' | 'termination' | 'variation' | 'insurance' | 'dispute' | 'other';
  mandatory: boolean;
  conditions?: string[];
  alternatives: string[];
  legalBasis: string;
  consumerFriendly: boolean;
}