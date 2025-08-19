import { 
  Quote, 
  QuoteStatus,
  QuoteBreakdown,
  QuoteTimeline,
  WarrantyDetails,
  BuilderCertification,
  QuoteTerms,
  ComplianceStatement,
  BuilderProfile,
  QuoteValidationResult,
  ValidationError,
  NRM2Element
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class QuoteModel {
  static create(quoteData: {
    sowId: string;
    builderId: string;
    builderProfile: BuilderProfile;
    totalPrice: number;
    breakdown: QuoteBreakdown[];
    timeline: QuoteTimeline;
    warranty: WarrantyDetails;
    certifications: BuilderCertification[];
    terms: QuoteTerms;
    methodology: 'NRM1' | 'NRM2';
    complianceStatement: ComplianceStatement;
    validUntil: string;
  }): Quote {
    const quoteId = uuidv4();
    const now = new Date().toISOString();

    return {
      PK: `SOW#${quoteData.sowId}`,
      SK: `QUOTE#${quoteId}`,
      id: quoteId,
      sowId: quoteData.sowId,
      builderId: quoteData.builderId,
      builderProfile: quoteData.builderProfile,
      totalPrice: quoteData.totalPrice,
      currency: 'GBP',
      breakdown: quoteData.breakdown,
      timeline: quoteData.timeline,
      warranty: quoteData.warranty,
      certifications: quoteData.certifications,
      terms: quoteData.terms,
      methodology: quoteData.methodology,
      complianceStatement: quoteData.complianceStatement,
      validUntil: quoteData.validUntil,
      status: 'draft' as QuoteStatus,
      submittedAt: now,
      updatedAt: now,
      version: 1,
      GSI3PK: quoteData.builderId,
      GSI3SK: `draft#${now}`,
      GSI5PK: quoteData.sowId,
      GSI5SK: quoteData.totalPrice.toString().padStart(12, '0') // For price sorting
    };
  }

  static updateStatus(quote: Quote, status: QuoteStatus): Quote {
    const now = new Date().toISOString();
    
    return {
      ...quote,
      status,
      updatedAt: now,
      GSI3SK: `${status}#${quote.submittedAt}`,
    };
  }

  static createRevision(existingQuote: Quote, updates: Partial<Quote>): Quote {
    const newVersion = existingQuote.version + 1;
    const now = new Date().toISOString();
    const quoteId = uuidv4();

    return {
      ...existingQuote,
      ...updates,
      SK: `QUOTE#${quoteId}`,
      id: quoteId,
      version: newVersion,
      status: 'revised' as QuoteStatus,
      updatedAt: now,
      GSI3SK: `revised#${now}`,
      GSI5SK: (updates.totalPrice || existingQuote.totalPrice).toString().padStart(12, '0')
    };
  }

  static validateQuote(quote: Quote): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic validation
    if (!quote.sowId) {
      errors.push({
        field: 'sowId',
        message: 'SoW ID is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!quote.builderId) {
      errors.push({
        field: 'builderId',
        message: 'Builder ID is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (quote.totalPrice <= 0) {
      errors.push({
        field: 'totalPrice',
        message: 'Total price must be greater than 0',
        code: 'INVALID_VALUE'
      });
    }

    // Validate breakdown totals match
    const breakdownTotal = quote.breakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const tolerance = quote.totalPrice * 0.01; // 1% tolerance
    if (Math.abs(breakdownTotal - quote.totalPrice) > tolerance) {
      errors.push({
        field: 'breakdown',
        message: 'Breakdown total does not match quote total price',
        code: 'CALCULATION_ERROR'
      });
    }

    // Validate timeline
    if (quote.timeline.totalDuration <= 0) {
      errors.push({
        field: 'timeline.totalDuration',
        message: 'Timeline duration must be greater than 0',
        code: 'INVALID_VALUE'
      });
    }

    // Validate phases sequence
    const phases = quote.timeline.phases.sort((a, b) => a.startDay - b.startDay);
    for (let i = 1; i < phases.length; i++) {
      const prevPhase = phases[i - 1];
      const currentPhase = phases[i];
      
      if (currentPhase.startDay < prevPhase.startDay + prevPhase.duration) {
        errors.push({
          field: 'timeline.phases',
          message: `Phase "${currentPhase.name}" overlaps with previous phase`,
          code: 'TIMELINE_CONFLICT'
        });
      }
    }

    // Validate warranty periods
    if (quote.warranty.workmanshipWarranty.duration <= 0) {
      errors.push({
        field: 'warranty.workmanshipWarranty.duration',
        message: 'Workmanship warranty duration must be greater than 0',
        code: 'INVALID_VALUE'
      });
    }

    // Validate valid until date
    const validUntilDate = new Date(quote.validUntil);
    const now = new Date();
    if (validUntilDate <= now) {
      errors.push({
        field: 'validUntil',
        message: 'Valid until date must be in the future',
        code: 'INVALID_DATE'
      });
    }

    // Validate NRM2 compliance if methodology is NRM2
    if (quote.methodology === 'NRM2') {
      const requiredElements: NRM2Element[] = [
        'substructure',
        'superstructure',
        'internal-finishes',
        'services',
        'preliminaries'
      ];

      const providedElements = quote.breakdown.map(item => item.category);
      const missingElements = requiredElements.filter(element => 
        !providedElements.includes(element)
      );

      if (missingElements.length > 0) {
        errors.push({
          field: 'breakdown',
          message: `Missing required NRM2 elements: ${missingElements.join(', ')}`,
          code: 'MISSING_NRM2_ELEMENTS'
        });
      }
    }

    // Validate payment schedule totals 100%
    const paymentTotal = quote.terms.paymentSchedule.schedule.reduce(
      (sum, milestone) => sum + milestone.percentage, 0
    );
    if (Math.abs(paymentTotal - 100) > 0.01) {
      errors.push({
        field: 'terms.paymentSchedule',
        message: 'Payment schedule percentages must total 100%',
        code: 'PAYMENT_SCHEDULE_ERROR'
      });
    }

    return errors;
  }

  static calculateBreakdownTotals(breakdown: QuoteBreakdown[]): {
    totalCost: number;
    totalLabour: number;
    totalMaterials: number;
    totalEquipment: number;
    totalOverheads: number;
    totalProfit: number;
  } {
    let totalCost = 0;
    let totalLabour = 0;
    let totalMaterials = 0;
    let totalEquipment = 0;
    let totalOverheads = 0;
    let totalProfit = 0;

    const processItems = (items: QuoteBreakdown[]) => {
      items.forEach(item => {
        totalCost += item.totalCost;
        totalLabour += item.labourCost;
        totalMaterials += item.materialCost;
        totalEquipment += item.equipmentCost;
        
        const overheadAmount = item.totalCost * (item.overheadPercentage / 100);
        const profitAmount = item.totalCost * (item.profitPercentage / 100);
        
        totalOverheads += overheadAmount;
        totalProfit += profitAmount;

        // Process sub-items recursively
        if (item.subItems && item.subItems.length > 0) {
          processItems(item.subItems);
        }
      });
    };

    processItems(breakdown);

    return {
      totalCost,
      totalLabour,
      totalMaterials,
      totalEquipment,
      totalOverheads,
      totalProfit
    };
  }

  static isExpired(quote: Quote): boolean {
    return new Date(quote.validUntil) <= new Date();
  }

  static canBeModified(quote: Quote): boolean {
    const modifiableStatuses: QuoteStatus[] = ['draft', 'clarification-requested'];
    return modifiableStatuses.includes(quote.status) && !this.isExpired(quote);
  }

  static canBeWithdrawn(quote: Quote): boolean {
    const withdrawableStatuses: QuoteStatus[] = ['submitted', 'under-review', 'clarification-requested', 'revised'];
    return withdrawableStatuses.includes(quote.status) && !this.isExpired(quote);
  }

  static getComplianceScore(quote: Quote): number {
    let score = 0;
    let maxScore = 0;

    // RIBA compliance (20 points)
    maxScore += 20;
    if (quote.complianceStatement.ribaCompliance) {
      score += 20;
    }

    // NRM compliance (20 points)
    maxScore += 20;
    if (quote.complianceStatement.nrmCompliance) {
      score += 20;
    }

    // NHBC compliance (20 points)
    maxScore += 20;
    if (quote.complianceStatement.nhbcCompliance) {
      score += 20;
    }

    // RICS compliance (20 points)
    maxScore += 20;
    if (quote.complianceStatement.ricsCompliance) {
      score += 20;
    }

    // Building regulations compliance (20 points)
    maxScore += 20;
    if (quote.complianceStatement.buildingRegulationsCompliance) {
      score += 20;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  static getCriticalPath(quote: Quote): string[] {
    const phases = quote.timeline.phases.sort((a, b) => a.startDay - b.startDay);
    const criticalPath: string[] = [];
    
    phases.forEach(phase => {
      if (phase.dependencies.length === 0 || 
          phase.dependencies.some(dep => criticalPath.includes(dep))) {
        criticalPath.push(phase.id);
      }
    });

    return criticalPath;
  }

  static getResourceSummary(quote: Quote): {
    totalLabourDays: number;
    totalEquipmentDays: number;
    totalMaterialsCost: number;
    criticalResources: string[];
    subcontractorCost: number;
  } {
    let totalLabourDays = 0;
    let totalEquipmentDays = 0;
    let totalMaterialsCost = 0;
    let subcontractorCost = 0;
    const criticalResources: string[] = [];

    quote.timeline.phases.forEach(phase => {
      phase.resources.forEach(resource => {
        switch (resource.type) {
          case 'labour':
            totalLabourDays += resource.quantity;
            break;
          case 'equipment':
            totalEquipmentDays += resource.quantity;
            break;
          case 'materials':
            totalMaterialsCost += resource.totalCost;
            break;
          case 'subcontractor':
            subcontractorCost += resource.totalCost;
            break;
        }

        if (resource.critical) {
          criticalResources.push(`${phase.name}: ${resource.description}`);
        }
      });
    });

    return {
      totalLabourDays,
      totalEquipmentDays,
      totalMaterialsCost,
      criticalResources,
      subcontractorCost
    };
  }

  static sanitizeForResponse(quote: Quote): Omit<Quote, 'GSI3PK' | 'GSI3SK' | 'GSI5PK' | 'GSI5SK'> {
    const { GSI3PK, GSI3SK, GSI5PK, GSI5SK, ...sanitizedQuote } = quote;
    return sanitizedQuote;
  }

  static generateQuoteReference(quote: Quote): string {
    const date = new Date(quote.submittedAt);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const shortId = quote.id.slice(-6).toUpperCase();
    
    return `Q${year}${month}-${shortId}`;
  }

  static calculateMargins(quote: Quote): {
    grossMargin: number;
    netMargin: number;
    overheadPercentage: number;
    profitPercentage: number;
  } {
    const totals = this.calculateBreakdownTotals(quote.breakdown);
    const directCosts = totals.totalLabour + totals.totalMaterials + totals.totalEquipment;
    
    const grossMargin = ((quote.totalPrice - directCosts) / quote.totalPrice) * 100;
    const netMargin = (totals.totalProfit / quote.totalPrice) * 100;
    const overheadPercentage = (totals.totalOverheads / quote.totalPrice) * 100;
    const profitPercentage = netMargin;

    return {
      grossMargin: Math.round(grossMargin * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      overheadPercentage: Math.round(overheadPercentage * 100) / 100,
      profitPercentage: Math.round(profitPercentage * 100) / 100
    };
  }

  static compareQuotes(quotes: Quote[]): {
    priceComparison: { quoteId: string; price: number; rank: number }[];
    timelineComparison: { quoteId: string; duration: number; rank: number }[];
    complianceComparison: { quoteId: string; score: number; rank: number }[];
    warrantyComparison: { quoteId: string; workmanship: number; materials: number; rank: number }[];
  } {
    // Price comparison
    const priceComparison = quotes
      .map(q => ({ quoteId: q.id, price: q.totalPrice, rank: 0 }))
      .sort((a, b) => a.price - b.price)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Timeline comparison
    const timelineComparison = quotes
      .map(q => ({ quoteId: q.id, duration: q.timeline.totalDuration, rank: 0 }))
      .sort((a, b) => a.duration - b.duration)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Compliance comparison
    const complianceComparison = quotes
      .map(q => ({ quoteId: q.id, score: this.getComplianceScore(q), rank: 0 }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // Warranty comparison
    const warrantyComparison = quotes
      .map(q => ({
        quoteId: q.id,
        workmanship: q.warranty.workmanshipWarranty.duration,
        materials: q.warranty.materialsWarranty.duration,
        rank: 0
      }))
      .sort((a, b) => (b.workmanship + b.materials) - (a.workmanship + a.materials))
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return {
      priceComparison,
      timelineComparison,
      complianceComparison,
      warrantyComparison
    };
  }
}