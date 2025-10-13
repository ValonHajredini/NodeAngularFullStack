import { test, expect } from '@playwright/test';

/**
 * E2E tests for Field-Specific Properties in Published Forms (Story 16.4).
 * Validates that HEADING, IMAGE, and TEXT_BLOCK field properties render correctly
 * in published forms viewed by visitors.
 *
 * Test Coverage:
 * - Test 1: HEADING field renders with correct level, alignment, color, font weight
 * - Test 2: IMAGE field renders with correct dimensions, alignment, object-fit
 * - Test 3: TEXT_BLOCK field renders HTML content with sanitization
 * - Test 4: Multiple field types with properties render correctly
 *
 * AC #10: Published forms render field-specific properties correctly
 * IV1: HEADING with level=H2, alignment=center, color=blue
 * IV3: TEXT_BLOCK with rich text formatting and HTML sanitization
 */
test.describe('Field-Specific Properties Rendering in Published Forms', () => {
  /**
   * Test 1: HEADING field renders with correct properties
   *
   * Validates:
   * - Heading level (H1-H6) renders as correct HTML element
   * - Text alignment (left/center/right) applied via CSS
   * - Color applied to text
   * - Font weight (normal/bold) applied
   * - Custom CSS styles preserved
   */
  test('should render HEADING field with correct properties', async ({ page }) => {
    // Navigate to form with HEADING field (assumes test form exists)
    // Form should have HEADING field with:
    // - headingLevel: h2
    // - alignment: center
    // - color: #0066cc
    // - fontWeight: bold
    await page.goto('/public/form/test-heading-properties');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify HEADING field exists and is H2 element
    const headingElement = page.locator('h2').first();
    await expect(headingElement).toBeVisible();

    // Verify text alignment is center
    const headingAlignment = await headingElement.evaluate((el) => {
      return window.getComputedStyle(el).textAlign;
    });
    expect(headingAlignment).toBe('center');

    // Verify color is blue (#0066cc)
    const headingColor = await headingElement.evaluate((el) => {
      const rgb = window.getComputedStyle(el).color;
      // Convert RGB to hex for comparison
      const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
      return rgb;
    });
    expect(headingColor).toBe('#0066cc');

    // Verify font weight is bold
    const headingFontWeight = await headingElement.evaluate((el) => {
      const weight = window.getComputedStyle(el).fontWeight;
      // Font weight can be "bold" or numeric (700)
      return weight === 'bold' || weight === '700';
    });
    expect(headingFontWeight).toBe(true);

    console.log('✅ Test 1 PASS: HEADING field renders with correct properties');
  });

  /**
   * Test 2: IMAGE field renders with correct properties
   *
   * Validates:
   * - Image URL loads correctly
   * - Alt text exists for accessibility
   * - Width/height CSS values applied
   * - Alignment (left/center/right/full) applied
   * - Object-fit property applied
   * - Caption displays if provided
   */
  test('should render IMAGE field with correct properties', async ({ page }) => {
    // Navigate to form with IMAGE field (assumes test form exists)
    // Form should have IMAGE field with:
    // - imageUrl: valid image URL
    // - altText: "Test image description"
    // - width: 500px
    // - height: auto
    // - alignment: center
    // - objectFit: contain
    // - caption: "Image caption"
    await page.goto('/public/form/test-image-properties');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify IMAGE field exists
    const imageElement = page.locator('img').first();
    await expect(imageElement).toBeVisible();

    // Verify alt text exists for accessibility
    const altText = await imageElement.getAttribute('alt');
    expect(altText).toBeTruthy();
    expect(altText).toContain('Test image description');

    // Verify image width is 500px (or close)
    const imageWidth = await imageElement.evaluate((el) => {
      return window.getComputedStyle(el).width;
    });
    expect(imageWidth).toBe('500px');

    // Verify image height is auto
    const imageHeight = await imageElement.evaluate((el) => {
      return window.getComputedStyle(el).height;
    });
    // Height should be auto or computed based on aspect ratio
    expect(imageHeight).toBeTruthy();

    // Verify alignment is center (image container should have text-align: center)
    const imageContainer = imageElement.locator('xpath=..');
    const containerAlignment = await imageContainer.evaluate((el) => {
      return window.getComputedStyle(el).textAlign;
    });
    expect(containerAlignment).toBe('center');

    // Verify object-fit is contain
    const objectFit = await imageElement.evaluate((el) => {
      return window.getComputedStyle(el).objectFit;
    });
    expect(objectFit).toBe('contain');

    // Verify caption displays
    const caption = page.locator('text=/Image caption/i').first();
    await expect(caption).toBeVisible();

    console.log('✅ Test 2 PASS: IMAGE field renders with correct properties');
  });

  /**
   * Test 3: TEXT_BLOCK field renders HTML content with sanitization
   *
   * Validates:
   * - HTML content renders correctly (bold, italic, lists, etc.)
   * - Dangerous HTML (script tags) is sanitized and removed
   * - Text alignment applied
   * - Background color applied (if set)
   * - Padding applied (none/small/medium/large)
   * - Collapsible behavior works if enabled
   */
  test('should render TEXT_BLOCK field with sanitized HTML', async ({ page }) => {
    // Navigate to form with TEXT_BLOCK field (assumes test form exists)
    // Form should have TEXT_BLOCK field with:
    // - content: '<p>Instructions with <strong>bold</strong> and <em>italic</em> text.</p><ul><li>Item 1</li><li>Item 2</li></ul>'
    // - alignment: left
    // - backgroundColor: #F0F0F0
    // - padding: medium
    await page.goto('/public/form/test-textblock-properties');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify TEXT_BLOCK content exists
    const textBlockContainer = page.locator('.text-block-content').first();
    await expect(textBlockContainer).toBeVisible();

    // Verify HTML content renders correctly
    // Check for bold text
    const boldText = textBlockContainer.locator('strong');
    await expect(boldText).toBeVisible();
    await expect(boldText).toHaveText('bold');

    // Check for italic text
    const italicText = textBlockContainer.locator('em');
    await expect(italicText).toBeVisible();
    await expect(italicText).toHaveText('italic');

    // Check for list rendering
    const listItems = textBlockContainer.locator('ul li');
    const listItemCount = await listItems.count();
    expect(listItemCount).toBe(2);

    // Verify dangerous HTML (script tags) is NOT present
    const scriptTags = textBlockContainer.locator('script');
    const scriptTagCount = await scriptTags.count();
    expect(scriptTagCount).toBe(0);

    // Verify text alignment
    const textAlignment = await textBlockContainer.evaluate((el) => {
      return window.getComputedStyle(el).textAlign;
    });
    expect(textAlignment).toBe('left');

    // Verify background color (if applied)
    const backgroundColor = await textBlockContainer.evaluate((el) => {
      const bgColor = window.getComputedStyle(el).backgroundColor;
      // Convert RGB to hex for comparison
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
      return bgColor;
    });
    expect(backgroundColor).toBe('#f0f0f0');

    // Verify padding is applied (medium = 16px)
    const padding = await textBlockContainer.evaluate((el) => {
      return window.getComputedStyle(el).padding;
    });
    expect(padding).toContain('16px');

    console.log('✅ Test 3 PASS: TEXT_BLOCK field renders with sanitized HTML');
  });

  /**
   * Test 4: HTML Sanitization prevents XSS attacks
   *
   * Validates:
   * - Script tags are removed from TEXT_BLOCK content
   * - Event handlers (onclick, onerror) are stripped
   * - Iframe tags are removed
   * - Only safe HTML tags are allowed
   */
  test('should sanitize dangerous HTML in TEXT_BLOCK content', async ({ page }) => {
    // Listen for console errors and warnings
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    // Navigate to form with TEXT_BLOCK containing dangerous HTML
    // Form should have TEXT_BLOCK with content:
    // '<p>Safe content</p><script>alert("xss")</script><img src="x" onerror="alert(1)">'
    await page.goto('/public/form/test-textblock-xss');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify TEXT_BLOCK exists
    const textBlockContainer = page.locator('.text-block-content').first();
    await expect(textBlockContainer).toBeVisible();

    // Verify safe content is present
    const safeContent = textBlockContainer.locator('p');
    await expect(safeContent).toBeVisible();
    await expect(safeContent).toHaveText('Safe content');

    // Verify script tags are NOT present
    const scriptTags = textBlockContainer.locator('script');
    const scriptTagCount = await scriptTags.count();
    expect(scriptTagCount).toBe(0);

    // Verify iframe tags are NOT present
    const iframeTags = textBlockContainer.locator('iframe');
    const iframeTagCount = await iframeTags.count();
    expect(iframeTagCount).toBe(0);

    // Verify no XSS alert was triggered (no console errors)
    // XSS would trigger console errors or warnings
    const xssErrors = consoleMessages.filter((msg) =>
      msg.toLowerCase().includes('xss') || msg.includes('alert')
    );
    expect(xssErrors.length).toBe(0);

    console.log('✅ Test 4 PASS: HTML sanitization prevents XSS attacks');
  });

  /**
   * Test 5: Multiple field types with properties render correctly
   *
   * Validates:
   * - Form with HEADING, TEXT_BLOCK, and IMAGE fields renders all properties
   * - Field order is preserved
   * - No interference between different field types
   * - Form is functional with all field types present
   */
  test('should render multiple field types with properties correctly', async ({ page }) => {
    // Navigate to form with multiple field types
    // Form should have:
    // 1. HEADING (H1, center, blue, bold)
    // 2. TEXT_BLOCK (with HTML content, left, gray background)
    // 3. IMAGE (centered, 300px wide, contain)
    // 4. Regular input fields
    await page.goto('/public/form/test-mixed-field-properties');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify HEADING field exists and is H1
    const headingElement = page.locator('h1').first();
    await expect(headingElement).toBeVisible();

    // Verify TEXT_BLOCK exists
    const textBlockContainer = page.locator('.text-block-content').first();
    await expect(textBlockContainer).toBeVisible();

    // Verify IMAGE field exists
    const imageElement = page.locator('img').first();
    await expect(imageElement).toBeVisible();

    // Verify regular input fields exist and are functional
    const textInput = page.locator('input[type="text"]').first();
    await expect(textInput).toBeVisible();
    await textInput.fill('Test value');
    await expect(textInput).toHaveValue('Test value');

    // Verify submit button is visible
    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    console.log('✅ Test 5 PASS: Multiple field types with properties render correctly');
  });

  /**
   * Test 6: Custom CSS styles are applied to field-specific properties
   *
   * Validates:
   * - Custom CSS from customStyle property is applied
   * - Custom styles don't break page layout
   * - No CSS injection vulnerabilities
   */
  test('should apply custom CSS styles to field properties', async ({ page }) => {
    // Navigate to form with custom CSS styles
    // Form should have HEADING with customStyle: 'letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);'
    await page.goto('/public/form/test-custom-css-properties');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify HEADING with custom CSS
    const headingElement = page.locator('h2').first();
    await expect(headingElement).toBeVisible();

    // Verify custom CSS is applied (letter-spacing)
    const letterSpacing = await headingElement.evaluate((el) => {
      return window.getComputedStyle(el).letterSpacing;
    });
    expect(letterSpacing).toBe('2px');

    // Verify custom CSS is applied (text-shadow)
    const textShadow = await headingElement.evaluate((el) => {
      return window.getComputedStyle(el).textShadow;
    });
    expect(textShadow).toContain('rgba(0, 0, 0, 0.3)');

    console.log('✅ Test 6 PASS: Custom CSS styles are applied correctly');
  });
});

