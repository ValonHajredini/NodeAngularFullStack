# Epic 15: Content Display Field Types - Brownfield Enhancement

## Epic Goal

Add three new non-input field types to the form builder that enable form creators to add rich
content displays: a **heading/title field** to show section titles, an **image field** to display
images in published forms, and a **text block field** to show large explanatory text or instructions
to form respondents.

## Epic Description

### Existing System Context

**Current relevant functionality:**

- Form builder supports 11 interactive input field types (text, email, number, select, textarea,
  file, checkbox, radio, date, datetime, toggle)
- Field types defined in `packages/shared/src/types/forms.types.ts` using `FormFieldType` enum
- Form renderer (`apps/web/src/app/features/public/form-renderer/`) dynamically renders fields based
  on type
- Form builder canvas (`apps/web/src/app/features/tools/components/form-builder/form-canvas/`)
  displays field previews
- Field palette (`apps/web/src/app/features/tools/components/form-builder/field-palette/`) shows
  draggable field type options
- Row-based layout system supports multi-column arrangements with drag-and-drop positioning

**Technology stack:**

- Frontend: Angular 20+ with standalone components, PrimeNG 17+, Tailwind CSS
- Backend: Express.js + TypeScript, PostgreSQL 15+ with JSONB for schema storage
- State: NgRx Signals for reactive state management
- Shared types: @nodeangularfullstack/shared package

**Integration points:**

- Type definitions in shared package (consumed by frontend and backend)
- Field palette component (add new field types to palette)
- Form canvas component (render field previews in builder)
- Public form renderer (render fields on published forms)
- Field properties modal (configure field-specific properties)
- Database schema_json column (store field configurations)

### Enhancement Details

**What's being added/changed:**

Add three new **non-input display field types** that don't collect user data but enhance form
presentation:

1. **HEADING Field Type:**
   - Displays styled heading/title text (configurable H1-H6 or custom styles)
   - Use case: Section titles, form headers, instructions titles
   - Properties: heading text, heading level (H1-H6), text alignment, custom styling options
   - Rendering: Non-interactive heading element in published form

2. **IMAGE Field Type:**
   - Displays an image uploaded by form creator
   - Use case: Logos, banners, product images, instructional diagrams, branding
   - Properties: image URL/upload, alt text, width/height, alignment, caption (optional)
   - Rendering: Responsive image element with accessibility attributes
   - Storage: Image uploaded via existing file storage mechanism (DO Spaces compatible)

3. **TEXT_BLOCK Field Type:**
   - Displays large blocks of formatted text/HTML content for explanations
   - Use case: Form instructions, terms & conditions, detailed explanations, disclaimers
   - Properties: rich text content (supports basic HTML/Markdown), text alignment, background color,
     padding/spacing
   - Rendering: Formatted text block with HTML sanitization for security
   - Editor: Rich text editor or markdown editor in field properties modal

**How it integrates:**

- **Type System:** Add three new enum values to `FormFieldType` in shared package
- **Field Palette:** Add new field type buttons to palette component with appropriate icons
- **Form Canvas:** Render static preview versions in builder (show placeholder content)
- **Field Properties:** Extend field properties modal to show type-specific configuration panels
- **Form Renderer:** Add rendering logic for each new type in public form renderer component
- **Validation:** These fields don't require validation (non-input), but need content validation
  (e.g., image URL exists, text not empty)
- **Database:** Existing JSONB schema_json column stores all field configurations (no schema changes
  needed)

**Success criteria:**

1. Form creators can drag the three new field types from palette to canvas
2. Each field type shows appropriate preview in form builder
3. Field properties modal allows configuring type-specific properties
4. Published forms correctly render all three field types with proper styling
5. IMAGE field supports image upload and displays images responsively
6. TEXT_BLOCK field renders rich text/HTML with proper sanitization (security)
7. HEADING field renders with correct semantic HTML (H1-H6 tags)
8. All fields work correctly within row-based layout system (multi-column support)
9. Fields are properly saved/loaded from database (no data loss on reload)
10. Backward compatibility: existing forms without these fields continue working

## Stories

### Story 1: Add HEADING Field Type for Section Titles

**Description:** Implement a non-input HEADING field type that allows form creators to add styled
heading/title text to forms. This enables better form organization with section titles, headers, and
instructional titles.

**Implementation:**

- Add `HEADING = 'heading'` to `FormFieldType` enum in shared types
- Add heading field to field palette with heading icon
- Implement heading preview in form canvas (shows heading text with size preview)
- Create heading configuration panel in field properties modal (text, heading level H1-H6,
  alignment, styling)
