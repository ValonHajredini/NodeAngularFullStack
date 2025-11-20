/**
 * HTML Sanitization Utility
 * Provides defense-in-depth XSS protection for custom HTML backgrounds
 * Uses DOMPurify with strict whitelist for allowed tags and attributes
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes custom background HTML to prevent XSS attacks
 * Uses strict whitelist approach - only explicitly allowed tags/attributes pass through
 *
 * Security Policy:
 * - ALLOWED TAGS: div, span, p, h1-h3, style (limited set for styling only)
 * - ALLOWED ATTRIBUTES: class, id, style (no event handlers)
 * - FORBIDDEN TAGS: script, iframe, object, embed, link, base (XSS vectors)
 * - FORBIDDEN ATTRIBUTES: All event handlers (onclick, onerror, onload, etc.)
 * - DATA ATTRIBUTES: Blocked (can be used for attacks)
 *
 * @param html - Raw HTML string from user input
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```typescript
 * const unsafe = '<script>alert("XSS")</script><div>Safe</div>';
 * const safe = sanitizeCustomBackground(unsafe);
 * console.log(safe); // '<div>Safe</div>'
 * ```
 */
export function sanitizeCustomBackground(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    // Whitelist: Only these tags are allowed
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'style'],

    // Whitelist: Only these attributes are allowed
    ALLOWED_ATTR: ['class', 'id', 'style'],

    // Blacklist: These tags are explicitly forbidden (redundant but explicit)
    FORBID_TAGS: [
      'script',    // JavaScript execution
      'iframe',    // Can load malicious content
      'object',    // Plugin execution
      'embed',     // Plugin execution
      'link',      // Can load malicious stylesheets
      'base',      // URL hijacking
      'meta',      // Can redirect
      'form',      // Phishing vector
      'input',     // Data harvesting
      'button',    // Clickjacking
      'a',         // Link hijacking
      'img',       // Can trigger onerror handlers
      'video',     // Can trigger event handlers
      'audio',     // Can trigger event handlers
      'svg',       // Can contain scripts
    ],

    // Blacklist: Event handler attributes (all variations)
    FORBID_ATTR: [
      'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
      'onmouseout', 'onmousemove', 'onmouseenter', 'onmouseleave',
      'onkeydown', 'onkeyup', 'onkeypress',
      'onfocus', 'onblur', 'onchange', 'oninput', 'onsubmit', 'onreset',
      'onload', 'onerror', 'onabort',
      'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel',
      'onpointerdown', 'onpointerup', 'onpointermove', 'onpointercancel',
      'ondrag', 'ondrop', 'ondragstart', 'ondragend', 'ondragover',
      'onscroll', 'onwheel',
      'onanimationstart', 'onanimationend', 'onanimationiteration',
      'ontransitionend',
      // Other dangerous attributes
      'formaction', 'action', 'href', 'src', 'data', 'poster',
    ],

    // Security settings
    ALLOW_DATA_ATTR: false,        // Block data-* attributes (can be attack vectors)
    KEEP_CONTENT: false,            // Remove content of forbidden tags
    RETURN_DOM: false,              // Return string, not DOM
    RETURN_DOM_FRAGMENT: false,     // Return string, not fragment
    FORCE_BODY: false,              // Don't wrap in body
    SANITIZE_DOM: true,             // Sanitize DOM
    WHOLE_DOCUMENT: false,          // Only sanitize fragment
    IN_PLACE: false,                // Don't modify input
  });
}

/**
 * Validates that sanitized HTML is not empty after sanitization
 * Used to detect if input was entirely malicious
 *
 * @param html - Raw HTML string
 * @returns True if sanitized output has content, false if empty
 */
export function hasValidContent(html: string): boolean {
  const sanitized = sanitizeCustomBackground(html);
  return sanitized.trim().length > 0;
}

/**
 * Checks if HTML contains potentially dangerous content before sanitization
 * Used for logging/alerting purposes
 *
 * @param html - Raw HTML string
 * @returns True if dangerous patterns detected
 */
export function containsDangerousPatterns(html: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,  // Event handlers
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(html));
}
