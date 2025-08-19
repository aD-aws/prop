import request from 'supertest';
import { app } from '../../app';
import { AuthService } from '../../services/AuthService';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Security Tests', () => {
  let validAuthToken: string;
  let testUserId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = {
      email: 'security@example.com',
      password: 'SecurePassword123!',
      userType: 'homeowner' as const,
      profile: {
        firstName: 'Security',
        lastName: 'Test'
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

    validAuthToken = loginResponse.body.token;

    // Create test project
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${validAuthToken}`)
      .send({
        propertyAddress: {
          line1: '123 Security Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'UK'
        },
        projectType: 'loft_conversion',
        requirements: {
          description: 'Security test project',
          dimensions: { length: 5, width: 4, height: 2.5 },
          materials: { flooring: 'wood' },
          timeline: { startDate: '2024-04-01', endDate: '2024-06-01' },
          budget: { min: 10000, max: 20000 },
          specialRequirements: []
        }
      });

    testProjectId = projectResponse.body.id;
  });

  describe('Authentication Security', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject requests with invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject requests with expired authentication token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, userType: 'homeowner' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject requests with malformed authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'abc123',
        'Password', // No special characters
        'password123', // No uppercase
        'PASSWORD123!', // No lowercase
        'Pass1!' // Too short
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak${Date.now()}@example.com`,
            password,
            userType: 'homeowner',
            profile: {
              firstName: 'Weak',
              lastName: 'Password'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
      expect(await bcrypt.compare('wrong-password', hashedPassword)).toBe(false);
    });

    test('should prevent brute force attacks', async () => {
      const attempts = [];
      
      // Attempt multiple failed logins
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'security@example.com',
              password: 'WrongPassword123!'
            })
        );
      }

      const responses = await Promise.all(attempts);
      
      // Should start rate limiting after several attempts
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Authorization Security', () => {
    test('should prevent access to other users\' data', async () => {
      // Create another user
      const otherUser = {
        email: 'other@example.com',
        password: 'OtherPassword123!',
        userType: 'homeowner' as const,
        profile: {
          firstName: 'Other',
          lastName: 'User'
        }
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);

      const otherUserId = registerResponse.body.user.id;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: otherUser.email,
          password: otherUser.password
        });

      const otherUserToken = loginResponse.body.token;

      // Try to access first user's project with second user's token
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should enforce role-based access control', async () => {
      // Create builder user
      const builderUser = {
        email: 'builder@example.com',
        password: 'BuilderPassword123!',
        userType: 'builder' as const,
        profile: {
          firstName: 'Builder',
          lastName: 'User',
          companyName: 'Test Builders Ltd'
        }
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(builderUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: builderUser.email,
          password: builderUser.password
        });

      const builderToken = loginResponse.body.token;

      // Builder should not be able to create projects
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          propertyAddress: {
            line1: '456 Builder Test Street',
            city: 'Manchester',
            postcode: 'M1 1AA',
            country: 'UK'
          },
          projectType: 'extension',
          requirements: {
            description: 'Unauthorized project creation',
            dimensions: { length: 4, width: 3, height: 3 },
            materials: { walls: 'brick' },
            timeline: { startDate: '2024-05-01', endDate: '2024-07-01' },
            budget: { min: 15000, max: 25000 },
            specialRequirements: []
          }
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should validate JWT token integrity', async () => {
      // Tamper with token payload
      const tokenParts = validAuthToken.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({
        userId: 'malicious-user-id',
        userType: 'admin'
      })).toString('base64url');
      
      const tamperedToken = `${tokenParts[0]}.${tamperedPayload}.${tokenParts[2]}`;

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "' UNION SELECT * FROM users --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: maliciousInput,
            password: 'password'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')" />',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send({
            profile: {
              firstName: payload,
              lastName: 'Test'
            }
          });

        // Should either reject the input or sanitize it
        if (response.status === 200) {
          expect(response.body.profile.firstName).not.toContain('<script>');
          expect(response.body.profile.firstName).not.toContain('javascript:');
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    test('should validate file upload security', async () => {
      // Test malicious file upload
      const maliciousFile = Buffer.from('<?php system($_GET["cmd"]); ?>');

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/documents`)
        .set('Authorization', `Bearer ${validAuthToken}`)
        .attach('file', maliciousFile, 'malicious.php')
        .field('documentType', 'structural_drawing');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should enforce file size limits', async () => {
      // Create oversized file (assuming 10MB limit)
      const oversizedFile = Buffer.alloc(11 * 1024 * 1024, 'a');

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/documents`)
        .set('Authorization', `Bearer ${validAuthToken}`)
        .attach('file', oversizedFile, 'oversized.pdf')
        .field('documentType', 'structural_drawing');

      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Data Encryption Security', () => {
    test('should encrypt sensitive data in transit', async () => {
      // This would typically be tested with HTTPS in production
      // For now, we test that sensitive data is not exposed in logs
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(200);
      // Password should not be in response
      expect(JSON.stringify(response.body)).not.toContain('SecurePassword123!');
    });

    test('should not expose sensitive data in API responses', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    test('should validate HTTPS headers in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validAuthToken}`);

      // Should have security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Session Security', () => {
    test('should invalidate tokens on logout', async () => {
      // Login to get a token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@example.com',
          password: 'SecurePassword123!'
        });

      const token = loginResponse.body.token;

      // Verify token works
      const profileResponse1 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse1.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Token should no longer work
      const profileResponse2 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse2.status).toBe(401);
    });

    test('should handle concurrent sessions securely', async () => {
      // Login multiple times
      const loginPromises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@example.com',
            password: 'SecurePassword123!'
          })
      );

      const responses = await Promise.all(loginPromises);
      const tokens = responses.map(r => r.body.token);

      // All tokens should be valid
      for (const token of tokens) {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
      }

      // Logout one session
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens[0]}`);

      // First token should be invalid, others should still work
      const response1 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokens[0]}`);

      expect(response1.status).toBe(401);

      const response2 = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tokens[1]}`);

      expect(response2.status).toBe(200);
    });
  });

  describe('API Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validAuthToken}`);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });

    test('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .options('/api/users/profile')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/projects/nonexistent-id')
        .set('Authorization', `Bearer ${validAuthToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      
      // Should not expose database details or internal paths
      expect(response.body.error.message).not.toContain('ENOENT');
      expect(response.body.error.message).not.toContain('/src/');
      expect(response.body.error.message).not.toContain('DynamoDB');
    });

    test('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});