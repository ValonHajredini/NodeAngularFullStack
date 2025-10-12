# Epic 12: Advanced Canvas Elements & Background Customization

**Epic ID:** 12 **Epic Title:** Advanced Canvas Elements & Background Customization - Brownfield
Enhancement **Status:** Planning **Priority:** Medium **Related Epics:** Epic 10 (Form Builder),
Epic 11 (In-Place Field Editing)

---

## Epic Goal

Extend the Form Builder field palette with non-input structural elements (groups, backgrounds,
custom HTML/CSS) to enable richer form layouts and visual customization capabilities.

---

## Epic Description

### Existing System Context

- **Current functionality:** Field palette displays 12 standard form field types
- **Technology stack:**
  - `FormFieldType` enum in `@nodeangularfullstack/shared/types/forms.types.ts`
  - `field-palette.component.ts` renders available field types
  - `form-canvas.component.ts` displays fields in configurable grid layout (1-3 columns)
  - `form-settings.component.ts` manages layout (columns, spacing)
- **Integration points:**
  - Shared types package for type definitions
  - FormBuilderService for state management
  - Backend schema validation in Express.js API
  - PostgreSQL storage for form metadata and schema

### Enhancement Details

#### What's being added/changed:

- **New field types in `FormFieldType` enum:**
  - `GROUP` - Container element to visually organize related fields
  - `BACKGROUND_IMAGE` - Background image element with URL/upload support
  - `BACKGROUND_CUSTOM` - Custom HTML/CSS element for canvas styling
- **Extended field palette** with new structural element types
- **Specialized rendering logic** for non-input elements in canvas
- **Custom property editors** for background and group configuration
- **XSS protection** for custom HTML/CSS input

#### How it integrates:

1. Extend `FormFieldType` enum in shared package (`packages/shared/src/types/forms.types.ts`)
2. Add new field types to `field-palette.component.ts` with appropriate icons
3. Implement rendering logic in `form-canvas.component.ts` for structural elements
4. Create specialized property editors for:
   - Group settings (title, border style, collapsible)
   - Background image (URL, upload, positioning)
   - Custom HTML/CSS (code editor with sanitization)
5. Store configuration in `FormField` interface using existing `metadata` field or new optional
   properties
6. Update backend schema validation to accept new field types

#### Success criteria:

1. Users can add group, background image, and custom background elements from palette
2. Group elements visually contain/organize child fields
3. Background elements apply styling to form canvas preview
4. Custom HTML/CSS input is sanitized to prevent XSS attacks
5. New elements export correctly in form schema and persist to database
6. Published forms render new elements on public form pages

---

## Stories

### Story 1: Group Element Implementation

**Goal:** Add group container element to organize related fields visually

**Tasks:**

- Add `GROUP = 'group'` to `FormFieldType` enum in shared package
- Create group field palette entry with icon (`pi-objects-column`)
- Implement group container rendering in `form-canvas.component.ts`:
  - Visual border/card container
  - Group title/label display
  - Optional collapse/expand functionality
- Support nesting fields within groups:
  - Add optional `parentGroupId` property to `FormField`
  - Update field ordering logic to respect group hierarchy
- Create group-specific properties panel:
  - Group title input
  - Border style selector (solid, dashed, none)
  - Collapsible toggle
  - Background color picker
- Build `npm --workspace=packages/shared run build` and verify shared types

**Acceptance Criteria:**

- ✅ GROUP type available in field palette
- ✅ Group elements render as visual containers in canvas
- ✅ Fields can be dragged into groups (become children)
- ✅ Group properties configurable (title, border, collapsible)
- ✅ Groups save/load correctly in form schema
- ✅ Published forms display grouped fields appropriately
- ✅ Unit tests for group rendering and nesting logic

---

### Story 2: Background Image Element

**Goal:** Enable background image customization for form canvas

**Tasks:**

- Add `BACKGROUND_IMAGE = 'background-image'` to `FormFieldType` enum
- Create background image palette entry with icon (`pi-image`)
- Implement background image property editor:
  - Image URL input field
  - File upload button (integrate with existing avatar upload service if available)
  - Positioning options (cover, contain, repeat, no-repeat)
  - Opacity slider (0-100%)
  - Alignment selector (top, center, bottom)
