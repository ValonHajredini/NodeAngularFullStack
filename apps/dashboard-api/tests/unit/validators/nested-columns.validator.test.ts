/**
 * Unit tests for Nested Columns Validators
 * Epic 27: Nested Column Layout System
 */

import {
  validateFractionalUnits,
  validateSubColumnStructure,
  validateColumnWidths,
} from '../../../src/validators/nested-columns.validator';
import { SubColumnConfig } from '@nodeangularfullstack/shared';

describe('Nested Columns Validators', () => {
  describe('validateFractionalUnits', () => {
    describe('Valid Cases', () => {
      it('should validate single fractional unit', () => {
        const result = validateFractionalUnits(['1fr']);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate multiple fractional units', () => {
        const result = validateFractionalUnits(['1fr', '2fr', '3fr']);
        expect(result.valid).toBe(true);
      });

      it('should validate equal fractional units', () => {
        const result = validateFractionalUnits(['1fr', '1fr']);
        expect(result.valid).toBe(true);
      });

      it('should validate large fractional values', () => {
        const result = validateFractionalUnits(['10fr', '20fr', '100fr']);
        expect(result.valid).toBe(true);
      });

      it('should handle whitespace by trimming', () => {
        const result = validateFractionalUnits([' 1fr ', '2fr  ', '  3fr']);
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid Cases', () => {
      it('should reject empty array', () => {
        const result = validateFractionalUnits([]);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('cannot be empty');
      });

      it('should reject non-fractional units (px)', () => {
        const result = validateFractionalUnits(['1px', '2fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
        expect(result.error).toContain('1px');
      });

      it('should reject negative values', () => {
        const result = validateFractionalUnits(['-1fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
      });

      it('should reject fractional units with decimals', () => {
        const result = validateFractionalUnits(['1.5fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
      });

      it('should reject units without "fr" suffix', () => {
        const result = validateFractionalUnits(['1', '2fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
      });

      it('should reject percentage values', () => {
        const result = validateFractionalUnits(['50%', '50%']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
      });

      it('should reject undefined values in array', () => {
        const result = validateFractionalUnits([undefined as any, '2fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('undefined or null');
      });

      it('should reject null values in array', () => {
        const result = validateFractionalUnits([null as any, '2fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('undefined or null');
      });

      it('should reject leading zeros', () => {
        const result = validateFractionalUnits(['01fr', '2fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Leading zeros not allowed');
      });

      it('should reject empty string values', () => {
        const result = validateFractionalUnits(['', '2fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
      });

      it('should reject special characters', () => {
        const result = validateFractionalUnits(['1fr!', '2fr']);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
      });
    });
  });

  describe('validateSubColumnStructure', () => {
    describe('Valid Cases', () => {
      it('should validate basic sub-column config without widths', () => {
        const config: SubColumnConfig = {
          columnIndex: 0,
          subColumnCount: 2,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(true);
      });

      it('should validate sub-column config with widths', () => {
        const config: SubColumnConfig = {
          columnIndex: 1,
          subColumnCount: 2,
          subColumnWidths: ['1fr', '2fr'],
        };
        const result = validateSubColumnStructure(config, 3);
        expect(result.valid).toBe(true);
      });

      it('should validate 3 sub-columns with equal widths', () => {
        const config: SubColumnConfig = {
          columnIndex: 0,
          subColumnCount: 3,
          subColumnWidths: ['1fr', '1fr', '1fr'],
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(true);
      });

      it('should validate 4 sub-columns', () => {
        const config: SubColumnConfig = {
          columnIndex: 2,
          subColumnCount: 4,
          subColumnWidths: ['1fr', '2fr', '1fr', '1fr'],
        };
        const result = validateSubColumnStructure(config, 4);
        expect(result.valid).toBe(true);
      });

      it('should validate last column index', () => {
        const config: SubColumnConfig = {
          columnIndex: 3,
          subColumnCount: 2,
        };
        const result = validateSubColumnStructure(config, 4);
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid Cases - Missing Properties', () => {
      it('should reject missing columnIndex', () => {
        const config: any = {
          subColumnCount: 2,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('columnIndex is required');
      });

      it('should reject missing subColumnCount', () => {
        const config: any = {
          columnIndex: 0,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('subColumnCount is required');
      });
    });

    describe('Invalid Cases - Column Index Out of Bounds', () => {
      it('should reject negative columnIndex', () => {
        const config: SubColumnConfig = {
          columnIndex: -1,
          subColumnCount: 2,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('cannot be negative');
      });

      it('should reject columnIndex exceeding parent column count', () => {
        const config: SubColumnConfig = {
          columnIndex: 5,
          subColumnCount: 2,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds parent row column count');
      });

      it('should reject columnIndex equal to parent column count', () => {
        const config: SubColumnConfig = {
          columnIndex: 2,
          subColumnCount: 2,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds parent row column count');
      });
    });

    describe('Invalid Cases - Sub-Column Count', () => {
      it('should reject subColumnCount of 0', () => {
        const config: any = {
          columnIndex: 0,
          subColumnCount: 0,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be 1, 2, 3, or 4');
      });

      it('should reject subColumnCount greater than 4', () => {
        const config: any = {
          columnIndex: 0,
          subColumnCount: 5,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be 1, 2, 3, or 4');
      });

      it('should reject negative subColumnCount', () => {
        const config: any = {
          columnIndex: 0,
          subColumnCount: -1,
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must be 1, 2, 3, or 4');
      });
    });

    describe('Invalid Cases - Sub-Column Widths', () => {
      it('should reject widths array length mismatch', () => {
        const config: SubColumnConfig = {
          columnIndex: 0,
          subColumnCount: 3,
          subColumnWidths: ['1fr', '2fr'], // Only 2 widths for 3 sub-columns
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not match subColumnCount');
      });

      it('should reject invalid fractional unit syntax in widths', () => {
        const config: SubColumnConfig = {
          columnIndex: 0,
          subColumnCount: 2,
          subColumnWidths: ['1px', '2fr'], // Invalid "1px"
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid subColumnWidths');
      });

      it('should reject empty string in widths array', () => {
        const config: SubColumnConfig = {
          columnIndex: 0,
          subColumnCount: 2,
          subColumnWidths: ['', '2fr'],
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid subColumnWidths');
      });

      it('should reject negative fractional units in widths', () => {
        const config: SubColumnConfig = {
          columnIndex: 0,
          subColumnCount: 2,
          subColumnWidths: ['-1fr', '2fr'],
        };
        const result = validateSubColumnStructure(config, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid subColumnWidths');
      });
    });
  });

  describe('validateColumnWidths', () => {
    describe('Valid Cases', () => {
      it('should validate 2-column widths', () => {
        const result = validateColumnWidths(['1fr', '3fr'], 2);
        expect(result.valid).toBe(true);
      });

      it('should validate 3-column widths', () => {
        const result = validateColumnWidths(['1fr', '2fr', '1fr'], 3);
        expect(result.valid).toBe(true);
      });

      it('should validate 4-column widths', () => {
        const result = validateColumnWidths(['1fr', '1fr', '2fr', '1fr'], 4);
        expect(result.valid).toBe(true);
      });

      it('should validate equal column widths', () => {
        const result = validateColumnWidths(['1fr', '1fr', '1fr'], 3);
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid Cases', () => {
      it('should reject widths array length mismatch (too few)', () => {
        const result = validateColumnWidths(['1fr'], 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must match columnCount');
      });

      it('should reject widths array length mismatch (too many)', () => {
        const result = validateColumnWidths(['1fr', '2fr', '3fr'], 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must match columnCount');
      });

      it('should reject invalid fractional unit syntax', () => {
        const result = validateColumnWidths(['1px', '2fr'], 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid unit');
      });

      it('should reject empty widths array when columnCount > 0', () => {
        const result = validateColumnWidths([], 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('must match columnCount');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large fractional values', () => {
      const result = validateFractionalUnits(['999fr', '1fr']);
      expect(result.valid).toBe(true);
    });

    it('should handle maximum column count (4 columns)', () => {
      const result = validateColumnWidths(['1fr', '1fr', '1fr', '1fr'], 4);
      expect(result.valid).toBe(true);
    });

    it('should handle sub-column config with all maximum values', () => {
      const config: SubColumnConfig = {
        columnIndex: 3,
        subColumnCount: 4,
        subColumnWidths: ['1fr', '2fr', '3fr', '4fr'],
      };
      const result = validateSubColumnStructure(config, 4);
      expect(result.valid).toBe(true);
    });

    it('should reject completely invalid fractional unit format', () => {
      const result = validateFractionalUnits(['random string', '2fr']);
      expect(result.valid).toBe(false);
    });
  });
});