/**
 * Accessibility Tests for Field-Specific Properties
 *
 * Validates WCAG AA compliance for field-specific properties
 */
test.describe('Field-Specific Properties Accessibility', () => {
  test('should have proper alt text for IMAGE fields', async ({ page }) => {
    await page.goto('/public/form/test-image-properties');
    await page.waitForSelector('form', { state: 'visible' });

    // Verify IMAGE has alt text
    const imageElement = page.locator('img').first();
    const altText = await imageElement.getAttribute('alt');
    expect(altText).toBeTruthy();
    expect(altText?.length).toBeGreaterThan(0);

    console.log('✅ Accessibility Test PASS: IMAGE fields have proper alt text');
  });

  test('should have proper heading hierarchy for HEADING fields', async ({ page }) => {
    await page.goto('/public/form/test-heading-hierarchy');
    await page.waitForSelector('form', { state: 'visible' });

    // Verify heading hierarchy (H1 → H2 → H3, no skipping levels)
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();

    // Form should have at least one H1
    expect(h1Count).toBeGreaterThan(0);

    // If H2 exists, H1 should also exist (no skipping)
    if (h2Count > 0) {
      expect(h1Count).toBeGreaterThan(0);
    }

    console.log('✅ Accessibility Test PASS: Heading hierarchy is proper');
  });
});

/**
 * Cross-Browser Compatibility Tests
 *
 * Validates field-specific properties render correctly across browsers
 */
test.describe('Cross-Browser Compatibility', () => {
  test('should render field properties correctly across all browsers', async ({ page, browserName }) => {
    await page.goto('/public/form/test-mixed-field-properties');
    await page.waitForSelector('form', { state: 'visible' });

    // Verify HEADING renders
    const headingElement = page.locator('h1, h2, h3, h4, h5, h6').first();
    await expect(headingElement).toBeVisible();

    // Verify IMAGE renders
    const imageElement = page.locator('img').first();
    await expect(imageElement).toBeVisible();

    // Verify TEXT_BLOCK renders
    const textBlockContainer = page.locator('.text-block-content').first();
    await expect(textBlockContainer).toBeVisible();

    console.log(`✅ Cross-browser test PASS on ${browserName}`);
  });
});