- Apply background image to canvas preview area:
  - Use CSS `background-image` with configured properties
  - Ensure fields remain readable (apply overlay if needed)
- Store image URL and settings in field metadata:
  ```typescript
  {
    type: FormFieldType.BACKGROUND_IMAGE,
    metadata: {
      imageUrl: string,
      position: 'cover' | 'contain' | 'repeat',
      opacity: number,
      alignment: 'top' | 'center' | 'bottom'
    }
  }
  ```
- Implement image upload to DigitalOcean Spaces (if Epic 6 integration available)

**Acceptance Criteria:**

- ✅ BACKGROUND_IMAGE type available in field palette
- ✅ Users can upload or enter URL for background image
- ✅ Image applies to canvas preview with configured positioning
- ✅ Positioning and opacity controls work correctly
- ✅ Background image persists in form schema
- ✅ Published forms display background image
- ✅ Integration tests verify image upload and storage

---

### Story 3: Custom HTML/CSS Background Element

**Goal:** Provide advanced customization via HTML/CSS code editor with XSS protection

**Tasks:**

- Add `BACKGROUND_CUSTOM = 'background-custom'` to `FormFieldType` enum
- Create custom background palette entry with icon (`pi-code`)
- Implement code editor for HTML/CSS input:
  - Integrate Monaco Editor or CodeMirror component
  - Syntax highlighting for HTML and CSS
  - Live preview toggle
- **Security implementation (CRITICAL):**
  - Install and configure DOMPurify library (`npm install dompurify @types/dompurify`)
  - Sanitize HTML input before rendering:
    ```typescript
    import DOMPurify from 'dompurify';
    const clean = DOMPurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: ['div', 'span', 'p', 'style'],
      ALLOWED_ATTR: ['class', 'id', 'style'],
    });
    ```
  - Implement Content Security Policy (CSP) headers in backend
  - Render custom HTML in sandboxed iframe for preview
- Store HTML/CSS in field metadata:
  ```typescript
  {
    type: FormFieldType.BACKGROUND_CUSTOM,
    metadata: {
      html: string,
      css: string
    }
  }
  ```
- Apply sanitized HTML/CSS to canvas preview area
- Implement validation and error handling for invalid CSS

**Acceptance Criteria:**

- ✅ BACKGROUND_CUSTOM type available in field palette
- ✅ Code editor renders with syntax highlighting
- ✅ HTML input is sanitized with DOMPurify before preview
- ✅ CSS applies to canvas preview without breaking layout
- ✅ Live preview shows custom background changes
- ✅ Invalid CSS/HTML shows validation errors
- ✅ Custom backgrounds persist in form schema
- ✅ **Security audit confirms no XSS vulnerabilities**
- ✅ Published forms render custom backgrounds safely
- ✅ Integration tests verify sanitization and CSP enforcement

---

## Compatibility Requirements

- [x] Existing `FormFieldType` values remain unchanged (additive only)
- [x] New field types are optional - existing forms continue working
- [x] `FormField` interface extended via optional `metadata` property
- [x] Backend schema validation updated to accept new field types
- [x] Published forms render new elements correctly
- [x] Form renderer component (`form-renderer.component.ts`) handles new types gracefully

---

## Risk Mitigation

**Primary Risk:** Custom HTML/CSS injection creating XSS vulnerabilities

**Mitigation Strategy:**

1. **Input Sanitization:**
   - Use DOMPurify with strict whitelist configuration
   - Remove all `<script>`, `<iframe>`, `<object>`, `<embed>` tags
   - Strip event handlers (`onclick`, `onerror`, etc.)

2. **Sandboxed Rendering:**
   - Render custom HTML in sandboxed iframe with restrictive `sandbox` attribute
   - Disable JavaScript execution in custom background preview

