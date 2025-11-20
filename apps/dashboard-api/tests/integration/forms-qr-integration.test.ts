import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';
import { formsRepository } from '../../src/repositories/forms.repository';
import { formSchemasRepository } from '../../src/repositories/form-schemas.repository';
import { shortLinksRepository } from '../../src/repositories/short-links.repository';
import { usersRepository } from '../../src/repositories/users.repository';
import { FormQrCodeService } from '../../src/services/form-qr-code.service';
import { FormStatus } from '@nodeangularfullstack/shared';
import jwt from 'jsonwebtoken';

// Mock external services
jest.mock('../../src/services/form-qr-code.service');

describe('Forms Controller - QR Code Integration', () => {
  let authToken: string;
  let userId: string;
  let formId: string;
  let mockFormQrCodeService: jest.Mocked<FormQrCodeService>;

  const mockQrCodeUrl =
    'https://cdn.example.com/form-qr-codes/form-qr-test.png';

  beforeAll(async () => {
    // Database connection handled by app startup

    // Mock FormQrCodeService
    mockFormQrCodeService = {
      generateAndStoreQRCode: jest.fn(),
      deleteQRCode: jest.fn(),
    } as jest.Mocked<FormQrCodeService>;
  });

  afterAll(async () => {
    await databaseService.close();
  });

  beforeEach(async () => {
    // Create test user
    const testUser = await usersRepository.create({
      email: 'qr-test@example.com',
      firstName: 'QR',
      lastName: 'Test',
      passwordHash: 'hashed-password',
      role: 'user',
    });
    userId = testUser.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test form
    const testForm = await formsRepository.create({
      userId,
      tenantId: undefined,
      title: 'QR Test Form',
      description: 'Form for QR code testing',
      status: FormStatus.DRAFT,
    });
    formId = testForm.id;

    // Create form schema
    await formSchemasRepository.createSchema(formId, {
      version: 1,
      fields: [
        {
          id: 'field-1',
          type: 'text',
          fieldName: 'name',
          label: 'Full Name',
          required: true,
          position: { rowId: 0, columnIndex: 0, orderInColumn: 0 },
        },
      ],
      settings: {},
      isPublished: false,
    });

    // Setup QR code service mocks
    mockFormQrCodeService.generateAndStoreQRCode.mockResolvedValue(
      mockQrCodeUrl
    );
    mockFormQrCodeService.deleteQRCode.mockResolvedValue();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await formsRepository.delete(formId);
      await usersRepository.delete(userId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/forms/:id/publish - QR Code Generation', () => {
    it('should publish form and generate QR code successfully', async () => {
      const response = await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          qrCodeUrl: mockQrCodeUrl,
          qrCodeGenerated: true,
          renderUrl: expect.stringContaining('/public/form/'),
        })
      );

      // Verify QR code generation was called
      expect(mockFormQrCodeService.generateAndStoreQRCode).toHaveBeenCalledWith(
        formId,
        expect.stringContaining('/public/form/')
      );

      // Verify form was updated in database
      const updatedForm = await formsRepository.findFormById(formId);
      expect(updatedForm?.qrCodeUrl).toBe(mockQrCodeUrl);
      expect(updatedForm?.status).toBe(FormStatus.PUBLISHED);
    });

    it('should publish form successfully even if QR generation fails', async () => {
      mockFormQrCodeService.generateAndStoreQRCode.mockRejectedValue(
        new Error('QR generation failed')
      );

      const response = await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          qrCodeGenerated: false,
          renderUrl: expect.stringContaining('/public/form/'),
        })
      );

      // Verify form was still published
      const updatedForm = await formsRepository.findFormById(formId);
      expect(updatedForm?.status).toBe(FormStatus.PUBLISHED);
      expect(updatedForm?.qrCodeUrl).toBeNull();
    });

    it('should publish form without expiration and generate QR code', async () => {
      const response = await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // No expiration
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCodeGenerated).toBe(true);

      // Verify QR code generation was triggered
      expect(mockFormQrCodeService.generateAndStoreQRCode).toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      await request(app)
        .post(`/api/forms/${formId}/publish`)
        .send({ expiresInDays: 30 })
        .expect(401);

      // Verify QR generation was not triggered
      expect(
        mockFormQrCodeService.generateAndStoreQRCode
      ).not.toHaveBeenCalled();
    });

    it('should handle form not found errors', async () => {
      const nonExistentFormId = 'non-existent-form';

      await request(app)
        .post(`/api/forms/${nonExistentFormId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 })
        .expect(404);

      expect(
        mockFormQrCodeService.generateAndStoreQRCode
      ).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/forms/:id/unpublish - QR Code Cleanup', () => {
    beforeEach(async () => {
      // First publish the form to have QR code
      await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 });
    });

    it('should unpublish form and clean up QR code', async () => {
      const response = await request(app)
        .post(`/api/forms/${formId}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify QR cleanup was triggered
      expect(mockFormQrCodeService.deleteQRCode).toHaveBeenCalledWith(
        mockQrCodeUrl
      );

      // Verify form was updated in database
      const updatedForm = await formsRepository.findFormById(formId);
      expect(updatedForm?.status).toBe(FormStatus.DRAFT);
      expect(updatedForm?.qrCodeUrl).toBeNull();
    });

    it('should unpublish form even if QR cleanup fails', async () => {
      mockFormQrCodeService.deleteQRCode.mockRejectedValue(
        new Error('Cleanup failed')
      );

      const response = await request(app)
        .post(`/api/forms/${formId}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify form was still unpublished
      const updatedForm = await formsRepository.findFormById(formId);
      expect(updatedForm?.status).toBe(FormStatus.DRAFT);
    });

    it('should handle unpublishing already draft form', async () => {
      // First unpublish the form
      await request(app)
        .post(`/api/forms/${formId}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Try to unpublish again
      await request(app)
        .post(`/api/forms/${formId}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400); // Should return error for already draft form
    });
  });

  describe('QR Code URL in Form Responses', () => {
    it('should include QR code URL in form details after publishing', async () => {
      // Publish form first
      await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 });

      // Get form details
      const response = await request(app)
        .get(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.qrCodeUrl).toBe(mockQrCodeUrl);
    });

    it('should show null QR code URL for draft forms', async () => {
      const response = await request(app)
        .get(`/api/forms/${formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.qrCodeUrl).toBeNull();
    });

    it('should include QR code URL in forms list', async () => {
      // Publish form first
      await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 });

      // Get forms list
      const response = await request(app)
        .get('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const publishedForm = response.body.data.find(
        (form: any) => form.id === formId
      );
      expect(publishedForm.qrCodeUrl).toBe(mockQrCodeUrl);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid form ID format', async () => {
      await request(app)
        .post('/api/forms/invalid-uuid/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 })
        .expect(400);

      expect(
        mockFormQrCodeService.generateAndStoreQRCode
      ).not.toHaveBeenCalled();
    });

    it('should handle invalid expiration days', async () => {
      await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 500 }) // Invalid: too many days
        .expect(400);

      expect(
        mockFormQrCodeService.generateAndStoreQRCode
      ).not.toHaveBeenCalled();
    });

    it('should handle database transaction failures during publish', async () => {
      // Mock database error
      jest
        .spyOn(formsRepository, 'update')
        .mockRejectedValueOnce(new Error('DB Error'));

      await request(app)
        .post(`/api/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expiresInDays: 30 })
        .expect(500);

      // QR generation should not be triggered if transaction fails
      expect(
        mockFormQrCodeService.generateAndStoreQRCode
      ).not.toHaveBeenCalled();
    });
  });
});
