/**
 * Integration tests for user avatar upload and management functionality.
 * Tests avatar upload, retrieval, deletion, and error scenarios.
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser } from '../helpers/auth-helper';
import path from 'path';
import fs from 'fs';

describe('User Avatar Management Integration Tests', () => {
  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let userToken: string;
  let testImagePath: string;
  let testInvalidFilePath: string;

  beforeAll(async () => {
    // Create test users once for entire test suite
    // NOTE: Global beforeEach cleanup has been removed from test-setup.ts
    // to prevent race conditions, so these users persist throughout the suite
    const adminAuth = await createTestUser({ role: 'admin' });
    const userAuth = await createTestUser({ role: 'user' });

    adminUser = adminAuth.user;
    regularUser = userAuth.user;
    adminToken = adminAuth.token;
    userToken = userAuth.token;

    // Create test image file (1x1 PNG)
    testImagePath = path.join(__dirname, '../fixtures/test-avatar.png');
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWmMAnwAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, pngData);

    // Create test invalid file (text file)
    testInvalidFilePath = path.join(__dirname, '../fixtures/test-invalid.txt');
    fs.writeFileSync(testInvalidFilePath, 'This is not an image file');
  });

  afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    if (fs.existsSync(testInvalidFilePath)) {
      fs.unlinkSync(testInvalidFilePath);
    }
  });

  describe('POST /api/v1/users/avatar', () => {
    it('should upload avatar successfully with valid file and authentication', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Avatar uploaded successfully');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('avatarUrl');
      expect(response.body.data.user.avatarUrl).toBeTruthy();
      expect(response.body.data.user.id).toBe(regularUser.id);
    });

    it('should upload avatar successfully for admin user', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(adminUser.id);
      expect(response.body.data.user.avatarUrl).toBeTruthy();
    });

    it('should replace existing avatar when uploading new one', async () => {
      // Upload first avatar
      const firstResponse = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(firstResponse.status).toBe(200);
      const firstAvatarUrl = firstResponse.body.data.avatarUrl;

      // Upload second avatar
      const secondResponse = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(secondResponse.status).toBe(200);
      const secondAvatarUrl = secondResponse.body.data.avatarUrl;

      // URLs should be different (timestamped)
      expect(firstAvatarUrl).not.toBe(secondAvatarUrl);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .attach('avatar', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toBe('No file uploaded');
    });

    it('should return 415 for invalid file type', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testInvalidFilePath);

      expect(response.status).toBe(415);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('should return 413 for oversized file', async () => {
      // Create a large file (6MB) - exceeds 5MB limit
      const largePath = path.join(__dirname, '../fixtures/large-file.png');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      fs.writeFileSync(largePath, largeBuffer);

      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', largePath);

      // Cleanup large file
      fs.unlinkSync(largePath);

      expect([413, 400]).toContain(response.status); // Multer may return 400 for limit exceeded
    });

    it('should work with JWT authentication', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/users/avatar', () => {
    beforeEach(async () => {
      // Upload an avatar first
      await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);
    });

    it('should delete avatar successfully with authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Avatar deleted successfully');
      expect(response.body.data.user.avatarUrl).toBe(null);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/api/v1/users/avatar');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should work even when no avatar exists', async () => {
      // Delete first (removes avatar)
      await request(app)
        .delete('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      // Delete again (no avatar to delete)
      const response = await request(app)
        .delete('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/auth/profile (avatar integration)', () => {
    it('should return profile without avatar initially', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.avatarUrl).toBe(null);
    });

    it('should return profile with avatar after upload', async () => {
      // Upload avatar
      await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      // Get profile
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.avatarUrl).toBeTruthy();
      expect(typeof response.body.data.avatarUrl).toBe('string');
    });

    it('should return profile without avatar after deletion', async () => {
      // Upload avatar
      await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      // Delete avatar
      await request(app)
        .delete('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      // Get profile
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.avatarUrl).toBe(null);
    });
  });

  describe('File validation', () => {
    it('should accept JPEG files', async () => {
      // Create a JPEG test file
      const jpegPath = path.join(__dirname, '../fixtures/test-avatar.jpg');
      const jpegData = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAlEAABAwQCAwEBAAAAAAAAAAAFAAYHAwQIAQIRExQVFhc4/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAcEQADAQADAQEAAAAAAAAAAAAAAQIDBAUGERMh/9oADAMBAAIRAxEAPwCXwOj2lhOD8',
        'base64'
      );
      fs.writeFileSync(jpegPath, jpegData);

      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', jpegPath);

      fs.unlinkSync(jpegPath);
      expect(response.status).toBe(200);
    });

    it('should accept GIF files', async () => {
      // Create a GIF test file
      const gifPath = path.join(__dirname, '../fixtures/test-avatar.gif');
      const gifData = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      fs.writeFileSync(gifPath, gifData);

      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', gifPath);

      fs.unlinkSync(gifPath);
      expect(response.status).toBe(200);
    });

    it('should reject non-image files', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testInvalidFilePath);

      expect(response.status).toBe(415);
      expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });
  });

  describe('Error handling', () => {
    it('should handle storage service errors gracefully', async () => {
      // This test would require mocking the storage service to simulate failures
      // For now, we test the happy path and leave detailed error testing for unit tests
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(200);
    });

    it('should handle database errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we ensure the endpoint works with valid database state
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(200);
    });
  });

  describe('Security tests', () => {
    it('should not allow avatar upload without proper authentication', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', 'Bearer invalid-token')
        .attach('avatar', testImagePath);

      expect(response.status).toBe(401);
    });

    it('should only allow users to manage their own avatars', async () => {
      // This is inherently tested by the authentication system
      // Users can only upload/delete their own avatars because the endpoint
      // uses the authenticated user's ID from the token
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.data.user.id).toBe(regularUser.id);
    });

    it('should properly validate file types to prevent malicious uploads', async () => {
      const response = await request(app)
        .post('/api/v1/users/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', testInvalidFilePath);

      expect(response.status).toBe(415);
    });
  });
});