3. **Content Security Policy:**
   - Implement CSP headers:
     `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
   - Block inline scripts globally

4. **Backend Validation:**
   - Server-side sanitization before storing in database
   - Rate limiting on form save endpoints

5. **Security Testing:**
   - Automated XSS vulnerability scanning
   - Manual penetration testing with common XSS payloads
   - Include XSS test cases in integration test suite

**Rollback Plan:**

- Remove new field types from palette UI
- Hide background customization features via feature flag
- Revert shared package type changes
- Database migration to remove custom background data if needed

---

## Definition of Done

- [x] All 3 new element types (GROUP, BACKGROUND_IMAGE, BACKGROUND_CUSTOM) available in palette
- [x] Group elements organize fields with visual containers and nesting support
- [x] Background image applies to canvas preview with configurable options (position, opacity)
- [x] Custom HTML/CSS editor provides live preview with comprehensive XSS protection
- [x] New elements save and load correctly in form schema
- [x] Backend API validates and stores new field types
- [x] Published forms render new elements on public form pages
- [x] **Security audit confirms no XSS vulnerabilities** (CRITICAL)
- [x] Unit tests cover new field type rendering
- [x] Integration tests cover:
  - Group nesting and field organization
  - Background image upload and display
  - Custom HTML/CSS sanitization and injection prevention
- [x] User documentation updated with new element capabilities
- [x] Accessibility standards met (keyboard navigation, screen reader support)

---

## Technical Notes

### Type Extensions

**packages/shared/src/types/forms.types.ts:**

```typescript
export enum FormFieldType {
  // ... existing types
  GROUP = 'group',
  BACKGROUND_IMAGE = 'background-image',
  BACKGROUND_CUSTOM = 'background-custom',
}

export interface FormField {
  // ... existing properties
  parentGroupId?: string; // For group nesting
  metadata?: {
    // Group settings
    groupTitle?: string;
    groupBorderStyle?: 'solid' | 'dashed' | 'none';
    groupCollapsible?: boolean;
    groupBackgroundColor?: string;

    // Background image settings
    imageUrl?: string;
    imagePosition?: 'cover' | 'contain' | 'repeat';
    imageOpacity?: number;
    imageAlignment?: 'top' | 'center' | 'bottom';

    // Custom HTML/CSS settings
    html?: string;
    css?: string;
  };
}
```

### Security Configuration

**Backend CSP Headers (apps/api/src/middleware/security.ts):**

```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:;"
  );
  next();
});
```

**Frontend Sanitization (apps/web/src/app/shared/utils/sanitizer.ts):**

```typescript
import DOMPurify from 'dompurify';

export function sanitizeCustomBackground(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'style'],
    ALLOWED_ATTR: ['class', 'id', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover'],
  });
}
```

---

## Dependencies

- **Blocks:** None
- **Blocked By:** Epic 10 completion (Form Builder foundation)
- **Related:**
  - Epic 11 (In-Place Field Editing) - shares canvas rendering updates
  - Epic 6 (DigitalOcean Avatar Storage) - optional integration for image upload

---

## Estimated Effort

- **Story 1 (Group Element):** 4 days (type extension + rendering + nesting logic)
- **Story 2 (Background Image):** 3 days (upload + property editor + rendering)
- **Story 3 (Custom HTML/CSS):** 5 days (code editor + sanitization + security testing)
- **Total:** 12 days (2.5 weeks)

---

## Handoff Notes for Story Manager

"This epic extends the Form Builder with advanced layout and customization capabilities. Critical
considerations:

1. **Type System Extensions:** All changes to shared types require rebuilding the shared package
2. **Backward Compatibility:** New field types are additive - existing forms must continue working
3. **Security (Story 3 - HIGHEST PRIORITY):**
   - Custom HTML/CSS poses significant XSS risk
   - Implement defense-in-depth: sanitization + CSP + sandboxing
   - Security testing is MANDATORY before release
4. **Integration Testing:** Verify new elements work in:
   - Form builder preview
   - Published public forms
   - Form renderer component
5. **Backend Validation:** Update API validators to accept new field types

Each story must include verification that existing forms load without migration and that new
elements integrate seamlessly with the existing Form Builder UI."
