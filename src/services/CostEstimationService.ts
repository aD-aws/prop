import { 
  CostEstimate, 
  CostBreakdown, 
  CostEstimationRequest, 
  CostUpdateResult,
  ConfidenceScore,
  MarketRateData,
  MaterialRate,
  LabourRate,
  OverheadFactor,
  NRM1Category,
  NRM2Element,
  ProjectType,
  ProjectRequirements,
  Timeline,
  Address
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import NodeCache from 'node-cache';
import axios from 'axios';
import { logger } from '../utils/logger';

export class CostEstimationService {
  private cache: NodeCache;
  private marketDataCache: NodeCache;

  constructor() {
    // Cache cost estimates for 1 hour
    this.cache = new NodeCache({ stdTTL: 3600 });
    // Cache market data for 24 hours
    this.marketDataCache = new NodeCache({ stdTTL: 86400 });
  }

  /**
   * Generate cost estimate using NRM1 methodology (Order of Cost Estimating)
   */
  async generateNRM1Estimate(request: CostEstimationRequest): Promise<CostEstimate> {
    logger.info(`Generating NRM1 cost estimate for project ${request.projectId}`);

    const marketData = await this.getMarketRateData(request.location);
    const breakdown = await this.calculateNRM1Breakdown(request, marketData);
    const confidence = this.calculateConfidenceScore(request, marketData, 'NRM1');
    
    const totalCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

    const estimate: CostEstimate = {
      id: uuidv4(),
      projectId: request.projectId,
      methodology: 'NRM1',
      totalCost,
      currency: 'GBP',
      breakdown,
      confidence,
      marketRates: marketData,
      lastUpdated: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      version: 1,
      status: 'draft'
    };

    // Cache the estimate
    this.cache.set(`estimate_${estimate.id}`, estimate);

    logger.info(`Generated NRM1 estimate ${estimate.id} with total cost £${totalCost.toLocaleString()}`);
    return estimate;
  }

  /**
   * Generate cost estimate using NRM2 methodology (Detailed Measurement)
   */
  async generateNRM2Estimate(request: CostEstimationRequest): Promise<CostEstimate> {
    logger.info(`Generating NRM2 cost estimate for project ${request.projectId}`);

    const marketData = await this.getMarketRateData(request.location);
    const breakdown = await this.calculateNRM2Breakdown(request, marketData);
    const confidence = this.calculateConfidenceScore(request, marketData, 'NRM2');
    
    const totalCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

    const estimate: CostEstimate = {
      id: uuidv4(),
      projectId: request.projectId,
      methodology: 'NRM2',
      totalCost,
      currency: 'GBP',
      breakdown,
      confidence,
      marketRates: marketData,
      lastUpdated: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      version: 1,
      status: 'draft'
    };

    // Cache the estimate
    this.cache.set(`estimate_${estimate.id}`, estimate);

    logger.info(`Generated NRM2 estimate ${estimate.id} with total cost £${totalCost.toLocaleString()}`);
    return estimate;
  }

  /**
   * Calculate NRM1 cost breakdown following order of cost estimating
   */
  private async calculateNRM1Breakdown(
    request: CostEstimationRequest, 
    marketData: MarketRateData
  ): Promise<CostBreakdown[]> {
    const breakdown: CostBreakdown[] = [];
    const { projectType, requirements, location } = request;

    // 1. Facilitating Works
    const facilitatingWorks = this.calculateFacilitatingWorks(projectType, requirements, marketData);
    breakdown.push(facilitatingWorks);

    // 2. Building Works (main construction)
    const buildingWorks = this.calculateBuildingWorks(projectType, requirements, marketData);
    breakdown.push(buildingWorks);

    // 3. Building Services (M&E)
    const buildingServices = this.calculateBuildingServices(projectType, requirements, marketData);
    breakdown.push(buildingServices);

    // 4. External Works
    const externalWorks = this.calculateExternalWorks(projectType, requirements, marketData);
    breakdown.push(externalWorks);

    // 5. Demolition Works (if applicable)
    if (this.requiresDemolition(projectType)) {
      const demolitionWorks = this.calculateDemolitionWorks(projectType, requirements, marketData);
      breakdown.push(demolitionWorks);
    }

    // 6. Temporary Works
    const temporaryWorks = this.calculateTemporaryWorks(projectType, requirements, marketData);
    breakdown.push(temporaryWorks);

    // 7. Professional Fees
    const professionalFees = this.calculateProfessionalFees(breakdown, projectType);
    breakdown.push(professionalFees);

    // 8. Other Development Costs
    const otherCosts = this.calculateOtherDevelopmentCosts(breakdown, projectType);
    breakdown.push(otherCosts);

    // 9. Risk Allowances
    if (request.includeContingency) {
      const riskAllowances = this.calculateRiskAllowances(breakdown, request.contingencyPercentage || 10);
      breakdown.push(riskAllowances);
    }

    // 10. VAT
    const vat = this.calculateVAT(breakdown);
    breakdown.push(vat);

    return breakdown;
  }

  /**
   * Calculate NRM2 cost breakdown following detailed measurement principles
   */
  private async calculateNRM2Breakdown(
    request: CostEstimationRequest, 
    marketData: MarketRateData
  ): Promise<CostBreakdown[]> {
    const breakdown: CostBreakdown[] = [];
    const { projectType, requirements } = request;

    // 1. Preliminaries
    const preliminaries = this.calculatePreliminaries(projectType, requirements, marketData);
    breakdown.push(preliminaries);

    // 2. Substructure
    const substructure = this.calculateSubstructure(projectType, requirements, marketData);
    breakdown.push(substructure);

    // 3. Superstructure
    const superstructure = this.calculateSuperstructure(projectType, requirements, marketData);
    breakdown.push(superstructure);

    // 4. Internal Finishes
    const internalFinishes = this.calculateInternalFinishes(projectType, requirements, marketData);
    breakdown.push(internalFinishes);

    // 5. Fittings and Furnishings
    const fittings = this.calculateFittingsAndFurnishings(projectType, requirements, marketData);
    breakdown.push(fittings);

    // 6. Services (M&E detailed)
    const services = this.calculateDetailedServices(projectType, requirements, marketData);
    breakdown.push(services);

    // 7. External Works (detailed)
    const externalWorks = this.calculateDetailedExternalWorks(projectType, requirements, marketData);
    breakdown.push(externalWorks);

    // 8. Overheads and Profit
    const overheadsProfit = this.calculateOverheadsAndProfit(breakdown, marketData);
    breakdown.push(overheadsProfit);

    return breakdown;
  }

  /**
   * Get current market rate data for the location
   */
  private async getMarketRateData(location: Address): Promise<MarketRateData> {
    const cacheKey = `market_data_${location.postcode}`;
    const cached = this.marketDataCache.get<MarketRateData>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // In a real implementation, this would call actual construction cost APIs
      // For now, we'll use mock data based on UK averages
      const marketData: MarketRateData = {
        region: this.getRegionFromPostcode(location.postcode),
        lastUpdated: new Date().toISOString(),
        source: 'UK Construction Cost Database',
        rates: await this.getMaterialRates(location),
        labourRates: await this.getLabourRates(location),
        overheadFactors: this.getOverheadFactors()
      };

      this.marketDataCache.set(cacheKey, marketData);
      return marketData;
    } catch (error) {
      logger.error('Failed to fetch market rate data:', error);
      // Return fallback data
      return this.getFallbackMarketData(location);
    }
  }

  /**
   * Calculate confidence score based on data quality and project factors
   */
  private calculateConfidenceScore(
    request: CostEstimationRequest,
    marketData: MarketRateData,
    methodology: 'NRM1' | 'NRM2'
  ): ConfidenceScore {
    let dataQuality = 0.8; // Base data quality
    let marketStability = 0.7; // Current market conditions
    let projectComplexity = this.assessProjectComplexity(request.projectType, request.requirements);
    let timeHorizon = this.assessTimeHorizon(request.timeline);

    // Adjust for methodology
    if (methodology === 'NRM2') {
      dataQuality += 0.1; // More detailed methodology
    }

    // Adjust for market data freshness
    const dataAge = Date.now() - new Date(marketData.lastUpdated).getTime();
    const daysSinceUpdate = dataAge / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) {
      dataQuality -= 0.1;
    }

    const overall = (dataQuality + marketStability + projectComplexity + timeHorizon) / 4;

    return {
      overall: Math.max(0, Math.min(1, overall)),
      dataQuality,
      marketStability,
      projectComplexity,
      timeHorizon,
      explanation: this.generateConfidenceExplanation(overall, methodology),
      factors: [
        {
          factor: 'Data Quality',
          impact: dataQuality > 0.7 ? 'positive' : 'negative',
          weight: 0.3,
          description: `Market data is ${daysSinceUpdate < 7 ? 'very recent' : daysSinceUpdate < 30 ? 'recent' : 'outdated'}`
        },
        {
          factor: 'Market Stability',
          impact: marketStability > 0.7 ? 'positive' : 'negative',
          weight: 0.25,
          description: 'Current construction market conditions'
        },
        {
          factor: 'Project Complexity',
          impact: projectComplexity > 0.7 ? 'positive' : 'negative',
          weight: 0.25,
          description: `${request.projectType} complexity assessment`
        },
        {
          factor: 'Time Horizon',
          impact: timeHorizon > 0.7 ? 'positive' : 'negative',
          weight: 0.2,
          description: 'Project timeline predictability'
        }
      ]
    };
  }

  /**
   * Update cost estimate with latest market rates
   */
  async updateCostEstimate(estimateId: string): Promise<CostUpdateResult> {
    const estimate = this.cache.get<CostEstimate>(`estimate_${estimateId}`);
    if (!estimate) {
      throw new Error(`Cost estimate ${estimateId} not found`);
    }

    const previousTotal = estimate.totalCost;
    
    // Get latest market data
    const location = { postcode: estimate.marketRates.region } as Address;
    const newMarketData = await this.getMarketRateData(location);
    
    // Recalculate breakdown with new rates
    const updatedBreakdown = await this.updateBreakdownWithNewRates(
      estimate.breakdown,
      estimate.marketRates,
      newMarketData
    );

    const newTotal = updatedBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const changePercentage = ((newTotal - previousTotal) / previousTotal) * 100;

    // Update the estimate
    estimate.totalCost = newTotal;
    estimate.breakdown = updatedBreakdown;
    estimate.marketRates = newMarketData;
    estimate.lastUpdated = new Date().toISOString();
    estimate.version += 1;

    this.cache.set(`estimate_${estimateId}`, estimate);

    const result: CostUpdateResult = {
      estimateId,
      previousTotal,
      newTotal,
      changePercentage,
      updatedItems: updatedBreakdown.map(item => item.category),
      reasons: this.identifyUpdateReasons(estimate.breakdown, updatedBreakdown),
      timestamp: new Date().toISOString()
    };

    logger.info(`Updated cost estimate ${estimateId}: ${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(2)}%`);
    return result;
  }

  // Helper methods for NRM1 calculations
  private calculateFacilitatingWorks(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = this.getBaseRateForProjectType(projectType, 'facilitating-works');
    const area = requirements.dimensions.area || 50; // Default area
    const quantity = area;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'facilitating-works',
      description: 'Site preparation, access, temporary services',
      quantity,
      unit: 'm²',
      unitRate,
      totalCost: quantity * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.8,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.8,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateBuildingWorks(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = this.getBaseRateForProjectType(projectType, 'building-works');
    const area = requirements.dimensions.area || 50;
    const qualityMultiplier = this.getQualityMultiplier(requirements.materials.quality);
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region) * qualityMultiplier;
    
    return {
      category: 'building-works',
      description: 'Main construction works including structure and envelope',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.85,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.85,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateBuildingServices(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = this.getBaseRateForProjectType(projectType, 'building-services');
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'building-services',
      description: 'Mechanical and electrical services',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.75,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.75,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateExternalWorks(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = this.getBaseRateForProjectType(projectType, 'external-works');
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'external-works',
      description: 'Landscaping, driveways, external utilities',
      quantity: area * 0.3, // Typically 30% of building area
      unit: 'm²',
      unitRate,
      totalCost: area * 0.3 * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.7,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.7,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateDemolitionWorks(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 50; // £50/m² for demolition
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'demolition-works',
      description: 'Demolition and removal of existing structures',
      quantity: area * 0.5, // Partial demolition typically
      unit: 'm²',
      unitRate,
      totalCost: area * 0.5 * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.8,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.8,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateTemporaryWorks(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 25; // £25/m² for temporary works
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'temporary-works',
      description: 'Scaffolding, temporary supports, site facilities',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.75,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.75,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateProfessionalFees(breakdown: CostBreakdown[], projectType: ProjectType): CostBreakdown {
    const constructionCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const feePercentage = this.getProfessionalFeePercentage(projectType);
    const totalCost = constructionCost * (feePercentage / 100);
    
    return {
      category: 'professional-fees',
      description: 'Architect, structural engineer, planning consultant fees',
      quantity: 1,
      unit: 'item',
      unitRate: totalCost,
      totalCost,
      source: {
        provider: 'RIBA Fee Guidelines',
        type: 'database',
        reliability: 0.9,
        lastUpdated: new Date().toISOString(),
        coverage: 'UK'
      },
      confidence: 0.9,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateOtherDevelopmentCosts(breakdown: CostBreakdown[], projectType: ProjectType): CostBreakdown {
    const constructionCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const percentage = 5; // 5% for planning fees, building control, etc.
    const totalCost = constructionCost * (percentage / 100);
    
    return {
      category: 'other-development-costs',
      description: 'Planning fees, building control, utilities connections',
      quantity: 1,
      unit: 'item',
      unitRate: totalCost,
      totalCost,
      source: {
        provider: 'UK Government Fee Schedules',
        type: 'database',
        reliability: 0.95,
        lastUpdated: new Date().toISOString(),
        coverage: 'UK'
      },
      confidence: 0.95,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateRiskAllowances(breakdown: CostBreakdown[], contingencyPercentage: number): CostBreakdown {
    const constructionCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const totalCost = constructionCost * (contingencyPercentage / 100);
    
    return {
      category: 'risk-allowances',
      description: `Contingency allowance (${contingencyPercentage}%)`,
      quantity: 1,
      unit: 'item',
      unitRate: totalCost,
      totalCost,
      source: {
        provider: 'Risk Assessment',
        type: 'estimated',
        reliability: 0.8,
        lastUpdated: new Date().toISOString(),
        coverage: 'Project Specific'
      },
      confidence: 0.8,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateVAT(breakdown: CostBreakdown[]): CostBreakdown {
    const netCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const vatRate = 0.2; // 20% VAT
    const totalCost = netCost * vatRate;
    
    return {
      category: 'vat',
      description: 'Value Added Tax (20%)',
      quantity: 1,
      unit: 'item',
      unitRate: totalCost,
      totalCost,
      source: {
        provider: 'HMRC',
        type: 'database',
        reliability: 1.0,
        lastUpdated: new Date().toISOString(),
        coverage: 'UK'
      },
      confidence: 1.0,
      lastUpdated: new Date().toISOString()
    };
  }

  // Helper methods for NRM2 calculations (detailed measurement)
  private calculatePreliminaries(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 150; // £150/m² for preliminaries
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'preliminaries',
      description: 'Site management, insurance, temporary works',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.85,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.85,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateSubstructure(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 200; // £200/m² for substructure
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'substructure',
      description: 'Foundations, basement, ground floor slab',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.9,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.9,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateSuperstructure(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 800; // £800/m² for superstructure
    const area = requirements.dimensions.area || 50;
    const qualityMultiplier = this.getQualityMultiplier(requirements.materials.quality);
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region) * qualityMultiplier;
    
    return {
      category: 'superstructure',
      description: 'Frame, upper floors, roof, external walls, windows',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.9,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.9,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateInternalFinishes(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 300; // £300/m² for internal finishes
    const area = requirements.dimensions.area || 50;
    const qualityMultiplier = this.getQualityMultiplier(requirements.materials.quality);
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region) * qualityMultiplier;
    
    return {
      category: 'internal-finishes',
      description: 'Wall finishes, floor finishes, ceiling finishes',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.8,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.8,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateFittingsAndFurnishings(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 100; // £100/m² for fittings
    const area = requirements.dimensions.area || 50;
    const qualityMultiplier = this.getQualityMultiplier(requirements.materials.quality);
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region) * qualityMultiplier;
    
    return {
      category: 'fittings-furnishings',
      description: 'Built-in furniture, fixtures, specialist fittings',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.75,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.75,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateDetailedServices(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 400; // £400/m² for detailed services
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'services',
      description: 'Heating, plumbing, electrical, ventilation, security',
      quantity: area,
      unit: 'm²',
      unitRate,
      totalCost: area * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.8,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.8,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateDetailedExternalWorks(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    marketData: MarketRateData
  ): CostBreakdown {
    const baseRate = 150; // £150/m² for detailed external works
    const area = requirements.dimensions.area || 50;
    const unitRate = baseRate * this.getRegionalMultiplier(marketData.region);
    
    return {
      category: 'external-works',
      description: 'Site works, drainage, landscaping, external services',
      quantity: area * 0.4, // 40% of building area
      unit: 'm²',
      unitRate,
      totalCost: area * 0.4 * unitRate,
      source: {
        provider: marketData.source,
        type: 'database',
        reliability: 0.75,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.75,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateOverheadsAndProfit(breakdown: CostBreakdown[], marketData: MarketRateData): CostBreakdown {
    const constructionCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const overheadPercentage = 15; // 15% for overheads and profit
    const totalCost = constructionCost * (overheadPercentage / 100);
    
    return {
      category: 'overheads-profit',
      description: 'Contractor overheads and profit margin',
      quantity: 1,
      unit: 'item',
      unitRate: totalCost,
      totalCost,
      source: {
        provider: 'Industry Standards',
        type: 'database',
        reliability: 0.85,
        lastUpdated: marketData.lastUpdated,
        coverage: marketData.region
      },
      confidence: 0.85,
      lastUpdated: new Date().toISOString()
    };
  }

  // Utility methods
  private getBaseRateForProjectType(projectType: ProjectType, category: string): number {
    // Base rates per m² for different project types and categories
    const rates: Record<ProjectType, Record<string, number>> = {
      'loft-conversion': {
        'facilitating-works': 50,
        'building-works': 1200,
        'building-services': 300,
        'external-works': 100
      },
      'rear-extension': {
        'facilitating-works': 75,
        'building-works': 1500,
        'building-services': 400,
        'external-works': 150
      },
      'side-extension': {
        'facilitating-works': 75,
        'building-works': 1400,
        'building-services': 350,
        'external-works': 125
      },
      'bathroom-renovation': {
        'facilitating-works': 25,
        'building-works': 800,
        'building-services': 600,
        'external-works': 50
      },
      'kitchen-renovation': {
        'facilitating-works': 30,
        'building-works': 900,
        'building-services': 500,
        'external-works': 50
      },
      'conservatory': {
        'facilitating-works': 40,
        'building-works': 1000,
        'building-services': 200,
        'external-works': 200
      },
      'garage-conversion': {
        'facilitating-works': 35,
        'building-works': 800,
        'building-services': 400,
        'external-works': 75
      },
      'basement-conversion': {
        'facilitating-works': 100,
        'building-works': 2000,
        'building-services': 500,
        'external-works': 150
      },
      'roof-replacement': {
        'facilitating-works': 60,
        'building-works': 300,
        'building-services': 100,
        'external-works': 50
      },
      'other': {
        'facilitating-works': 50,
        'building-works': 1000,
        'building-services': 300,
        'external-works': 100
      }
    };

    return rates[projectType]?.[category] || 500; // Default rate
  }

  private getRegionalMultiplier(region: string): number {
    const multipliers: Record<string, number> = {
      'London': 1.4,
      'South East': 1.2,
      'South West': 1.1,
      'East': 1.1,
      'West Midlands': 1.0,
      'East Midlands': 0.95,
      'Yorkshire': 0.9,
      'North West': 0.9,
      'North East': 0.85,
      'Wales': 0.9,
      'Scotland': 0.95,
      'Northern Ireland': 0.85
    };

    return multipliers[region] || 1.0;
  }

  private getQualityMultiplier(quality: 'budget' | 'standard' | 'premium'): number {
    const multipliers = {
      'budget': 0.8,
      'standard': 1.0,
      'premium': 1.4
    };

    return multipliers[quality];
  }

  private requiresDemolition(projectType: ProjectType): boolean {
    return ['rear-extension', 'side-extension', 'basement-conversion', 'garage-conversion'].includes(projectType);
  }

  private getProfessionalFeePercentage(projectType: ProjectType): number {
    const percentages: Record<ProjectType, number> = {
      'loft-conversion': 12,
      'rear-extension': 15,
      'side-extension': 15,
      'bathroom-renovation': 8,
      'kitchen-renovation': 8,
      'conservatory': 10,
      'garage-conversion': 10,
      'basement-conversion': 18,
      'roof-replacement': 10,
      'other': 12
    };

    return percentages[projectType] || 12;
  }

  private assessProjectComplexity(projectType: ProjectType, requirements: ProjectRequirements): number {
    let complexity = 0.7; // Base complexity

    // Adjust for project type
    const complexityFactors: Record<ProjectType, number> = {
      'loft-conversion': 0.8,
      'rear-extension': 0.7,
      'side-extension': 0.7,
      'bathroom-renovation': 0.6,
      'kitchen-renovation': 0.6,
      'conservatory': 0.5,
      'garage-conversion': 0.6,
      'basement-conversion': 0.9,
      'roof-replacement': 0.7,
      'other': 0.7
    };

    complexity = complexityFactors[projectType];

    // Adjust for special requirements
    if (requirements.specialRequirements.length > 0) {
      complexity -= 0.1;
    }

    return Math.max(0.3, Math.min(1.0, complexity));
  }

  private assessTimeHorizon(timeline?: Timeline): number {
    if (!timeline?.startDate) {
      return 0.6; // Unknown timeline reduces confidence
    }

    const startDate = new Date(timeline.startDate);
    const monthsAhead = (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsAhead < 1) return 0.9; // Very near term
    if (monthsAhead < 3) return 0.8; // Near term
    if (monthsAhead < 6) return 0.7; // Medium term
    if (monthsAhead < 12) return 0.6; // Long term
    return 0.5; // Very long term
  }

  private generateConfidenceExplanation(overall: number, methodology: 'NRM1' | 'NRM2'): string {
    if (overall > 0.8) {
      return `High confidence estimate using ${methodology} methodology with recent market data and well-defined project parameters.`;
    } else if (overall > 0.6) {
      return `Good confidence estimate using ${methodology} methodology. Some uncertainty due to market conditions or project complexity.`;
    } else if (overall > 0.4) {
      return `Moderate confidence estimate using ${methodology} methodology. Significant uncertainty factors present.`;
    } else {
      return `Low confidence estimate using ${methodology} methodology. High uncertainty due to limited data or complex project factors.`;
    }
  }

  private getRegionFromPostcode(postcode: string): string {
    // Simplified postcode to region mapping
    const firstLetter = postcode.charAt(0).toUpperCase();
    const firstTwoLetters = postcode.substring(0, 2).toUpperCase();
    
    const regionMap: Record<string, string> = {
      'E': 'London',
      'N': 'London',
      'S': 'London',
      'W': 'London',
      'SW': 'London',
      'SE': 'London',
      'NE': 'North East',
      'NW': 'London',
      'B': 'West Midlands',
      'M': 'North West',
      'L': 'North West',
      'G': 'Scotland',
      'EH': 'Scotland',
      'CF': 'Wales',
      'BT': 'Northern Ireland'
    };

    // Check two-letter codes first, then single letter
    return regionMap[firstTwoLetters] || regionMap[firstLetter] || 'England';
  }

  private async getMaterialRates(location: Address): Promise<MaterialRate[]> {
    // Mock material rates - in production, this would call real APIs
    return [
      {
        material: 'Concrete',
        category: 'Structural',
        unit: 'm³',
        rate: 120,
        quality: 'standard',
        availability: 'readily-available',
        priceVolatility: 'moderate',
        lastUpdated: new Date().toISOString()
      },
      {
        material: 'Brick',
        category: 'Masonry',
        unit: '1000',
        rate: 450,
        quality: 'standard',
        availability: 'readily-available',
        priceVolatility: 'stable',
        lastUpdated: new Date().toISOString()
      },
      {
        material: 'Timber Frame',
        category: 'Structural',
        unit: 'm²',
        rate: 85,
        quality: 'standard',
        availability: 'readily-available',
        priceVolatility: 'volatile',
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  private async getLabourRates(location: Address): Promise<LabourRate[]> {
    const region = this.getRegionFromPostcode(location.postcode);
    const baseRate = 35; // £35/hour base rate
    const regionalMultiplier = this.getRegionalMultiplier(region);

    return [
      {
        trade: 'General Builder',
        skill: 'skilled',
        hourlyRate: baseRate * regionalMultiplier,
        region,
        availability: 'medium',
        lastUpdated: new Date().toISOString()
      },
      {
        trade: 'Electrician',
        skill: 'specialist',
        hourlyRate: (baseRate + 10) * regionalMultiplier,
        region,
        availability: 'low',
        lastUpdated: new Date().toISOString()
      },
      {
        trade: 'Plumber',
        skill: 'skilled',
        hourlyRate: (baseRate + 5) * regionalMultiplier,
        region,
        availability: 'medium',
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  private getOverheadFactors(): OverheadFactor[] {
    return [
      {
        category: 'Site Overheads',
        percentage: 8,
        description: 'Site management, temporary facilities',
        applicability: ['all-projects']
      },
      {
        category: 'Head Office Overheads',
        percentage: 5,
        description: 'Company overheads and administration',
        applicability: ['all-projects']
      },
      {
        category: 'Profit',
        percentage: 7,
        description: 'Contractor profit margin',
        applicability: ['all-projects']
      }
    ];
  }

  private getFallbackMarketData(location: Address): MarketRateData {
    return {
      region: this.getRegionFromPostcode(location.postcode),
      lastUpdated: new Date().toISOString(),
      source: 'Fallback Data',
      rates: [],
      labourRates: [],
      overheadFactors: this.getOverheadFactors()
    };
  }

  private async updateBreakdownWithNewRates(
    oldBreakdown: CostBreakdown[],
    oldMarketData: MarketRateData,
    newMarketData: MarketRateData
  ): Promise<CostBreakdown[]> {
    // Update each breakdown item with new rates
    return oldBreakdown.map(item => {
      // Calculate rate change factor
      const rateChangeFactor = this.calculateRateChangeFactor(oldMarketData, newMarketData);
      const newUnitRate = item.unitRate * rateChangeFactor;
      
      return {
        ...item,
        unitRate: newUnitRate,
        totalCost: item.quantity * newUnitRate,
        lastUpdated: new Date().toISOString()
      };
    });
  }

  private calculateRateChangeFactor(oldData: MarketRateData, newData: MarketRateData): number {
    // Simplified rate change calculation
    // In production, this would compare specific material and labour rates
    const oldDate = new Date(oldData.lastUpdated);
    const newDate = new Date(newData.lastUpdated);
    const monthsDiff = (newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    // Assume 2% inflation per year
    const annualInflation = 0.02;
    const changeFactor = 1 + (annualInflation * monthsDiff / 12);
    
    return changeFactor;
  }

  private identifyUpdateReasons(oldBreakdown: CostBreakdown[], newBreakdown: CostBreakdown[]): string[] {
    const reasons: string[] = [];
    
    for (let i = 0; i < oldBreakdown.length; i++) {
      const oldItem = oldBreakdown[i];
      const newItem = newBreakdown[i];
      
      if (newItem.totalCost !== oldItem.totalCost) {
        const changePercent = ((newItem.totalCost - oldItem.totalCost) / oldItem.totalCost) * 100;
        reasons.push(`${oldItem.category}: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}% due to market rate changes`);
      }
    }
    
    return reasons;
  }
}

export default new CostEstimationService();