import { TestBed } from '@angular/core/testing';
import { HtmlSanitizerService } from './html-sanitizer.service';

describe('HtmlSanitizerService', () => {
  let service: HtmlSanitizerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HtmlSanitizerService],
    });
    service = TestBed.inject(HtmlSanitizerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sanitize', () => {
    it('should allow safe HTML tags', () => {
      const safeHtml = '<p>Hello <strong>World</strong></p>';
      const result = service.sanitize(safeHtml);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove script tags', () => {
      const maliciousHtml = '<p>Safe</p><script>alert("XSS")</script>';
      const result = service.sanitize(maliciousHtml);
      expect(result).toContain('<p>Safe</p>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const maliciousHtml = '<div onclick="alert(\'XSS\')">Click</div>';
      const result = service.sanitize(maliciousHtml);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    it('should remove javascript: URLs', () => {
      const maliciousHtml = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const result = service.sanitize(maliciousHtml);
      expect(result).not.toContain('javascript:');
    });

    it('should remove iframe tags', () => {
      const maliciousHtml = '<iframe src="https://evil.com"></iframe>';
      const result = service.sanitize(maliciousHtml);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('evil.com');
    });

    it('should remove object and embed tags', () => {
      const maliciousHtml = '<object data="evil.swf"></object><embed src="evil.swf">';
      const result = service.sanitize(maliciousHtml);
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });

    it('should force target="_blank" and rel attributes on links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = service.sanitize(html);
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should allow headings h3-h6', () => {
      const html = '<h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
      const result = service.sanitize(html);
      expect(result).toContain('<h3>');
      expect(result).toContain('<h4>');
      expect(result).toContain('<h5>');
      expect(result).toContain('<h6>');
    });

    it('should allow lists', () => {
      const html = '<ul><li>Item 1</li></ul><ol><li>Item 2</li></ol>';
      const result = service.sanitize(html);
      expect(result).toContain('<ul>');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
    });

    it('should allow blockquote', () => {
      const html = '<blockquote>Quote</blockquote>';
      const result = service.sanitize(html);
      expect(result).toContain('<blockquote>');
      expect(result).toContain('Quote');
    });

    it('should return empty string for empty input', () => {
      expect(service.sanitize('')).toBe('');
      expect(service.sanitize(null as any)).toBe('');
      expect(service.sanitize(undefined as any)).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const html = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const result = service.stripHtml(html);
      expect(result).toBe('Bold and italic text');
    });

    it('should handle nested HTML', () => {
      const html = '<div><p><span>Nested</span></p></div>';
      const result = service.stripHtml(html);
      expect(result).toBe('Nested');
    });

    it('should return empty string for empty input', () => {
      expect(service.stripHtml('')).toBe('');
      expect(service.stripHtml(null as any)).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that needs to be truncated';
      const result = service.truncate(longText, 20);
      expect(result).toBe('This is a very long ...');
      expect(result.length).toBe(23); // 20 + "..."
    });

    it('should not truncate short text', () => {
      const shortText = 'Short';
      const result = service.truncate(shortText, 20);
      expect(result).toBe('Short');
    });

    it('should handle exact length', () => {
      const text = 'Exactly twenty chars';
      const result = service.truncate(text, 20);
      expect(result).toBe('Exactly twenty chars');
    });
  });

  describe('countWords', () => {
    it('should count words correctly', () => {
      const html = '<p>This has five words total</p>';
      const result = service.countWords(html);
      expect(result).toBe(5);
    });

    it('should handle HTML with multiple tags', () => {
      const html = '<p>Word <strong>word</strong> <em>word</em></p>';
      const result = service.countWords(html);
      expect(result).toBe(3);
    });

    it('should return 0 for empty content', () => {
      expect(service.countWords('')).toBe(0);
      expect(service.countWords('<p></p>')).toBe(0);
      expect(service.countWords('   ')).toBe(0);
    });

    it('should handle whitespace correctly', () => {
      const html = '<p>Word1    Word2</p>'; // Multiple spaces
      const result = service.countWords(html);
      expect(result).toBe(2);
    });
  });

  describe('isContentLong', () => {
    it('should return true for content exceeding word limit', () => {
      const html = '<p>' + 'word '.repeat(501) + '</p>';
      const result = service.isContentLong(html, 500);
      expect(result).toBe(true);
    });

    it('should return false for content within word limit', () => {
      const html = '<p>' + 'word '.repeat(499) + '</p>';
      const result = service.isContentLong(html, 500);
      expect(result).toBe(false);
    });

    it('should use default limit of 500 words', () => {
      const html = '<p>' + 'word '.repeat(501) + '</p>';
      const result = service.isContentLong(html);
      expect(result).toBe(true);
    });
  });

  describe('Security Tests (XSS Prevention)', () => {
    it('should prevent XSS with img onerror', () => {
      const xss = '<img src=x onerror="alert(\'XSS\')">';
      const result = service.sanitize(xss);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should prevent XSS with style tag', () => {
      const xss = '<style>body{background:url("javascript:alert(\'XSS\')")}</style>';
      const result = service.sanitize(xss);
      expect(result).not.toContain('<style>');
      expect(result).not.toContain('javascript:');
    });

    it('should prevent XSS with base64 encoded script', () => {
      const xss =
        '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">Click</a>';
      const result = service.sanitize(xss);
      expect(result).not.toContain('data:text/html');
    });

    it('should prevent multiple XSS attack vectors', () => {
      const xss = `
        <script>alert('XSS')</script>
        <img src=x onerror="alert('XSS')">
        <svg onload="alert('XSS')">
        <iframe src="javascript:alert('XSS')"></iframe>
        <object data="javascript:alert('XSS')"></object>
        <a href="javascript:alert('XSS')">Click</a>
      `;
      const result = service.sanitize(xss);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });
  });
});