- Implement heading rendering in public form renderer (semantic HTML with proper heading tags)
- Heading is non-interactive and doesn't collect data (excluded from form submission)

**Acceptance Criteria:**

- [ ] HEADING type added to FormFieldType enum
- [ ] Heading field appears in field palette
- [ ] Dragging heading field creates new heading in canvas
- [ ] Heading preview shows configured text and size in builder
- [ ] Field properties modal allows configuring: heading text, level (H1-H6), alignment, text color,
      font size
- [ ] Published form renders heading with semantic HTML (`<h1>` - `<h6>` tags)
- [ ] Heading excluded from form validation and submission data
- [ ] Heading works in both global and row-based layouts

### Story 2: Add IMAGE Field Type for Visual Content Display

**Description:** Implement a non-input IMAGE field type that allows form creators to upload and
display images in forms. This enables branding, visual instructions, product images, and improved
form aesthetics.

**Implementation:**

- Add `IMAGE = 'image'` to `FormFieldType` enum in shared types
- Add image field to field palette with image icon
- Implement image preview in form canvas (shows thumbnail or placeholder)
- Create image configuration panel in field properties modal:
  - Image upload mechanism (reuse existing file upload service)
  - Image URL input (alternative to upload)
  - Alt text for accessibility
  - Width/height controls (percentage or fixed pixels)
  - Alignment options (left, center, right)
  - Optional caption text
- Implement image rendering in public form renderer (responsive `<img>` tag with alt text)
- Handle image storage (use existing DO Spaces compatible file storage)
- Image is non-interactive and doesn't collect data

**Acceptance Criteria:**

- [ ] IMAGE type added to FormFieldType enum
- [ ] Image field appears in field palette
- [ ] Dragging image field creates new image placeholder in canvas
- [ ] Image preview shows uploaded image or placeholder in builder
- [ ] Field properties modal allows:
  - Uploading image file (max 5MB, common formats: jpg, png, gif, webp)
  - OR entering image URL
  - Setting alt text (required for accessibility)
  - Configuring width/height (responsive by default)
  - Setting alignment (left, center, right, full width)
  - Adding optional caption
- [ ] Published form displays image responsively (max-width 100%, maintains aspect ratio)
- [ ] Image has proper alt text for screen readers
- [ ] Image excluded from form validation and submission data
- [ ] Image works in both global and row-based layouts
- [ ] Image loads asynchronously with loading state/placeholder

### Story 3: Add TEXT_BLOCK Field Type for Explanatory Content

**Description:** Implement a non-input TEXT_BLOCK field type that allows form creators to add large
blocks of formatted text, instructions, or explanations to forms. This enables detailed
instructions, terms & conditions, disclaimers, and rich contextual information.

**Implementation:**

- Add `TEXT_BLOCK = 'text_block'` to `FormFieldType` enum in shared types
- Add text block field to field palette with document/text icon
- Implement text block preview in form canvas (shows first few lines with "Read more..." indicator)
- Create text block configuration panel in field properties modal:
  - Rich text editor or markdown editor for content input
  - Support basic HTML formatting (headings, bold, italic, lists, links)
  - Text alignment options
  - Background color picker (optional)
  - Padding/spacing controls
- Implement text block rendering in public form renderer:
  - Render formatted HTML content
  - Apply HTML sanitization (DOMPurify or similar) for XSS prevention
  - Support collapsible content for very long blocks (optional "Read more" expansion)
- Text block is non-interactive and doesn't collect data

**Acceptance Criteria:**

- [ ] TEXT_BLOCK type added to FormFieldType enum
- [ ] Text block field appears in field palette
- [ ] Dragging text block field creates new text block in canvas
- [ ] Text block preview shows first 3-5 lines with truncation indicator in builder
- [ ] Field properties modal provides:
  - Rich text editor with toolbar (bold, italic, underline, lists, headings, links)
  - OR Markdown editor with live preview
  - Text alignment controls (left, center, right, justify)
  - Optional background color picker
  - Padding/spacing controls (none, small, medium, large)
- [ ] Published form renders formatted text with proper HTML structure
- [ ] HTML content is sanitized to prevent XSS attacks (whitelist safe tags/attributes)
- [ ] Text block supports links that open in new tabs (with `rel="noopener noreferrer"`)
- [ ] Long text blocks (>500 words) show "Read more" expansion option
- [ ] Text block excluded from form validation and submission data
- [ ] Text block works in both global and row-based layouts
- [ ] Text block responsive on mobile (proper line breaks, no horizontal scroll)

## Compatibility Requirements

