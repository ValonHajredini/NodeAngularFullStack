# Epic 15: Content Display Field Types - Implementation Summary

**Status:** Ready for Implementation **Created:** 2025-10-09 **Epic File:**
`docs/prd/epic-15-content-display-fields.md`

---

## Quick Links

### Epic & Stories

- **Epic:** [epic-15-content-display-fields.md](./epic-15-content-display-fields.md)
- **Story 15.1:** [15.1-heading-field-type.md](../stories/15.1-heading-field-type.md) - HEADING
  Field (Section Titles)
- **Story 15.2:** [15.2-image-field-type.md](../stories/15.2-image-field-type.md) - IMAGE Field
  (Visual Content)
- **Story 15.3:** [15.3-text-block-field-type.md](../stories/15.3-text-block-field-type.md) -
  TEXT_BLOCK Field (Explanatory Content)

---

## Epic Overview

Add three new **non-input display field types** to the form builder that enable form creators to add
rich content:

| Field Type     | Purpose                | Complexity | Est. Effort |
| -------------- | ---------------------- | ---------- | ----------- |
| **HEADING**    | Section titles (H1-H6) | Low        | 6-8 hours   |
| **IMAGE**      | Visual content display | Medium     | 8-10 hours  |
| **TEXT_BLOCK** | Rich text explanations | High       | 8-10 hours  |

**Total Estimated Effort:** 22-28 hours (3-4 days)

---

## Implementation Order

### Phase 1: Foundation (Story 15.1)

**Story:** HEADING Field Type **Why First:** Simplest field type, establishes display field pattern
**Key Deliverables:**

- Display field pattern established
- Non-input field lifecycle proven
- FormBuilderService handling for display fields
- Field exclusion from form submission working

### Phase 2: File Handling (Story 15.2)

**Story:** IMAGE Field Type **Why Second:** Introduces file upload complexity, builds on display
field pattern **Key Deliverables:**

- Image upload endpoint implemented
- File storage integration working
- Responsive image rendering proven
- Loading/error state handling established

### Phase 3: Security Critical (Story 15.3)

**Story:** TEXT_BLOCK Field Type **Why Last:** Most complex due to HTML sanitization security
requirements **Key Deliverables:**

- HTML sanitization implemented (XSS prevention)
- Rich text editor integrated
- Collapsible content working
- Security testing completed

---

## Technical Architecture

### Type System Changes

**File:** `packages/shared/src/types/forms.types.ts`

```typescript
export enum FormFieldType {
  // Existing types...
  TEXT = 'text',
  EMAIL = 'email',
  // ... other existing types ...

  // New display field types (Epic 15)
  HEADING = 'heading', // Story 15.1
  IMAGE = 'image', // Story 15.2
  TEXT_BLOCK = 'text_block', // Story 15.3
}

// New metadata interfaces
interface HeadingMetadata {
  headingLevel: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  alignment: 'left' | 'center' | 'right';
  color?: string;
  fontWeight?: 'normal' | 'bold';
}

interface ImageMetadata {
  imageUrl?: string;
  altText: string; // Required for accessibility
  width?: number | string;
  height?: number | string;
  alignment?: 'left' | 'center' | 'right' | 'full';
  caption?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}

interface TextBlockMetadata {
  content: string; // HTML content (sanitized)
  alignment?: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  collapsible?: boolean;
  collapsed?: boolean;
}
```

### Integration Points

**Frontend Components:**

1. **Field Palette** (`field-palette.component.*`)
   - Add 3 new field type buttons (HEADING, IMAGE, TEXT_BLOCK)
   - Group under "Display Fields" section

2. **Form Canvas** (`form-canvas.component.*`)
   - Render preview for each new field type
   - HEADING: Show heading text with size
   - IMAGE: Show thumbnail or placeholder
   - TEXT_BLOCK: Show first 3-5 lines truncated

3. **Field Properties Modal** (`field-properties.component.*`)
   - HEADING: Text, level, alignment, color, weight
   - IMAGE: Upload, URL, alt text, dimensions, alignment, caption
   - TEXT_BLOCK: Rich text editor, alignment, background, padding, collapsible

4. **Form Renderer** (`form-renderer.component.*`)
   - Render semantic HTML for each field type
   - Exclude from form validation and submission
   - Apply proper styling and responsive behavior

