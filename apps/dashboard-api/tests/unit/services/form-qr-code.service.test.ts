import { FormQrCodeService } from '../../../src/services/form-qr-code.service';
import { storageService } from '../../../src/services/storage.service';
import QRCode from 'qrcode';

// Mock external dependencies
jest.mock('../../../src/services/storage.service');
jest.mock('qrcode');

describe('FormQrCodeService', () => {
  let formQrCodeService: FormQrCodeService;
  let mockStorageService: jest.Mocked<typeof storageService>;
  const mockQRCode = QRCode as jest.Mocked<typeof QRCode>;

  beforeEach(() => {
    formQrCodeService = new FormQrCodeService();
    mockStorageService = storageService as jest.Mocked<typeof storageService>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('generateAndStoreQRCode', () => {
    const mockFormId = 'test-form-123';
    const mockRenderUrl = 'https://example.com/form/xyz';
    const mockQRCodeBuffer = Buffer.from('mock-qr-code-data');
    const mockStorageUrl =
      'https://cdn.example.com/form-qr-codes/form-qr-test-form-123-1234567890.png';

    beforeEach(() => {
      // Mock Date.now for consistent timestamps
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      // Mock QR code generation
      (mockQRCode.toBuffer as jest.Mock).mockResolvedValue(mockQRCodeBuffer);

      // Mock storage upload
      mockStorageService.uploadFile.mockResolvedValue(mockStorageUrl);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate QR code and store it successfully', async () => {
      const result = await formQrCodeService.generateAndStoreQRCode(
        mockFormId,
        mockRenderUrl
      );

      // Verify QR code generation
      expect(mockQRCode.toBuffer).toHaveBeenCalledWith(mockRenderUrl, {
        type: 'png',
        width: 192,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Verify storage upload
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        mockQRCodeBuffer,
        'form-qr-codes/form-qr-test-form-123-1234567890.png',
        'image/png',
        { generateUniqueFileName: false }
      );

      // Verify result
      expect(result).toBe(mockStorageUrl);
    });

    it('should handle QR code generation errors', async () => {
      const mockError = new Error('QR code generation failed');
      (mockQRCode.toBuffer as jest.Mock).mockRejectedValue(mockError);

      await expect(
        formQrCodeService.generateAndStoreQRCode(mockFormId, mockRenderUrl)
      ).rejects.toThrow('Failed to generate and store form QR code');

      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should handle storage upload errors', async () => {
      (mockQRCode.toBuffer as jest.Mock).mockResolvedValue(mockQRCodeBuffer);
      const mockError = new Error('Storage upload failed');
      mockStorageService.uploadFile.mockRejectedValue(mockError);

      await expect(
        formQrCodeService.generateAndStoreQRCode(mockFormId, mockRenderUrl)
      ).rejects.toThrow('Failed to generate and store form QR code');
    });

    it('should generate unique file names for different forms', async () => {
      const anotherFormId = 'another-form-456';

      await formQrCodeService.generateAndStoreQRCode(mockFormId, mockRenderUrl);
      await formQrCodeService.generateAndStoreQRCode(
        anotherFormId,
        mockRenderUrl
      );

      expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockStorageService.uploadFile).toHaveBeenNthCalledWith(
        1,
        mockQRCodeBuffer,
        'form-qr-codes/form-qr-test-form-123-1234567890.png',
        'image/png',
        { generateUniqueFileName: false }
      );
      expect(mockStorageService.uploadFile).toHaveBeenNthCalledWith(
        2,
        mockQRCodeBuffer,
        'form-qr-codes/form-qr-another-form-456-1234567890.png',
        'image/png',
        { generateUniqueFileName: false }
      );
    });

    it('should handle empty or invalid URLs', async () => {
      await expect(
        formQrCodeService.generateAndStoreQRCode(mockFormId, '')
      ).rejects.toThrow('Failed to generate and store form QR code');

      await expect(
        formQrCodeService.generateAndStoreQRCode(mockFormId, '   ')
      ).rejects.toThrow('Failed to generate and store form QR code');
    });
  });

  describe('generateQRCodeBuffer', () => {
    const mockRenderUrl = 'https://example.com/form/xyz';
    const mockQRCodeBuffer = Buffer.from('mock-qr-code-data');

    beforeEach(() => {
      (mockQRCode.toBuffer as jest.Mock).mockResolvedValue(mockQRCodeBuffer);
    });

    it('should generate QR code buffer with correct options', async () => {
      const result =
        await formQrCodeService['generateQRCodeBuffer'](mockRenderUrl);

      expect(mockQRCode.toBuffer).toHaveBeenCalledWith(mockRenderUrl, {
        type: 'png',
        width: 192,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      expect(result).toBe(mockQRCodeBuffer);
    });

    it('should handle QR code generation failures', async () => {
      const mockError = new Error('QR generation failed');
      (mockQRCode.toBuffer as jest.Mock).mockRejectedValue(mockError);

      await expect(
        formQrCodeService['generateQRCodeBuffer'](mockRenderUrl)
      ).rejects.toThrow('Failed to generate QR code buffer');
    });
  });

  describe('deleteQRCode', () => {
    const mockQrCodeUrl =
      'https://cdn.example.com/form-qr-codes/form-qr-test-123.png';

    beforeEach(() => {
      mockStorageService.deleteFile.mockResolvedValue();
    });

    it('should delete QR code from storage', async () => {
      await formQrCodeService.deleteQRCode(mockQrCodeUrl);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        'form-qr-codes/form-qr-test-123.png'
      );
    });

    it('should handle deletion errors gracefully', async () => {
      const mockError = new Error('File not found');
      mockStorageService.deleteFile.mockRejectedValue(mockError);

      // Should not throw - deletion errors are logged but not re-thrown
      await expect(
        formQrCodeService.deleteQRCode(mockQrCodeUrl)
      ).resolves.toBeUndefined();
    });

    it('should handle empty QR code URL', async () => {
      await formQrCodeService.deleteQRCode('');
      await formQrCodeService.deleteQRCode('   ');

      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
    });
  });
});