- [x] Existing APIs remain unchanged (no breaking changes to form APIs)
- [x] Database schema changes are backward compatible (uses existing JSONB schema_json column)
- [x] UI changes follow existing patterns (field palette, canvas, properties modal pattern)
- [x] Performance impact is minimal (static display fields, no complex interactions)
- [x] Existing field types continue working without modification
- [x] Forms without new field types remain fully functional

## Risk Mitigation

**Primary Risks:**

1. **XSS Vulnerability in TEXT_BLOCK:** Rich text/HTML content could introduce cross-site scripting
   vulnerabilities if not properly sanitized
   - **Mitigation:** Use industry-standard HTML sanitization library (DOMPurify) with strict
     whitelist of allowed tags/attributes
   - **Testing:** Security testing with malicious HTML payloads to verify sanitization works

2. **Image Storage Costs:** Storing many large images could increase storage costs
   - **Mitigation:** Enforce file size limits (5MB max), image optimization/compression on upload,
     CDN caching
   - **Monitoring:** Track storage usage and set up alerts for unusual growth

3. **Rendering Performance:** Many IMAGE or TEXT_BLOCK fields on single form could impact page load
   performance
   - **Mitigation:** Lazy-load images below fold, compress images, limit TEXT_BLOCK content length
     with pagination
   - **Testing:** Performance testing with forms containing 10+ display fields

4. **Accessibility Regression:** Improper implementation could harm accessibility (missing alt text,
   improper heading hierarchy)
   - **Mitigation:** Enforce alt text requirement for images, validate heading hierarchy (no H1
     after H3), ARIA labels
   - **Testing:** Accessibility audit with screen readers, WCAG 2.1 AA compliance validation

**Rollback Plan:**

- New field types use same infrastructure as existing fields (low risk)
- If issues arise: disable new field types in field palette (prevent creation of new fields)
- Existing forms with new fields can remain published (display fields are read-only, low risk)
- Database rollback not needed (JSONB schema is flexible, unknown field types simply ignored by old
  code)
- Feature flag approach: add `ENABLE_DISPLAY_FIELDS` flag to disable new types if needed

## Definition of Done

- [x] All three stories completed with acceptance criteria met
- [x] Existing form builder functionality verified through regression testing
- [x] Integration points working correctly:
  - Field palette shows new field types
  - Form canvas renders field previews
  - Field properties modal configures type-specific properties
  - Public form renderer displays fields correctly
  - Database saves/loads field configurations
- [x] Documentation updated:
  - FormFieldType enum documented in shared types
  - Field rendering logic documented in form renderer
  - Security considerations documented for TEXT_BLOCK sanitization
- [x] No regression in existing features:
  - Existing 11 field types work as before
  - Row-based layout system unaffected
  - Form publishing workflow unchanged
  - Form submission and validation unchanged
- [x] Security validated:
  - TEXT_BLOCK HTML sanitization tested with malicious payloads
  - IMAGE file upload validates file types and sizes
  - No XSS vulnerabilities introduced
- [x] Accessibility validated:
  - IMAGE fields require alt text
  - HEADING fields use semantic HTML tags
  - TEXT_BLOCK content is screen reader accessible
  - WCAG 2.1 AA compliance maintained
- [x] Performance validated:
  - Form load times not significantly impacted (< 100ms increase)
  - Image lazy-loading works correctly
  - Large TEXT_BLOCK content doesn't cause layout issues

---

## Handoff Notes

This brownfield epic adds display-only field types to an existing Angular 20+ / Express.js form
builder. Key integration points:

- **Shared Types:** Extend `FormFieldType` enum in `packages/shared/src/types/forms.types.ts`
- **Field Palette:** Add new field types to
  `apps/web/src/app/features/tools/components/form-builder/field-palette/`
- **Form Canvas:** Update `apps/web/src/app/features/tools/components/form-builder/form-canvas/` to
  render previews
- **Field Properties:** Extend
  `apps/web/src/app/features/tools/components/form-builder/field-properties/` modal
- **Form Renderer:** Update `apps/web/src/app/features/public/form-renderer/` to render new types
- **Existing Pattern:** Follow pattern used for existing field types (TEXT, EMAIL, SELECT, etc.)

**Critical Compatibility Requirements:**

- These fields are display-only (don't participate in form submission)
- Must work in row-based layout system (drag-drop positioning)
- TEXT_BLOCK requires HTML sanitization (security critical)
- IMAGE requires file upload integration (use existing storage mechanism)
- Backward compatibility: old forms without these fields must continue working

**Verification for each story:** Ensure no regression in existing form builder features,
particularly row layout persistence (known issue to watch for).