**Backend Changes:**

- New API endpoint: `POST /api/v1/forms/:formId/upload-image` (Story 15.2)
- File upload validation (type, size)
- S3/DO Spaces integration for image storage

**Services:**

- `HtmlSanitizerService` (Story 15.3) - XSS prevention
- Image upload service (Story 15.2) - File handling

---

## Security Considerations

### Critical: HTML Sanitization (Story 15.3)

**Library:** DOMPurify (`npm install dompurify @types/dompurify`)

**Whitelist Safe Tags:**

- Formatting: `<p>`, `<strong>`, `<em>`, `<u>`, `<s>`, `<br>`
- Headings: `<h3>`, `<h4>`, `<h5>`, `<h6>` (not H1-H2)
- Lists: `<ul>`, `<ol>`, `<li>`
- Blocks: `<blockquote>`
- Links: `<a>` (with `href`, `target`, `rel` attributes)

**Blocked Dangerous Tags:**

- Scripts: `<script>`, `<object>`, `<embed>`, `<iframe>`
- Styles: `<style>` (use properties instead)
- Event handlers: `onclick`, `onerror`, `onload`, etc.
- JavaScript URLs: `javascript:...`

**Testing:** XSS attack vector testing required before release

### Image Upload Security (Story 15.2)

**Validation:**

- File type whitelist: jpg, jpeg, png, gif, webp
- Max file size: 5MB
- MIME type validation (not just extension)
- No executable files allowed

**Storage:**

- S3/DO Spaces (not local filesystem)
- CDN caching for performance
- Proper CORS configuration

---

## Acceptance Criteria Summary

### Must Have (MVP)

**All Stories:**

- [ ] 3 new field types in FormFieldType enum
- [ ] All 3 field types available in field palette
- [ ] Field creation, preview, and configuration working
- [ ] Published forms render all 3 field types correctly
- [ ] Fields excluded from form validation and submission
- [ ] Row layout compatibility (drag-drop, positioning)
- [ ] State persistence (save/load from database)
- [ ] Backward compatibility (existing forms unaffected)

**Story 15.1 (HEADING):**

- [ ] Semantic HTML headings (H1-H6)
- [ ] Text alignment and styling
- [ ] Accessibility validated (heading hierarchy)

**Story 15.2 (IMAGE):**

- [ ] Image upload working with progress indicator
- [ ] Responsive image rendering
- [ ] Alt text required (accessibility)
- [ ] Lazy loading for performance

**Story 15.3 (TEXT_BLOCK):**

- [ ] Rich text editor with safe formatting options
- [ ] HTML sanitization prevents XSS (security critical)
- [ ] Collapsible content for long text
- [ ] Links open safely in new tab

### Nice to Have (Future Enhancements)

- [ ] Image compression/optimization (automatic)
- [ ] Markdown support for TEXT_BLOCK (alternative to HTML)
- [ ] HEADING hierarchy validation (warn on broken hierarchy)
- [ ] Template library for common instructions
- [ ] Image galleries (multiple images in one field)
- [ ] Image cropping/editing in properties modal

---

## Testing Strategy

### Unit Tests (Each Story)

- FormBuilderService field creation
- Field preview rendering in canvas
- Field properties configuration
- Field rendering in public forms
- Field exclusion from validation/submission

### Integration Tests

- End-to-end field creation → save → load → publish → render
- Row layout compatibility
- State persistence across page reloads

### Security Tests (Critical for Story 15.3)

- XSS prevention with malicious HTML payloads
- Script tag injection attempts
- Event handler injection attempts
- JavaScript URL attempts
- Iframe/object/embed injection attempts

### Performance Tests

- Forms with 10+ display fields
- Very long TEXT_BLOCK content (5000 characters)
- Multiple large images (5MB each)
- Page load time impact

### Accessibility Tests

- Screen reader testing (all field types)
- Keyboard navigation
- WCAG 2.1 AA compliance validation
- Semantic HTML validation

---

## Dependencies & Prerequisites

**Before Starting Epic 15:**

- [x] Row layout persistence bug fixed (confirmed fixed)
- [x] FormBuilderService state management working
- [x] Field properties modal infrastructure in place
- [x] Form renderer component working correctly

