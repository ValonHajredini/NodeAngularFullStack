import QRCode from 'qrcode';
import { storageService } from './storage.service';

/**
 * Form QR code service for generating and managing QR codes for published forms.
 * Story 26.3: Integrated QR Code Generation and Display
 *
 * Leverages existing QR code infrastructure from short-links service
 * but specializes in form-specific QR code generation and storage.
 */
export class FormQrCodeService {
  private static readonly QR_CODE_FOLDER = 'form-qr-codes';
  private static readonly QR_CODE_WIDTH = 192; // Consistent with short-links service
  private static readonly QR_CODE_MARGIN = 2;

  /**
   * Generates QR code for a form's public URL and stores it in DigitalOcean Spaces.
   * @param formId - Form ID for file naming
   * @param renderUrl - Public form URL to encode in QR code
   * @returns Promise containing QR code storage URL
   * @throws {Error} When QR code generation or storage fails
   * @example
   * const qrUrl = await formQrCodeService.generateAndStoreQRCode(
   *   'form-uuid',
   *   'https://app.com/public/form/abc123'
   * );
   */
  async generateAndStoreQRCode(
    formId: string,
    renderUrl: string
  ): Promise<string> {
    try {
      // Validate URL before proceeding
      if (!renderUrl || renderUrl.trim() === '') {
        throw new Error('Invalid render URL provided');
      }

      // Generate QR code as PNG buffer with consistent styling
      const qrCodeBuffer = await this.generateQRCodeBuffer(renderUrl);

      // Generate file name with timestamp for uniqueness
      const timestamp = Date.now();
      const fileName = `${FormQrCodeService.QR_CODE_FOLDER}/form-qr-${formId}-${timestamp}.png`;

      // Upload to DigitalOcean Spaces storage
      const qrCodeUrl = await storageService.uploadFile(
        qrCodeBuffer,
        fileName,
        'image/png',
        { generateUniqueFileName: false }
      );

      return qrCodeUrl;
    } catch (error) {
      console.error('Error generating and storing form QR code:', error);
      throw new Error('Failed to generate and store form QR code');
    }
  }

  /**
   * Generates QR code as PNG buffer for the given URL.
   * @param url - URL to encode in QR code
   * @returns Promise containing QR code as PNG Buffer
   * @private
   */
  private async generateQRCodeBuffer(url: string): Promise<Buffer> {
    try {
      const qrCodeBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: FormQrCodeService.QR_CODE_WIDTH,
        margin: FormQrCodeService.QR_CODE_MARGIN,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeBuffer;
    } catch (error) {
      console.error('Error generating QR code buffer:', error);
      throw new Error('Failed to generate QR code buffer');
    }
  }

  /**
   * Deletes QR code file from storage when form is deleted or unpublished.
   * @param qrCodeUrl - Full storage URL of QR code to delete
   * @returns Promise resolving when deletion completes
   * @throws {Error} When deletion fails
   * @example
   * await formQrCodeService.deleteQRCode('https://storage.url/form-qr-123.png');
   */
  async deleteQRCode(qrCodeUrl: string): Promise<void> {
    try {
      // Skip deletion if URL is empty or whitespace
      if (!qrCodeUrl || qrCodeUrl.trim() === '') {
        return;
      }

      // Extract file path from full URL
      const url = new URL(qrCodeUrl);
      const filePath = url.pathname.replace(/^\//, ''); // Remove leading slash

      await storageService.deleteFile(filePath);
      console.log(`✅ Deleted form QR code: ${filePath}`);
    } catch (error) {
      // Log but don't fail the operation if QR code deletion fails
      console.error(`⚠️ Failed to delete form QR code from storage:`, error);
    }
  }

  /**
   * Validates QR code URL format and checks if it belongs to form QR codes.
   * @param qrCodeUrl - QR code URL to validate
   * @returns boolean indicating if URL is a valid form QR code URL
   */
  isValidFormQRCodeUrl(qrCodeUrl: string): boolean {
    try {
      const url = new URL(qrCodeUrl);
      const filePath = url.pathname;
      return (
        filePath.includes(FormQrCodeService.QR_CODE_FOLDER) &&
        filePath.includes('form-qr-') &&
        filePath.endsWith('.png')
      );
    } catch {
      return false;
    }
  }

  /**
   * Performs cleanup of orphaned QR code files.
   * This can be called by maintenance tasks to clean up QR codes
   * for forms that no longer exist.
   * @param existingFormIds - Array of form IDs that still exist
   * @returns Promise containing number of cleaned up files
   */
  async cleanupOrphanedQRCodes(_existingFormIds: string[]): Promise<number> {
    // Implementation would require listing files in storage
    // and comparing with existing form IDs
    // For now, return 0 as this is an advanced feature
    console.log('QR code cleanup not yet implemented');
    return 0;
  }
}

// Export singleton instance
export const formQrCodeService = new FormQrCodeService();
