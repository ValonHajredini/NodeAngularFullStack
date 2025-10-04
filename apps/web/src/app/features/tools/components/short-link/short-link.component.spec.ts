import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ShortLinkComponent } from './short-link.component';
import { ShortLinkService } from '../../services/short-link.service';
import { MessageService } from 'primeng/api';

// PrimeNG components are mocked by Karma configuration

/**
 * Unit tests for ShortLinkComponent
 * Tests component functionality, form validation, and user interactions
 */
describe('ShortLinkComponent', () => {
  let component: ShortLinkComponent;
  let fixture: ComponentFixture<ShortLinkComponent>;
  let mockShortLinkService: jasmine.SpyObj<ShortLinkService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockShortLink = {
    id: 'test-id',
    code: 'abc123',
    originalUrl: 'https://example.com',
    expiresAt: null,
    createdBy: 'user-id',
    clickCount: 0,
    lastAccessedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    // Create mocks
    mockShortLinkService = jasmine.createSpyObj(
      'ShortLinkService',
      [
        'createShortLink',
        'clearError',
        'copyToClipboard',
        'refreshRecentLinks',
        'generateShortUrl',
      ],
      {
        loading: signal(false),
        error: signal(null),
        recentLinks: signal([]),
        isToolEnabled: signal(true),
      },
    );

    mockMessageService = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [ShortLinkComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        { provide: ShortLinkService, useValue: mockShortLinkService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShortLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty values', () => {
      expect(component.shortLinkForm.get('originalUrl')?.value).toBe('');
      expect(component.shortLinkForm.get('expiresAt')?.value).toBeNull();
    });

    it('should set minimum date to current time', () => {
      const minDate = component.minDate();
      const now = new Date();
      expect(minDate.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    it('should initialize with no created short link', () => {
      expect(component.createdShortLink()).toBeNull();
    });
  });

  describe('Form Validation', () => {
    it('should require URL field', () => {
      const urlControl = component.urlControl;
      expect(urlControl.hasError('required')).toBeTruthy();

      urlControl.setValue('https://example.com');
      expect(urlControl.hasError('required')).toBeFalsy();
    });

    it('should validate URL pattern', () => {
      const urlControl = component.urlControl;

      // Invalid URLs
      urlControl.setValue('not-a-url');
      expect(urlControl.hasError('pattern')).toBeTruthy();

      urlControl.setValue('ftp://example.com');
      expect(urlControl.hasError('pattern')).toBeTruthy();

      // Valid URLs
      urlControl.setValue('https://example.com');
      expect(urlControl.hasError('pattern')).toBeFalsy();

      urlControl.setValue('http://example.org');
      expect(urlControl.hasError('pattern')).toBeFalsy();
    });

    it('should validate maximum URL length', () => {
      const urlControl = component.urlControl;
      const longUrl = 'https://example.com/' + 'a'.repeat(2050);

      urlControl.setValue(longUrl);
      expect(urlControl.hasError('maxlength')).toBeTruthy();

      urlControl.setValue('https://example.com/short');
      expect(urlControl.hasError('maxlength')).toBeFalsy();
    });

    it('should mark form as invalid when URL is invalid', () => {
      component.urlControl.setValue('');
      expect(component.shortLinkForm.invalid).toBeTruthy();

      component.urlControl.setValue('not-a-url');
      expect(component.shortLinkForm.invalid).toBeTruthy();

      component.urlControl.setValue('https://example.com');
      expect(component.shortLinkForm.invalid).toBeFalsy();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.urlControl.setValue('https://example.com');
    });

    it('should not submit when form is invalid', () => {
      component.urlControl.setValue('');
      component.onSubmit();

      expect(mockShortLinkService.createShortLink).not.toHaveBeenCalled();
    });

    it('should not submit when tool is disabled', () => {
      Object.defineProperty(mockShortLinkService, 'isToolEnabled', {
        value: signal(false),
        writable: true,
      });
      component.onSubmit();

      expect(mockShortLinkService.createShortLink).not.toHaveBeenCalled();
    });

    it('should submit valid form and handle success', () => {
      const mockResponse = {
        success: true,
        data: {
          shortLink: mockShortLink,
          shortUrl: 'http://localhost:4200/l/abc123def',
        },
      };

      mockShortLinkService.createShortLink.and.returnValue(of(mockResponse));

      component.onSubmit();

      expect(mockShortLinkService.createShortLink).toHaveBeenCalledWith({
        originalUrl: 'https://example.com',
        expiresAt: null,
      });

      expect(component.createdShortLink()).toEqual(mockShortLink);
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Short link created successfully!',
      });
    });

    it('should handle submission error', () => {
      const error = new Error('Creation failed');
      mockShortLinkService.createShortLink.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Creation failed',
      });
    });

    it('should include expiration date when provided', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      component.expirationControl.setValue(futureDate);
      mockShortLinkService.createShortLink.and.returnValue(
        of({
          success: true,
          data: { shortLink: mockShortLink, shortUrl: 'http://localhost:4200/l/abc123def' },
        }),
      );

      component.onSubmit();

      expect(mockShortLinkService.createShortLink).toHaveBeenCalledWith({
        originalUrl: 'https://example.com',
        expiresAt: futureDate,
      });
    });

    it('should trim URL before submission', () => {
      component.urlControl.setValue('  https://example.com  ');
      mockShortLinkService.createShortLink.and.returnValue(
        of({
          success: true,
          data: { shortLink: mockShortLink, shortUrl: 'http://localhost:4200/l/abc123def' },
        }),
      );

      component.onSubmit();

      expect(mockShortLinkService.createShortLink).toHaveBeenCalledWith({
        originalUrl: 'https://example.com',
        expiresAt: null,
      });
    });
  });

  describe('Form Actions', () => {
    it('should clear form and reset state', () => {
      component.urlControl.setValue('https://example.com');
      component.createdShortLink.set(mockShortLink);

      component.clearForm();

      expect(component.shortLinkForm.get('originalUrl')?.value).toBeNull();
      expect(component.shortLinkForm.get('expiresAt')?.value).toBeNull();
      expect(component.createdShortLink()).toBeNull();
      expect(mockShortLinkService.clearError).toHaveBeenCalled();
    });

    it('should clear error and created link when form changes', () => {
      component.createdShortLink.set(mockShortLink);

      component.urlControl.setValue('https://example.org');

      expect(mockShortLinkService.clearError).toHaveBeenCalled();
      expect(component.createdShortLink()).toBeNull();
    });
  });

  describe('Clipboard Functionality', () => {
    beforeEach(() => {
      component.createdShortLink.set(mockShortLink);
      mockShortLinkService.generateShortUrl.and.returnValue('https://localhost/s/abc123');
    });

    it('should copy generated short URL to clipboard', async () => {
      mockShortLinkService.copyToClipboard.and.resolveTo(true);

      await component.copyShortUrl();

      expect(mockShortLinkService.copyToClipboard).toHaveBeenCalledWith(
        'https://localhost/s/abc123',
      );
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Copied!',
        detail: 'Short URL copied to clipboard',
      });
    });

    it('should copy specific code when provided', async () => {
      mockShortLinkService.copyToClipboard.and.resolveTo(true);
      mockShortLinkService.generateShortUrl.and.returnValue('https://localhost/s/xyz789');

      await component.copyShortUrl('xyz789');

      expect(mockShortLinkService.generateShortUrl).toHaveBeenCalledWith('xyz789');
      expect(mockShortLinkService.copyToClipboard).toHaveBeenCalledWith(
        'https://localhost/s/xyz789',
      );
    });

    it('should handle clipboard copy failure', async () => {
      mockShortLinkService.copyToClipboard.and.resolveTo(false);

      await component.copyShortUrl();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Unable to copy to clipboard. Please copy manually.',
      });
    });

    it('should handle clipboard error', async () => {
      mockShortLinkService.copyToClipboard.and.rejectWith(new Error('Clipboard error'));

      await component.copyShortUrl();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Unable to copy to clipboard. Please copy manually.',
      });
    });
  });

  describe('Recent Links Management', () => {
    it('should refresh recent links', () => {
      component.refreshLinks();

      expect(mockShortLinkService.refreshRecentLinks).toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Refreshing',
        detail: 'Updating recent links...',
      });
    });

    it('should generate short URL for given code', () => {
      mockShortLinkService.generateShortUrl.and.returnValue('https://localhost/s/test123');

      const result = component.generateShortUrl('test123');

      expect(result).toBe('https://localhost/s/test123');
      expect(mockShortLinkService.generateShortUrl).toHaveBeenCalledWith('test123');
    });
  });

  describe('Expiration Status', () => {
    it('should return "Expired" for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const status = component.getExpirationStatus(pastDate);
      expect(status).toBe('Expired');

      const severity = component.getExpirationSeverity(pastDate);
      expect(severity).toBe('danger');
    });

    it('should return "Expires Soon" for dates within 24 hours', () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 12);

      const status = component.getExpirationStatus(soonDate);
      expect(status).toBe('Expires Soon');

      const severity = component.getExpirationSeverity(soonDate);
      expect(severity).toBe('warning');
    });

    it('should return "Active" for future dates beyond 24 hours', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const status = component.getExpirationStatus(futureDate);
      expect(status).toBe('Active');

      const severity = component.getExpirationSeverity(futureDate);
      expect(severity).toBe('success');
    });

    it('should handle string dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const status = component.getExpirationStatus(futureDate.toISOString());
      expect(status).toBe('Active');
    });
  });

  describe('Computed Values', () => {
    it('should generate short URL when short link is created', () => {
      mockShortLinkService.generateShortUrl.and.returnValue('https://localhost/s/abc123');
      component.createdShortLink.set(mockShortLink);

      const generatedUrl = component.generatedShortUrl();
      expect(generatedUrl).toBe('https://localhost/s/abc123');
    });

    it('should return empty string when no short link is created', () => {
      component.createdShortLink.set(null);

      const generatedUrl = component.generatedShortUrl();
      expect(generatedUrl).toBe('');
    });
  });

  describe('Tool Availability', () => {
    it('should show enabled state when tool is available', () => {
      Object.defineProperty(mockShortLinkService, 'isToolEnabled', {
        value: signal(true),
        writable: true,
      });
      fixture.detectChanges();

      expect(component.isToolEnabled()).toBeTruthy();
    });

    it('should show disabled state when tool is not available', () => {
      Object.defineProperty(mockShortLinkService, 'isToolEnabled', {
        value: signal(false),
        writable: true,
      });
      fixture.detectChanges();

      expect(component.isToolEnabled()).toBeFalsy();
    });
  });

  describe('Service Integration', () => {
    it('should use service signals for component state', () => {
      expect(component.loading).toBe(mockShortLinkService.loading);
      expect(component.error).toBe(mockShortLinkService.error);
      expect(component.recentLinks).toBe(mockShortLinkService.recentLinks);
      expect(component.isToolEnabled).toBe(mockShortLinkService.isToolEnabled);
    });

    it('should clean up subscriptions on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