**External Libraries to Install:**

- [ ] DOMPurify: `npm install dompurify @types/dompurify` (Story 15.3)
- [ ] PrimeNG Editor: Already included in PrimeNG 17+ (Story 15.3)

**Backend Infrastructure:**

- [ ] S3/DO Spaces configuration verified (Story 15.2)
- [ ] File upload middleware (Multer) available (Story 15.2)
- [ ] Image storage service available or needs creation (Story 15.2)

---

## Risk Register

| Risk                               | Impact   | Probability | Mitigation                                                  | Story      |
| ---------------------------------- | -------- | ----------- | ----------------------------------------------------------- | ---------- |
| XSS vulnerability in TEXT_BLOCK    | Critical | Medium      | DOMPurify with strict whitelist, extensive security testing | 15.3       |
| Image storage costs increase       | Medium   | High        | 5MB limit, compression, usage monitoring                    | 15.2       |
| Performance degradation            | Medium   | Low         | Lazy loading, character limits, optimization                | 15.2, 15.3 |
| Accessibility regression           | High     | Low         | Semantic HTML, required alt text, WCAG testing              | All        |
| Broken image links (external URLs) | Low      | Medium      | Show error placeholder, prefer uploads                      | 15.2       |
| Heading hierarchy confusion        | Medium   | Low         | Guidance in UI, validation warnings                         | 15.1       |

---

## Definition of Done (Epic Level)

Epic 15 is complete when:

**Development:**

- [x] All 3 stories (15.1, 15.2, 15.3) completed with acceptance criteria met
- [x] All unit tests passing
- [x] All integration tests passing
- [x] Security tests passing (XSS prevention validated)
- [x] Code reviewed and approved
- [x] TypeScript strict mode compliance

**Quality:**

- [x] No regression in existing form builder features
- [x] Performance validated (no significant page load impact)
- [x] Accessibility validated (WCAG 2.1 AA compliance)
- [x] Security validated (XSS prevention, file upload validation)

**Documentation:**

- [x] JSDoc comments added to all new code
- [x] FormFieldType enum documented
- [x] Security considerations documented (HTML sanitization)
- [x] CLAUDE.md updated with new field types
- [x] API endpoint documented (image upload)

**Deployment:**

- [x] Shared package rebuilt (`npm run build:shared`)
- [x] All workspaces pass typecheck
- [x] All workspaces pass lint
- [x] Build successful (`npm run build`)
- [x] Ready for production deployment

---

## Post-Implementation Checklist

After completing Epic 15:

**Validation:**

- [ ] Create a test form with all 3 new field types
- [ ] Test in form builder (drag-drop, configure, preview)
- [ ] Save form and reload page (persistence check)
- [ ] Publish form and test public rendering
- [ ] Test on mobile devices (responsive behavior)
- [ ] Test with screen reader (accessibility)
- [ ] Test submission (new fields excluded from data)

**Documentation:**

- [ ] Update user documentation (if exists)
- [ ] Create release notes
- [ ] Update CHANGELOG.md
- [ ] Add screenshots to documentation

**Monitoring:**

- [ ] Set up monitoring for image upload errors
- [ ] Set up monitoring for S3/DO Spaces usage
- [ ] Set up alerts for XSS attempts (if detectable)

---

## Team Communication

**Handoff to Development Team:**

"We've created Epic 15 to add 3 new display field types to the form builder: HEADING (section
titles), IMAGE (visual content), and TEXT_BLOCK (rich text explanations).

**Implementation order:** Start with Story 15.1 (HEADING) as it's the simplest and establishes the
display field pattern. Then Story 15.2 (IMAGE) which adds file upload complexity. Finally Story 15.3
(TEXT_BLOCK) which is security-critical due to HTML sanitization requirements.

**Critical security note:** Story 15.3 requires HTML sanitization with DOMPurify to prevent XSS
attacks. This must be thoroughly tested before release.

**Estimated timeline:** 22-28 hours total (3-4 days for one developer, or 1-2 days split across
team).

All detailed requirements, acceptance criteria, and technical implementation notes are in the
individual story files. Let me know if you have questions!"

---

**Epic Created By:** John (Product Manager) **Date:** 2025-10-09 **Priority:** Medium **Target
Release:** TBD
