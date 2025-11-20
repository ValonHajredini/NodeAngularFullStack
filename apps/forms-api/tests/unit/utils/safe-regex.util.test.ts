import { validateRegexPattern } from '../../../src/utils/safe-regex.util';

describe('validateRegexPattern', () => {
  describe('Safe patterns', () => {
    it('should accept empty pattern', () => {
      const result = validateRegexPattern('');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept safe email pattern', () => {
      const result = validateRegexPattern('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept safe phone pattern', () => {
      const result = validateRegexPattern(
        '^\\+?1?\\s?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept safe URL pattern', () => {
      const result = validateRegexPattern(
        '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept simple alphanumeric pattern', () => {
      const result = validateRegexPattern('^[a-zA-Z0-9]+$');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept pattern with single quantifier', () => {
      const result = validateRegexPattern('^[a-z]*$');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('ReDoS vulnerable patterns', () => {
    it('should reject classic ReDoS pattern (a+)+', () => {
      const result = validateRegexPattern('(a+)+');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('ReDoS'))).toBe(true);
    });

    it('should reject ReDoS pattern (a*)*', () => {
      const result = validateRegexPattern('(a*)*');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('ReDoS'))).toBe(true);
    });

    it('should accept safe patterns with moderate complexity', () => {
      // These patterns are complex but safe
      const result1 = validateRegexPattern('(a|b)*c');
      expect(result1.valid).toBe(true);

      const result2 = validateRegexPattern('(a*b*c*)');
      expect(result2.valid).toBe(true);
    });
  });

  describe('Invalid syntax', () => {
    it('should reject invalid regex with unclosed bracket', () => {
      const result = validateRegexPattern('[a-z');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('syntax'))).toBe(true);
    });

    it('should reject invalid regex with unclosed parenthesis', () => {
      const result = validateRegexPattern('(abc');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('syntax'))).toBe(true);
    });

    it('should reject invalid regex with invalid repetition', () => {
      const result = validateRegexPattern('*abc'); // * without preceding atom
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('syntax'))).toBe(true);
    });
  });

  describe('Length limits', () => {
    it('should reject pattern exceeding 500 characters', () => {
      const longPattern = 'a'.repeat(501);
      const result = validateRegexPattern(longPattern);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('exceeds maximum length'))
      ).toBe(true);
    });

    it('should accept pattern at 500 character limit', () => {
      const longPattern = 'a'.repeat(500);
      const result = validateRegexPattern(longPattern);
      // Will fail if safe-regex detects issues, but won't fail on length
      expect(
        result.errors.some((e) => e.includes('exceeds maximum length'))
      ).toBe(false);
    });
  });

  describe('Multiple errors', () => {
    it('should return multiple errors when pattern has multiple issues', () => {
      const longReDoSPattern = 'a'.repeat(501) + '(a+)+';
      const result = validateRegexPattern(longReDoSPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Edge cases', () => {
    it('should accept whitespace-only pattern as empty', () => {
      const result = validateRegexPattern('   ');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept pattern with escaped special characters', () => {
      const result = validateRegexPattern('^\\[\\(\\)\\]\\{\\}$');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
