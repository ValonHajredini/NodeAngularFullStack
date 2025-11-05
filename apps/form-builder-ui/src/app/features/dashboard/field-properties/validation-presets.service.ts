import { Injectable } from '@angular/core';

/**
 * Validation preset definition with pattern, description, and example
 */
export interface ValidationPreset {
  /** Unique identifier for the preset */
  name: string;
  /** Display label for dropdown */
  label: string;
  /** Regular expression pattern */
  pattern: string;
  /** Human-readable description of what the pattern validates */
  description: string;
  /** Example of valid input matching this pattern */
  example: string;
}

/**
 * Service providing predefined validation regex patterns.
 * Includes common patterns for email, phone, URL validation.
 *
 * @example
 * ```typescript
 * const presets = validationPresetsService.getPresets();
 * const emailPreset = validationPresetsService.getPreset('email');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ValidationPresetsService {
  /**
   * Predefined validation patterns for common use cases
   */
  private readonly presets: ValidationPreset[] = [
    {
      name: 'email',
      label: 'Email Pattern',
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      description: 'Validates email address format',
      example: 'user@example.com',
    },
    {
      name: 'phone_us',
      label: 'Phone Pattern (US)',
      pattern: '^\\+?1?\\s?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$',
      description: 'Validates US phone numbers (10 digits)',
      example: '(555) 123-4567 or 555-123-4567',
    },
    {
      name: 'url',
      label: 'URL Pattern',
      pattern:
        '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$',
      description: 'Validates HTTP/HTTPS URLs',
      example: 'https://example.com or http://www.example.com/path',
    },
    {
      name: 'custom',
      label: 'Custom Regex',
      pattern: '',
      description: 'Enter your own regular expression pattern',
      example: 'Custom pattern',
    },
  ];

  /**
   * Gets all available validation presets.
   * @returns Array of validation preset definitions
   */
  getPresets(): ValidationPreset[] {
    return this.presets;
  }

  /**
   * Gets a specific preset by name.
   * @param name - Preset name (email, phone_us, url, custom)
   * @returns Validation preset or undefined if not found
   * @example
   * ```typescript
   * const emailPreset = service.getPreset('email');
   * console.log(emailPreset.pattern); // '^[^\s@]+@[^\s@]+\.[^\s@]+$'
   * ```
   */
  getPreset(name: string): ValidationPreset | undefined {
    return this.presets.find((p) => p.name === name);
  }
}
