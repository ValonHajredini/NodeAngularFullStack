import { formsService } from '../../../src/services/forms.service';
import { FormQrCodeService } from '../../../src/services/form-qr-code.service';
import { formsRepository } from '../../../src/repositories/forms.repository';
import { formSchemasRepository } from '../../../src/repositories/form-schemas.repository';
import { shortLinksRepository } from '../../../src/repositories/short-links.repository';
import {
  FormStatus,
  FormMetadata,
  FormSchema,
} from '@nodeangularfullstack/shared';

// Mock dependencies
jest.mock('../../../src/services/form-qr-code.service');
jest.mock('../../../src/repositories/forms.repository');
jest.mock('../../../src/repositories/form-schemas.repository');
jest.mock('../../../src/repositories/short-links.repository');

describe('Forms Service - QR Code Integration', () => {
  let mockFormQrCodeService: jest.Mocked<FormQrCodeService>;
  let mockFormsRepository: jest.Mocked<typeof formsRepository>;
  let mockFormSchemasRepository: jest.Mocked<typeof formSchemasRepository>;
  let mockShortLinksRepository: jest.Mocked<typeof shortLinksRepository>;

  const mockUserId = 'user-123';
  const mockFormId = 'form-456';
  const mockExpirationDate = new Date('2025-12-31');
  const mockRenderUrl = 'https://example.com/public/form/abc123';
  const mockQrCodeUrl = 'https://cdn.example.com/form-qr-codes/form-qr-456.png';

  const mockForm: FormMetadata = {
    id: mockFormId,
    userId: mockUserId,
    tenantId: undefined,
    title: 'Test Form',
    description: 'Test Description',
    status: FormStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
    qrCodeUrl: undefined,
  };

  const mockFormSchema: FormSchema = {
    id: 'schema-789',
    formId: mockFormId,
    version: 1,
    fields: [],
    settings: {
      layout: 'default',
      submission: {
        allowMultiple: false,
        requireAuth: false,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: mockExpirationDate,
  };

  beforeEach(() => {
    // Create fresh mocks
    mockFormQrCodeService =
      new FormQrCodeService() as jest.Mocked<FormQrCodeService>;
    mockFormsRepository = formsRepository as jest.Mocked<
      typeof formsRepository
    >;
    mockFormSchemasRepository = formSchemasRepository as jest.Mocked<
      typeof formSchemasRepository
    >;
    mockShortLinksRepository = shortLinksRepository as jest.Mocked<
      typeof shortLinksRepository
    >;

    // Mock FormQrCodeService constructor
    (FormQrCodeService as jest.Mock).mockImplementation(
      () => mockFormQrCodeService
    );

    // Reset all mocks
    jest.clearAllMocks();

    // Setup common mocks
    mockFormsRepository.findFormById.mockResolvedValue(mockForm);
    mockFormSchemasRepository.findActiveByFormId.mockResolvedValue(
      mockFormSchema
    );
    mockShortLinksRepository.create.mockResolvedValue({
      id: 'link-123',
      shortCode: 'abc123',
      originalUrl: mockRenderUrl,
      formSchemaId: mockFormSchema.id,
      isActive: true,
      expiresAt: mockExpirationDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('publishForm with QR code generation', () => {
    beforeEach(() => {
      mockFormQrCodeService.generateAndStoreQRCode.mockResolvedValue(
        mockQrCodeUrl
      );
      mockFormsRepository.update.mockResolvedValue({
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: mockQrCodeUrl,
      });
    });

    it('should publish form and generate QR code successfully', async () => {
      const result = await formsService.publishForm(
        mockFormId,
        mockUserId,
        mockExpirationDate
      );

      // Verify QR code generation was triggered
      expect(mockFormQrCodeService.generateAndStoreQRCode).toHaveBeenCalledWith(
        mockFormId,
        mockRenderUrl
      );

      // Verify form was updated with QR code URL
      expect(mockFormsRepository.update).toHaveBeenCalledWith(
        mockFormId,
        expect.objectContaining({
          qrCodeUrl: mockQrCodeUrl,
        })
      );

      // Verify response includes QR code information
      expect(result).toEqual(
        expect.objectContaining({
          qrCodeUrl: mockQrCodeUrl,
          qrCodeGenerated: true,
        })
      );
    });

    it('should publish form successfully even if QR code generation fails', async () => {
      mockFormQrCodeService.generateAndStoreQRCode.mockRejectedValue(
        new Error('QR generation failed')
      );

      mockFormsRepository.update.mockResolvedValue({
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: undefined,
      });

      const result = await formsService.publishForm(
        mockFormId,
        mockUserId,
        mockExpirationDate
      );

      // Verify form was still updated (non-blocking QR generation)
      expect(mockFormsRepository.update).toHaveBeenCalledWith(
        mockFormId,
        expect.objectContaining({
          qrCodeUrl: undefined,
        })
      );

      // Verify response indicates QR generation failed
      expect(result).toEqual(
        expect.objectContaining({
          qrCodeUrl: undefined,
          qrCodeGenerated: false,
        })
      );
    });

    it('should handle QR code generation timeout gracefully', async () => {
      // Simulate slow QR generation
      mockFormQrCodeService.generateAndStoreQRCode.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockQrCodeUrl), 10000)
          )
      );

      mockFormsRepository.update.mockResolvedValue({
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: undefined,
      });

      const result = await formsService.publishForm(
        mockFormId,
        mockUserId,
        mockExpirationDate
      );

      // Should not wait for QR generation (async operation)
      expect(result.qrCodeGenerated).toBe(false);
      expect(result.qrCodeUrl).toBeUndefined();
    });

    it('should not generate QR code if form publish fails', async () => {
      mockShortLinksRepository.create.mockRejectedValue(
        new Error('Short link creation failed')
      );

      await expect(
        formsService.publishForm(mockFormId, mockUserId, mockExpirationDate)
      ).rejects.toThrow('Short link creation failed');

      // QR code generation should not be triggered if publish fails
      expect(
        mockFormQrCodeService.generateAndStoreQRCode
      ).not.toHaveBeenCalled();
    });
  });

  describe('unpublishForm with QR code cleanup', () => {
    const publishedFormWithQR: FormMetadata = {
      ...mockForm,
      status: FormStatus.PUBLISHED,
      qrCodeUrl: mockQrCodeUrl,
    };

    beforeEach(() => {
      mockFormsRepository.findFormById.mockResolvedValue(publishedFormWithQR);
      mockFormQrCodeService.deleteQRCode.mockResolvedValue();
      mockShortLinksRepository.deactivateByFormId = jest
        .fn()
        .mockResolvedValue();
      mockFormsRepository.update.mockResolvedValue({
        ...publishedFormWithQR,
        status: FormStatus.DRAFT,
        qrCodeUrl: undefined,
      });
    });

    it('should unpublish form and clean up QR code', async () => {
      const result = await formsService.unpublishForm(mockFormId, mockUserId);

      // Verify QR code cleanup was triggered
      expect(mockFormQrCodeService.deleteQRCode).toHaveBeenCalledWith(
        mockQrCodeUrl
      );

      // Verify form was updated with null QR code URL
      expect(mockFormsRepository.update).toHaveBeenCalledWith(
        mockFormId,
        expect.objectContaining({
          status: FormStatus.DRAFT,
          qrCodeUrl: undefined,
        })
      );

      expect(result.qrCodeUrl).toBeNull();
    });

    it('should unpublish form even if QR code cleanup fails', async () => {
      mockFormQrCodeService.deleteQRCode.mockRejectedValue(
        new Error('Cleanup failed')
      );

      const result = await formsService.unpublishForm(mockFormId, mockUserId);

      // Should still update form status despite cleanup failure
      expect(mockFormsRepository.update).toHaveBeenCalledWith(
        mockFormId,
        expect.objectContaining({
          status: FormStatus.DRAFT,
          qrCodeUrl: undefined,
        })
      );

      expect(result.status).toBe(FormStatus.DRAFT);
    });

    it('should handle unpublishing form without QR code', async () => {
      const formWithoutQR = {
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: null,
      };
      mockFormsRepository.findFormById.mockResolvedValue(formWithoutQR);

      const result = await formsService.unpublishForm(mockFormId, mockUserId);

      // Should not attempt QR cleanup for form without QR code
      expect(mockFormQrCodeService.deleteQRCode).not.toHaveBeenCalled();

      expect(result.status).toBe(FormStatus.DRAFT);
    });
  });

  describe('QR code URL validation', () => {
    it('should handle invalid QR code URLs during cleanup', async () => {
      const formWithInvalidQR = {
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: '   ', // Invalid URL
      };

      mockFormsRepository.findFormById.mockResolvedValue(formWithInvalidQR);
      mockFormsRepository.update.mockResolvedValue({
        ...formWithInvalidQR,
        status: FormStatus.DRAFT,
        qrCodeUrl: undefined,
      });

      await formsService.unpublishForm(mockFormId, mockUserId);

      // Should not attempt cleanup for invalid URL
      expect(mockFormQrCodeService.deleteQRCode).not.toHaveBeenCalled();
    });
  });

  describe('concurrent publish operations', () => {
    it('should handle multiple concurrent publish requests', async () => {
      mockFormQrCodeService.generateAndStoreQRCode.mockResolvedValue(
        mockQrCodeUrl
      );

      const promises = [
        formsService.publishForm(mockFormId, mockUserId, mockExpirationDate),
        formsService.publishForm(mockFormId, mockUserId, mockExpirationDate),
      ];

      // Should handle concurrent requests without conflicts
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});
