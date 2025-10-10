import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

/**
 * HTML Sanitization Service
 * Provides security utilities to prevent XSS attacks when rendering user-provided HTML content.
 * Uses DOMPurify with strict whitelist configuration for safe HTML rendering.
 */
@Injectable({
  providedIn: 'root',
})
export class HtmlSanitizerService {
  /**
   * Sanitizes HTML content to prevent XSS attacks.
   * Whitelists safe HTML tags and attributes only.
   *
   * @param html - Raw HTML content to sanitize
   * @returns Sanitized HTML safe for rendering
   *
   * @example
   * const safe = sanitizer.sanitize('<p>Hello <script>alert("XSS")</script></p>');
   * // Returns: '<p>Hello </p>'
   */
  sanitize(html: string): string {
    if (!html) {
      return '';
    }

    // Configure DOMPurify with strict whitelist
    const config = {
      ALLOWED_TAGS: [
        'p',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'em',
        'u',
        's',
        'ul',
        'ol',
        'li',
        'a',
        'blockquote',
        'br',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
    };

    // Sanitize HTML
    let clean = DOMPurify.sanitize(html, config);

    // Force external links to open in new tab with security attributes
    clean = clean.replace(/<a\s+/g, '<a target="_blank" rel="noopener noreferrer" ');

    return clean;
  }

  /**
   * Strips all HTML tags and returns plain text.
   * Used for preview in form canvas and word counting.
   *
   * @param html - HTML content to strip
   * @returns Plain text without HTML tags
   *
   * @example
   * const text = sanitizer.stripHtml('<p><strong>Bold</strong> text</p>');
   * // Returns: 'Bold text'
   */
  stripHtml(html: string): string {
    if (!html) {
      return '';
    }

    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * Truncates text to specified length with ellipsis.
   *
   * @param text - Text to truncate
   * @param maxLength - Maximum length before truncation
   * @returns Truncated text with ellipsis if needed
   *
   * @example
   * const short = sanitizer.truncate('Long text...', 10);
   * // Returns: 'Long text...'
   */
  truncate(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Counts words in text (after stripping HTML).
   *
   * @param html - HTML content to count words in
   * @returns Number of words
   *
   * @example
   * const count = sanitizer.countWords('<p>Hello world</p>');
   * // Returns: 2
   */
  countWords(html: string): number {
    const plainText = this.stripHtml(html);
    if (!plainText.trim()) {
      return 0;
    }
    return plainText.trim().split(/\s+/).length;
  }

  /**
   * Checks if content exceeds word limit.
   *
   * @param html - HTML content to check
   * @param wordLimit - Maximum word count
   * @returns True if content exceeds word limit
   */
  isContentLong(html: string, wordLimit: number = 500): boolean {
    return this.countWords(html) > wordLimit;
  }
}
