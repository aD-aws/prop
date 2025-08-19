import request from 'supertest';
import { app } from '../../app';
import { DocumentService } from '../../services/DocumentService';
import { SoWGenerationService } from '../../services/SoWGenerationService';
import { AuthService } from '../../services/AuthService';

describe('Performance Tests', () => {
  let authTokens: string[] = [];
  let documentService: DocumentService;
  let sowGenerationService: SoWGenerationService;

  beforeAll(async () => {
    documentService = new DocumentService();
    sowGenerationService = new SoWGenerationService();

    // Create multiple test users for concurrent testing
    for (let i = 0; i < 10; i++) {
      const testUser = {
        email: `perftest${i}@example.com`,
        password: 'TestPassword123!',
        userType: 'homeowner' as const,
        profile: {
          firstName: `Test${i}`,
          lastName: 'User'
        }
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authTokens.push(loginResponse.body.token);
    }
  }, 60000);

  describe('Document Processing Performance', () => {
    test('should process single document within acceptable time', async () => {
      const mockDocument = {
        buffer: Buffer.alloc(1024 * 1024, 'a'), // 1MB mock document
        originalname: 'large-document.pdf',
        mimetype: 'application/pdf'
      };

      const startTime = Date.now();
      const result = await documentService.processDocument(mockDocument);
      const processingTime = Date.now() - startTime;

      expect(result).toHaveProperty('extractedText');
      expect(processingTime).toBeLessThan(30000); // Should process within 30 seconds
    }, 45000);

    test('should handle multiple document uploads concurrently', async () => {
      const documents = Array.from({ length: 5 }, (_, i) => ({
        buffer: Buffer.alloc(512 * 1024, 'a'), // 512KB each
        originalname: `document-${i}.pdf`,
        mimetype: 'application/pdf'
      }));

      const startTime = Date.now();
      const promises = documents.map(doc => documentService.processDocument(doc));
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('extractedText');
      });
      expect(totalTime).toBeLessThan(60000); // Should process all within 60 seconds
    }, 90000);

    test('should maintain performance with large documents', async () => {
      const largeDocument = {
        buffer: Buffer.alloc(5 * 1024 * 1024, 'a'), // 5MB document
        originalname: 'very-large-document.pdf',
        mimetype: 'application/pdf'
      };

      const startTime = Date.now();
      const result = await documentService.processDocument(largeDocument);
      const processingTime = Date.now() - startTime;

      expect(result).toHaveProperty('extractedText');
      expect(processingTime).toBeLessThan(120000); // Should process within 2 minutes
    }, 150000);
  });

  describe('SoW Generation Performance', () => {
    test('should generate SoW within acceptable time', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        requirements: {
          description: 'Convert loft into bedroom with en-suite',
          dimensions: {
            length: 6,
            width: 4,
            height: 2.5
          },
          materials: {
            flooring: 'engineered_wood',
            insulation: 'mineral_wool'
          },
          specialRequirements: ['velux_windows', 'en_suite']
        },
        propertyAddress: {
          line1: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'UK'
        }
      };

      const startTime = Date.now();
      const result = await sowGenerationService.generateSoW(projectData);
      const generationTime = Date.now() - startTime;

      expect(result).toHaveProperty('ribaStages');
      expect(generationTime).toBeLessThan(45000); // Should generate within 45 seconds
    }, 60000);

    test('should handle concurrent SoW generation requests', async () => {
      const projectData = {
        projectType: 'extension',
        requirements: {
          description: 'Single storey rear extension',
          dimensions: {
            length: 4,
            width: 3,
            height: 3
          },
          materials: {
            walls: 'brick',
            roofing: 'tiles'
          },
          specialRequirements: ['bi_fold_doors']
        },
        propertyAddress: {
          line1: '456 Test Avenue',
          city: 'Manchester',
          postcode: 'M1 1AA',
          country: 'UK'
        }
      };

      const startTime = Date.now();
      const promises = Array.from({ length: 3 }, () => 
        sowGenerationService.generateSoW(projectData)
      );
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('ribaStages');
      });
      expect(totalTime).toBeLessThan(90000); // Should generate all within 90 seconds
    }, 120000);
  });

  describe('Concurrent User Load Testing', () => {
    test('should handle multiple users creating projects simultaneously', async () => {
      const projectData = {
        propertyAddress: {
          line1: '789 Load Test Street',
          city: 'Birmingham',
          postcode: 'B1 1AA',
          country: 'UK'
        },
        projectType: 'loft_conversion',
        requirements: {
          description: 'Load test project',
          dimensions: {
            length: 5,
            width: 4,
            height: 2.5
          },
          materials: {
            flooring: 'carpet',
            insulation: 'foam'
          },
          timeline: {
            startDate: '2024-04-01',
            endDate: '2024-06-01'
          },
          budget: {
            min: 10000,
            max: 20000
          },
          specialRequirements: []
        }
      };

      const startTime = Date.now();
      const promises = authTokens.slice(0, 5).map(token =>
        request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${token}`)
          .send(projectData)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
    }, 30000);

    test('should handle concurrent authentication requests', async () => {
      const loginData = {
        email: 'perftest0@example.com',
        password: 'TestPassword123!'
      };

      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    }, 20000);

    test('should maintain response times under load', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`);
        const responseTime = Date.now() - startTime;

        expect(response.status).toBe(200);
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(1000); // Average under 1 second
      expect(maxResponseTime).toBeLessThan(3000); // Max under 3 seconds
    }, 60000);
  });

  describe('Database Performance', () => {
    test('should handle rapid database queries', async () => {
      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds
    }, 30000);

    test('should handle complex queries efficiently', async () => {
      // Create projects for complex query testing
      const projectPromises = authTokens.slice(0, 5).map(token =>
        request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${token}`)
          .send({
            propertyAddress: {
              line1: 'Complex Query Test Street',
              city: 'London',
              postcode: 'SW1A 1AA',
              country: 'UK'
            },
            projectType: 'extension',
            requirements: {
              description: 'Complex query test project',
              dimensions: { length: 4, width: 3, height: 3 },
              materials: { walls: 'brick' },
              timeline: { startDate: '2024-05-01', endDate: '2024-07-01' },
              budget: { min: 15000, max: 25000 },
              specialRequirements: []
            }
          })
      );

      await Promise.all(projectPromises);

      // Test complex query performance
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/projects?status=active&projectType=extension&location=London')
        .set('Authorization', `Bearer ${authTokens[0]}`);
      const queryTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds
    }, 45000);
  });

  describe('Memory Usage Performance', () => {
    test('should not have memory leaks during intensive operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform intensive operations
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authTokens[0]}`);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 30000);
  });

  describe('API Rate Limiting Performance', () => {
    test('should handle rate limiting gracefully', async () => {
      const promises = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authTokens[0]}`)
      );

      const responses = await Promise.all(promises);
      
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses.length + rateLimitedResponses.length).toBe(100);
      
      // Should have some rate limiting in place
      if (rateLimitedResponses.length > 0) {
        rateLimitedResponses.forEach(response => {
          expect(response.body).toHaveProperty('error');
        });
      }
    }, 45000);
  });
});