import { TestBed } from '@angular/core/testing';
import { ValidationPresetsService, ValidationPreset } from './validation-presets.service';

describe('ValidationPresetsService', () => {
  let service: ValidationPresetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ValidationPresetsService],
    });
    service = TestBed.inject(ValidationPresetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPresets', () => {
    it('should return all validation presets', () => {
      const presets = service.getPresets();
      expect(presets).toBeTruthy();
      expect(presets.length).toBeGreaterThan(0);
    });

    it('should include email preset', () => {
      const presets = service.getPresets();
      const emailPreset = presets.find((p) => p.name === 'email');
      expect(emailPreset).toBeTruthy();
      expect(emailPreset?.label).toBe('Email Pattern');
      expect(emailPreset?.pattern).toContain('@');
    });

    it('should include phone_us preset', () => {
      const presets = service.getPresets();
      const phonePreset = presets.find((p) => p.name === 'phone_us');
      expect(phonePreset).toBeTruthy();
      expect(phonePreset?.label).toBe('Phone Pattern (US)');
      expect(phonePreset?.pattern).toContain('\\d{3}');
    });

    it('should include url preset', () => {
      const presets = service.getPresets();
      const urlPreset = presets.find((p) => p.name === 'url');
      expect(urlPreset).toBeTruthy();
      expect(urlPreset?.label).toBe('URL Pattern');
      expect(urlPreset?.pattern).toContain('https?');
    });

    it('should include custom preset', () => {
      const presets = service.getPresets();
      const customPreset = presets.find((p) => p.name === 'custom');
      expect(customPreset).toBeTruthy();
      expect(customPreset?.label).toBe('Custom Regex');
      expect(customPreset?.pattern).toBe('');
    });

    it('should return presets with required properties', () => {
      const presets = service.getPresets();
      presets.forEach((preset) => {
        expect(preset.name).toBeDefined();
        expect(preset.label).toBeDefined();
        expect(preset.pattern).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.example).toBeDefined();
      });
    });
  });

  describe('getPreset', () => {
    it('should return email preset by name', () => {
      const emailPreset = service.getPreset('email');
      expect(emailPreset).toBeTruthy();
      expect(emailPreset?.name).toBe('email');
      expect(emailPreset?.pattern).toBe('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
    });

    it('should return phone_us preset by name', () => {
      const phonePreset = service.getPreset('phone_us');
      expect(phonePreset).toBeTruthy();
      expect(phonePreset?.name).toBe('phone_us');
      expect(phonePreset?.description).toContain('US phone');
    });

    it('should return url preset by name', () => {
      const urlPreset = service.getPreset('url');
      expect(urlPreset).toBeTruthy();
      expect(urlPreset?.name).toBe('url');
      expect(urlPreset?.example).toContain('https://');
    });

    it('should return custom preset by name', () => {
      const customPreset = service.getPreset('custom');
      expect(customPreset).toBeTruthy();
      expect(customPreset?.name).toBe('custom');
      expect(customPreset?.pattern).toBe('');
    });

    it('should return undefined for non-existent preset', () => {
      const preset = service.getPreset('nonexistent');
      expect(preset).toBeUndefined();
    });
  });

  describe('pattern validation', () => {
    it('email pattern should be valid regex', () => {
      const emailPreset = service.getPreset('email');
      expect(() => new RegExp(emailPreset!.pattern)).not.toThrow();
    });

    it('phone_us pattern should be valid regex', () => {
      const phonePreset = service.getPreset('phone_us');
      expect(() => new RegExp(phonePreset!.pattern)).not.toThrow();
    });

    it('url pattern should be valid regex', () => {
      const urlPreset = service.getPreset('url');
      expect(() => new RegExp(urlPreset!.pattern)).not.toThrow();
    });

    it('email pattern should match valid email', () => {
      const emailPreset = service.getPreset('email');
      const regex = new RegExp(emailPreset!.pattern);
      expect(regex.test('user@example.com')).toBe(true);
      expect(regex.test('test.user@subdomain.example.com')).toBe(true);
    });

    it('email pattern should not match invalid email', () => {
      const emailPreset = service.getPreset('email');
      const regex = new RegExp(emailPreset!.pattern);
      expect(regex.test('invalid')).toBe(false);
      expect(regex.test('@example.com')).toBe(false);
      expect(regex.test('user@')).toBe(false);
    });

    it('phone_us pattern should match valid US phone', () => {
      const phonePreset = service.getPreset('phone_us');
      const regex = new RegExp(phonePreset!.pattern);
      expect(regex.test('(555) 123-4567')).toBe(true);
      expect(regex.test('555-123-4567')).toBe(true);
      expect(regex.test('5551234567')).toBe(true);
      expect(regex.test('+1 555 123 4567')).toBe(true);
    });

    it('url pattern should match valid URLs', () => {
      const urlPreset = service.getPreset('url');
      const regex = new RegExp(urlPreset!.pattern);
      expect(regex.test('https://example.com')).toBe(true);
      expect(regex.test('http://www.example.com')).toBe(true);
      expect(regex.test('https://example.com/path?query=value')).toBe(true);
    });
  });
});
