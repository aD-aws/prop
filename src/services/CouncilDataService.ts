import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  CouncilData, 
  CouncilDataResult, 
  CouncilSearchResult, 
  ContactInfo, 
  PostcodeAddress 
} from '../types';
import { addressValidationService } from './AddressValidationService';

export class CouncilDataService {
  private cache: NodeCache;
  private readonly cacheTimeout: number;
  private readonly requestTimeout: number;

  // Known council websites and their data endpoints
  private readonly councilEndpoints: Map<string, {
    website: string;
    planningPortal?: string;
    conservationAreasUrl?: string;
    listedBuildingsUrl?: string;
    contactUrl?: string;
  }> = new Map();

  constructor() {
    this.cacheTimeout = config.council.cacheTimeout;
    this.requestTimeout = config.council.requestTimeout;
    this.cache = new NodeCache({ 
      stdTTL: this.cacheTimeout / 1000, // Convert to seconds
      checkperiod: 600 // Check for expired keys every 10 minutes
    });

    this.initializeCouncilEndpoints();
  }

  /**
   * Gets comprehensive council data for a given address
   */
  async getCouncilData(address: PostcodeAddress): Promise<CouncilDataResult> {
    const cacheKey = `council_${address.adminDistrict}_${address.postcode}`;
    
    // Check cache first
    const cachedData = this.cache.get<CouncilData>(cacheKey);
    if (cachedData) {
      logger.info(`Council data retrieved from cache: ${address.adminDistrict}`);
      return {
        success: true,
        data: cachedData,
        source: 'cache',
        lastUpdated: cachedData.lastChecked
      };
    }

    try {
      // Get council information
      const councilInfo = await this.getCouncilInfo(address.adminDistrict);
      
      // Check conservation area status
      const conservationArea = await this.checkConservationArea(
        address, 
        councilInfo
      );

      // Check listed building status
      const listedBuilding = await this.checkListedBuilding(
        address, 
        councilInfo
      );

      // Get planning restrictions
      const planningRestrictions = await this.getPlanningRestrictions(
        address, 
        councilInfo
      );

      const councilData: CouncilData = {
        conservationArea,
        listedBuilding,
        planningRestrictions,
        localAuthority: address.adminDistrict,
        contactDetails: councilInfo.contactDetails,
        lastChecked: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, councilData);

      logger.info(`Council data retrieved and cached: ${address.adminDistrict}`);

      return {
        success: true,
        data: councilData,
        source: 'api',
        lastUpdated: councilData.lastChecked
      };

    } catch (error: any) {
      logger.error('Failed to get council data:', {
        adminDistrict: address.adminDistrict,
        error: error.message
      });

      // Return fallback data
      const fallbackData = this.getFallbackCouncilData(address.adminDistrict);
      
      return {
        success: false,
        data: fallbackData,
        error: error.message,
        source: 'fallback',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Gets basic council information and contact details
   */
  private async getCouncilInfo(localAuthority: string): Promise<CouncilSearchResult> {
    const councilEndpoint = this.councilEndpoints.get(localAuthority.toLowerCase());
    
    if (councilEndpoint) {
      // Use known endpoint
      return await this.scrapeCouncilWebsite(councilEndpoint.website, localAuthority);
    }

    // Try to find council website through search
    const searchResult = await this.searchCouncilWebsite(localAuthority);
    if (searchResult) {
      return searchResult;
    }

    // Return basic information if no website found
    return {
      localAuthority,
      contactDetails: {
        name: `${localAuthority} Council`,
        website: `https://www.${localAuthority.toLowerCase().replace(/\s+/g, '')}.gov.uk`
      }
    };
  }

  /**
   * Searches for council website using various methods
   */
  private async searchCouncilWebsite(localAuthority: string): Promise<CouncilSearchResult | null> {
    try {
      // Try common council website patterns
      const possibleUrls = [
        `https://www.${localAuthority.toLowerCase().replace(/\s+/g, '')}.gov.uk`,
        `https://www.${localAuthority.toLowerCase().replace(/\s+/g, '-')}.gov.uk`,
        `https://${localAuthority.toLowerCase().replace(/\s+/g, '')}.gov.uk`,
        `https://www.${localAuthority.toLowerCase().replace(/\s+/g, '')}council.gov.uk`
      ];

      for (const url of possibleUrls) {
        try {
          const response = await axios.get(url, {
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'UK-Home-Improvement-Platform/1.0'
            }
          });

          if (response.status === 200) {
            return await this.scrapeCouncilWebsite(url, localAuthority);
          }
        } catch (error) {
          // Continue to next URL
          continue;
        }
      }

      return null;
    } catch (error) {
      logger.error('Council website search failed:', { localAuthority, error });
      return null;
    }
  }

  /**
   * Scrapes council website for contact information and planning data
   */
  private async scrapeCouncilWebsite(url: string, localAuthority: string): Promise<CouncilSearchResult> {
    try {
      const response = await axios.get(url, {
        timeout: this.requestTimeout,
        headers: {
          'User-Agent': 'UK-Home-Improvement-Platform/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract contact information
      const contactDetails = this.extractContactDetails($, url);
      
      // Look for planning portal links
      const planningPortal = this.extractPlanningPortalUrl($);

      return {
        localAuthority,
        website: url,
        planningPortal,
        contactDetails
      };

    } catch (error) {
      logger.error('Council website scraping failed:', { url, error });
      
      return {
        localAuthority,
        website: url,
        contactDetails: {
          name: `${localAuthority} Council`,
          website: url
        }
      };
    }
  }

  /**
   * Extracts contact details from council website
   */
  private extractContactDetails($: cheerio.Root, baseUrl: string): ContactInfo {
    const contactInfo: ContactInfo = {
      name: '',
      website: baseUrl
    };

    // Try to find council name
    const titleText = $('title').text();
    if (titleText) {
      contactInfo.name = titleText.split('|')[0].trim();
    }

    // Try to find phone number
    const phoneRegex = /(\+44\s?|0)(\d{2,4}\s?\d{3,4}\s?\d{3,4})/g;
    const bodyText = $('body').text();
    const phoneMatch = bodyText.match(phoneRegex);
    if (phoneMatch && phoneMatch[0]) {
      contactInfo.phone = phoneMatch[0].trim();
    }

    // Try to find email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = bodyText.match(emailRegex);
    if (emailMatch && emailMatch[0]) {
      contactInfo.email = emailMatch[0];
    }

    return contactInfo;
  }

  /**
   * Extracts planning portal URL from council website
   */
  private extractPlanningPortalUrl($: cheerio.Root): string | undefined {
    const planningLinks = $('a[href*="planning"]').toArray();
    
    for (const link of planningLinks) {
      const href = $(link).attr('href');
      if (href && (href.includes('planning') || href.includes('application'))) {
        return href.startsWith('http') ? href : undefined;
      }
    }

    return undefined;
  }

  /**
   * Checks if an address is in a conservation area
   */
  private async checkConservationArea(
    address: PostcodeAddress, 
    councilInfo: CouncilSearchResult
  ): Promise<boolean> {
    try {
      // This would typically involve checking council databases or APIs
      // For now, we'll implement a basic check that can be extended
      
      if (councilInfo.website) {
        // Try to find conservation area information on the council website
        const conservationUrl = `${councilInfo.website}/planning/conservation-areas`;
        
        try {
          const response = await axios.get(conservationUrl, {
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'UK-Home-Improvement-Platform/1.0'
            }
          });

          const $ = cheerio.load(response.data);
          const pageText = $('body').text().toLowerCase();
          
          // Look for postcode or area references
          const postcodeArea = address.postcode.substring(0, 4);
          return pageText.includes(postcodeArea.toLowerCase()) ||
                 pageText.includes(address.adminWard.toLowerCase());
                 
        } catch (error) {
          // If conservation area page doesn't exist, assume false
          return false;
        }
      }

      return false;
    } catch (error) {
      logger.error('Conservation area check failed:', { address, error });
      return false;
    }
  }

  /**
   * Checks if a building is listed
   */
  private async checkListedBuilding(
    address: PostcodeAddress, 
    councilInfo: CouncilSearchResult
  ): Promise<boolean> {
    try {
      // Check Historic England's National Heritage List
      // This is a simplified implementation - in production, you'd use their API
      const heritageUrl = 'https://historicengland.org.uk/listing/the-list/';
      
      // For now, return false as this requires specific API integration
      // In a full implementation, you would:
      // 1. Use Historic England's API
      // 2. Search by postcode and coordinates
      // 3. Check for Grade I, II*, or II listings
      
      return false;
    } catch (error) {
      logger.error('Listed building check failed:', { address, error });
      return false;
    }
  }

  /**
   * Gets planning restrictions for an area
   */
  private async getPlanningRestrictions(
    address: PostcodeAddress, 
    councilInfo: CouncilSearchResult
  ): Promise<string[]> {
    const restrictions: string[] = [];

    try {
      // Check for common planning restrictions
      if (councilInfo.website) {
        const planningUrl = `${councilInfo.website}/planning`;
        
        try {
          const response = await axios.get(planningUrl, {
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'UK-Home-Improvement-Platform/1.0'
            }
          });

          const $ = cheerio.load(response.data);
          const pageText = $('body').text().toLowerCase();
          
          // Look for common restriction keywords
          const restrictionKeywords = [
            'article 4',
            'permitted development',
            'conservation area',
            'listed building',
            'tree preservation',
            'flood risk',
            'green belt'
          ];

          for (const keyword of restrictionKeywords) {
            if (pageText.includes(keyword)) {
              restrictions.push(keyword);
            }
          }
        } catch (error) {
          // If planning page doesn't exist, continue
        }
      }

      return restrictions;
    } catch (error) {
      logger.error('Planning restrictions check failed:', { address, error });
      return [];
    }
  }

  /**
   * Returns fallback council data when API calls fail
   */
  private getFallbackCouncilData(localAuthority: string): CouncilData {
    return {
      conservationArea: false,
      listedBuilding: false,
      planningRestrictions: ['Unable to verify - please check with local authority'],
      localAuthority,
      contactDetails: {
        name: `${localAuthority} Council`,
        website: `https://www.${localAuthority.toLowerCase().replace(/\s+/g, '')}.gov.uk`
      },
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Initializes known council endpoints for faster lookups
   */
  private initializeCouncilEndpoints(): void {
    // Add some major UK councils - this would be expanded in production
    this.councilEndpoints.set('westminster', {
      website: 'https://www.westminster.gov.uk',
      planningPortal: 'https://idoxpa.westminster.gov.uk/online-applications/',
      conservationAreasUrl: 'https://www.westminster.gov.uk/conservation-areas'
    });

    this.councilEndpoints.set('camden', {
      website: 'https://www.camden.gov.uk',
      planningPortal: 'https://camden.planning-register.co.uk/',
      conservationAreasUrl: 'https://www.camden.gov.uk/conservation-areas'
    });

    this.councilEndpoints.set('islington', {
      website: 'https://www.islington.gov.uk',
      planningPortal: 'https://planning.islington.gov.uk/online-applications/',
      conservationAreasUrl: 'https://www.islington.gov.uk/planning/conservation-areas'
    });

    // Add more councils as needed
  }

  /**
   * Clears the cache for a specific local authority
   */
  clearCache(localAuthority?: string): void {
    if (localAuthority) {
      const keys = this.cache.keys().filter(key => key.includes(localAuthority));
      this.cache.del(keys);
    } else {
      this.cache.flushAll();
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { keys: number; hits: number; misses: number } {
    return this.cache.getStats();
  }
}

export const councilDataService = new CouncilDataService();