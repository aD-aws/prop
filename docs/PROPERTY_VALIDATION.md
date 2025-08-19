# Property Address Validation and Council Data Integration

This document describes the property address validation and council data integration functionality implemented in the UK Home Improvement Platform.

## Overview

The property validation system provides:
- UK postcode validation using the postcodes.io API
- Council data integration with web scraping capabilities
- Conservation area and listed building status checking
- Caching mechanism for council data to reduce external API calls
- Fallback mechanisms for when council websites are unavailable

## API Endpoints

### POST /api/property/validate-address
Validates a full property address and retrieves council data.

**Request Body:**
```json
{
  "line1": "Buckingham Palace",
  "line2": "",
  "city": "London",
  "county": "Greater London",
  "postcode": "SW1A 1AA",
  "country": "England"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "normalizedAddress": {
      "line1": "Buckingham Palace",
      "city": "Westminster",
      "county": "Greater London",
      "postcode": "SW1A 1AA",
      "country": "England"
    },
    "postcodeDetails": {
      "valid": true,
      "normalizedPostcode": "SW1A 1AA",
      "address": {
        "postcode": "SW1A 1AA",
        "country": "England",
        "region": "London",
        "adminDistrict": "Westminster",
        "longitude": -0.141588,
        "latitude": 51.501009
      }
    },
    "councilData": {
      "conservationArea": true,
      "listedBuilding": false,
      "planningRestrictions": ["conservation area"],
      "localAuthority": "Westminster",
      "contactDetails": {
        "name": "Westminster City Council",
        "website": "https://www.westminster.gov.uk"
      },
      "lastChecked": "2024-01-15T10:00:00Z"
    },
    "councilDataSource": "api",
    "councilDataLastUpdated": "2024-01-15T10:00:00Z"
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "requestId": "uuid-here"
}
```

### POST /api/property/validate-postcode
Validates just a UK postcode.

**Request Body:**
```json
{
  "postcode": "SW1A 1AA"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "postcode": "SW1A1AA",
    "normalizedPostcode": "SW1A 1AA",
    "address": {
      "postcode": "SW1A 1AA",
      "country": "England",
      "region": "London",
      "adminDistrict": "Westminster",
      "longitude": -0.141588,
      "latitude": 51.501009
    }
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "requestId": "uuid-here"
}
```

### GET /api/property/council-data/:postcode
Gets council data for a specific postcode.

**Response:**
```json
{
  "success": true,
  "data": {
    "councilData": {
      "conservationArea": true,
      "listedBuilding": false,
      "planningRestrictions": ["conservation area"],
      "localAuthority": "Westminster",
      "contactDetails": {
        "name": "Westminster City Council",
        "website": "https://www.westminster.gov.uk"
      },
      "lastChecked": "2024-01-15T10:00:00Z"
    },
    "source": "api",
    "lastUpdated": "2024-01-15T10:00:00Z"
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "requestId": "uuid-here"
}
```

### DELETE /api/property/council-data/cache/:localAuthority?
Clears council data cache for a specific local authority or all cache.

### GET /api/property/health
Gets service health status.

## Services

### AddressValidationService
- Validates UK postcodes using postcodes.io API
- Normalizes postcode format
- Validates full address structure
- Provides local authority information

### CouncilDataService
- Integrates with UK council websites
- Scrapes council data for planning information
- Checks conservation area status
- Checks listed building status
- Caches results to reduce external calls
- Provides fallback mechanisms

### PropertyService
- Combines address validation and council data
- Provides unified property validation interface
- Handles service failures gracefully
- Manages caching and health monitoring

## Configuration

Add these environment variables to your `.env` file:

```bash
# Postcode API Configuration
POSTCODE_API_URL=https://api.postcodes.io
POSTCODE_API_TIMEOUT=5000

# Council Data Configuration
COUNCIL_CACHE_TIMEOUT=86400000  # 24 hours in milliseconds
COUNCIL_REQUEST_TIMEOUT=10000   # 10 seconds
```

## Dependencies

The following npm packages are required:
- `axios` - HTTP client for API calls
- `cheerio` - HTML parsing for web scraping
- `node-cache` - In-memory caching

## Error Handling

The system is designed to be resilient:
- Invalid postcodes return validation errors
- Council website failures fall back to basic information
- Network timeouts are handled gracefully
- All errors are logged for monitoring

## Caching Strategy

- Council data is cached for 24 hours by default
- Cache keys include local authority and postcode
- Cache can be cleared per local authority or entirely
- Cache statistics are available via health endpoint

## Testing

Comprehensive test coverage includes:
- Unit tests for all services
- Integration tests for API endpoints
- Mock external API responses
- Error scenario testing
- Cache behavior testing

Run tests with:
```bash
npm test -- --testPathPattern="AddressValidationService|CouncilDataService|PropertyService|property"
```

## Future Enhancements

- Integration with Historic England API for listed buildings
- Direct API integration with more councils
- Enhanced planning restriction detection
- Real-time council data updates
- Geographic boundary checking