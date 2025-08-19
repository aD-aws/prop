import request from 'supertest';
import { app } from '../app';
import { AuthService } from '../services/AuthService';

describe('API Coverage Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      userType: 'homeowner' as const,
      profile: {
        firstName: 'Test',
        lastName: 'User'
      }
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    testUserId = registerResponse.body.user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authToken = loginResponse.body.token;
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          userType: 'homeowner',
          profile: {
            firstName: 'New',
            lastName: 'User'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    test('POST /api/auth/login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    test('POST /api/auth/refresh', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    test('POST /api/auth/logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('User Management Endpoints', () => {
    test('GET /api/users/profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
    });

    test('PUT /api/users/profile', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profile: {
            firstName: 'Updated',
            lastName: 'User',
            phone: '+44 7700 900123'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.profile.firstName).toBe('Updated');
    });

    test('DELETE /api/users/account', async () => {
      // Create a separate user for deletion test
      const deleteUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'delete@example.com',
          password: 'Password123!',
          userType: 'homeowner',
          profile: {
            firstName: 'Delete',
            lastName: 'User'
          }
        });

      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${deleteUser.body.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Project Management Endpoints', () => {
    test('POST /api/projects', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          propertyAddress: {
            line1: '123 Test Street',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'UK'
          },
          projectType: 'loft_conversion',
          requirements: {
            description: 'Convert loft into bedroom',
            dimensions: {
              length: 6,
              width: 4,
              height: 2.5
            },
            materials: {
              flooring: 'engineered_wood',
              insulation: 'mineral_wool'
            },
            timeline: {
              startDate: '2024-03-01',
              endDate: '2024-05-01'
            },
            budget: {
              min: 15000,
              max: 25000
            },
            specialRequirements: ['velux_windows', 'en_suite']
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      testProjectId = response.body.id;
    });

    test('GET /api/projects/:id', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testProjectId);
    });

    test('PUT /api/projects/:id', async () => {
      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requirements: {
            description: 'Updated loft conversion with study area',
            dimensions: {
              length: 6,
              width: 4,
              height: 2.5
            },
            materials: {
              flooring: 'engineered_wood',
              insulation: 'mineral_wool'
            },
            timeline: {
              startDate: '2024-03-01',
              endDate: '2024-05-01'
            },
            budget: {
              min: 18000,
              max: 28000
            },
            specialRequirements: ['velux_windows', 'en_suite', 'study_area']
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.requirements.specialRequirements).toContain('study_area');
    });

    test('GET /api/projects/:id/council-data', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/council-data`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('conservationArea');
      expect(response.body).toHaveProperty('listedBuilding');
    });
  });

  describe('Document Management Endpoints', () => {
    test('POST /api/projects/:id/documents', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/documents`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test file content'), 'test.pdf')
        .field('documentType', 'structural_drawing');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.documentType).toBe('structural_drawing');
    });

    test('GET /api/projects/:id/documents', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/documents`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Scope of Work Endpoints', () => {
    test('POST /api/sow/generate', async () => {
      const response = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('ribaStages');
    });

    test('POST /api/sow/:id/validate', async () => {
      // First generate a SoW
      const sowResponse = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId
        });

      const response = await request(app)
        .post(`/api/sow/${sowResponse.body.id}/validate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('complianceChecks');
    });
  });

  describe('Quote Management Endpoints', () => {
    test('POST /api/quotes/distribute', async () => {
      // First generate a SoW
      const sowResponse = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId
        });

      const response = await request(app)
        .post('/api/quotes/distribute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sowId: sowResponse.body.id,
          builderIds: ['builder1', 'builder2']
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Property Validation Endpoints', () => {
    test('POST /api/property/validate-address', async () => {
      const response = await request(app)
        .post('/api/property/validate-address')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: {
            line1: '10 Downing Street',
            city: 'London',
            postcode: 'SW1A 2AA',
            country: 'UK'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
    });
  });

  describe('Cost Estimation Endpoints', () => {
    test('POST /api/cost-estimation/estimate', async () => {
      const response = await request(app)
        .post('/api/cost-estimation/estimate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectType: 'loft_conversion',
          dimensions: {
            length: 6,
            width: 4,
            height: 2.5
          },
          materials: {
            flooring: 'engineered_wood',
            insulation: 'mineral_wool'
          },
          location: 'London'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalCost');
      expect(response.body).toHaveProperty('breakdown');
    });
  });

  describe('Compliance Endpoints', () => {
    test('POST /api/compliance/check', async () => {
      const response = await request(app)
        .post('/api/compliance/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectType: 'loft_conversion',
          specifications: {
            structuralWork: true,
            electricalWork: true,
            plumbingWork: false
          },
          location: {
            conservationArea: false,
            listedBuilding: false
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('complianceScore');
      expect(response.body).toHaveProperty('requirements');
    });
  });

  describe('Notification Endpoints', () => {
    test('GET /api/notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('PUT /api/notifications/:id/read', async () => {
      // First create a notification
      const notificationResponse = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'project_update',
          title: 'Test Notification',
          message: 'This is a test notification'
        });

      const response = await request(app)
        .put(`/api/notifications/${notificationResponse.body.id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});