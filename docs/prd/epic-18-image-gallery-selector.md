# Epic 18: Image Gallery Selector - Brownfield Enhancement

**Status:** Ready for Development **Priority:** High **Estimated Effort:** 19 hours (Story 18.1: 6h,
Story 18.2: 8h, Story 18.3: 5h) **Epic Owner:** Product Manager (John) **Started:** 2025-01-11
**Target Completion:** TBD

---

## Epic Overview

### Epic Goal

Add a new IMAGE_GALLERY field type to the form builder that allows form creators to upload multiple
images and enables end-users to select one image from the gallery (radio button behavior), storing
the selected image key while displaying the selected image prominently.

### Business Value

**Problem:** Form creators need a way for users to make visual selections (product variants,
avatars, design preferences) but currently only have text-based options (radio buttons, dropdowns).

**Solution:** IMAGE_GALLERY field type combines the visual appeal of image display with the
selection behavior of radio buttons.

**Impact:**

- **Enhanced UX:** Visual selection is more engaging than text-based options
- **Use Cases:** Product variant selection, avatar chooser, design preference surveys, visual voting
- **Accessibility:** Full keyboard navigation and screen reader support
- **Mobile-friendly:** Responsive grid layout adapts to screen size

---

## Architecture Context

### Existing System

- **Form Builder:** Angular 20+ with 15 field types (TEXT, EMAIL, SELECT, RADIO, IMAGE, etc.)
- **Field Types:** Defined in `packages/shared/src/types/forms.types.ts`
- **Image Storage:** S3/DO Spaces for uploaded images
- **Submissions:** PostgreSQL `form_submissions` table (values stored as JSON)

### Enhancement Approach

**What's being added:**

1. New `IMAGE_GALLERY` field type (input field, not display element)
2. Shared reusable component for image gallery selector (builder + renderer)
3. Properties panel for managing gallery images (upload, delete, reorder)
4. Public form renderer for end-user selection
5. Form submission storage (selected image key)

**Integration points:**

- Shared types package (`FormFieldType` enum, `ImageGalleryMetadata` interface)
- Field palette (add IMAGE_GALLERY to available fields)
- Form builder canvas (preview component)
- Properties panel (image management UI)
- Public form renderer (interactive selection)
- Form submissions (store selected image key)

**No backend changes required** - IMAGE_GALLERY leverages existing infrastructure.

---

## Stories Breakdown

### Story 18.1: Shared Image Gallery Selector Component (6 hours)

**Purpose:** Create reusable component for displaying image gallery with single-selection behavior.

**Deliverables:**

- `ImageGallerySelectorComponent` (shared component)
- Responsive grid layout (2-4 columns based on screen size)
- Single-selection logic (radio button behavior)
- Keyboard navigation (arrow keys, Space, Enter)
- Accessibility (WCAG AA compliance)
- Unit tests (10+ tests)

**Why first?** Foundation component used by both builder (Story 18.2) and renderer (Story 18.3).

**File:** `docs/stories/story-18.1-shared-image-gallery-selector.md`

---

### Story 18.2: Form Builder Integration (IMAGE_GALLERY Field Type) (8 hours)

**Purpose:** Add IMAGE_GALLERY to form builder (field type, properties panel, preview).

**Deliverables:**

- Add `IMAGE_GALLERY` to `FormFieldType` enum (shared package)
- Create `ImageGalleryMetadata` interface
- Add IMAGE_GALLERY to field palette (Input Fields section)
- `ImageGalleryPropertiesPanel` (upload, delete, reorder images)
- `ImageGalleryPreviewComponent` (builder canvas preview)
- Integration with `FieldPreviewRendererComponent` and `FieldPropertiesComponent`
- Unit tests (15+ tests)

**Why second?** Enables form creators to add IMAGE_GALLERY fields to forms.

**File:** `docs/stories/story-18.2-form-builder-integration.md`

---

### Story 18.3: Public Form Renderer and Submissions (5 hours)

**Purpose:** Enable end-users to select images in published forms and store selections.

**Deliverables:**

- `ImageGalleryRendererComponent` (public form renderer)
- Reactive form integration (FormControl binding)
- Validation (required field validation)
- Form submission (store selected image key)
- E2E testing (create form → publish → submit → verify data)
- Unit tests (10+ tests)

**Why last?** Completes end-to-end workflow (form creation → publication → submission).

**File:** `docs/stories/story-18.3-public-form-renderer-submissions.md`

---

## Success Criteria

### Functional Success

- ✅ Form creators can add IMAGE_GALLERY field to forms via field palette
- ✅ Gallery supports 2-10 images with upload/delete/reorder capabilities
- ✅ End-users can select one image from gallery (radio button behavior)
- ✅ Selected image displays prominently with visual feedback (border highlight, scale animation)
- ✅ Form submission includes selected image key (`fieldName: 'selectedImageKey'`)
- ✅ Accessible keyboard navigation (arrow keys to navigate, Space/Enter to select)
- ✅ Mobile-responsive gallery layout (grid adapts to screen size)
- ✅ Graceful degradation when no images uploaded (shows placeholder message)

### Technical Success

- ✅ No breaking changes to existing field types
- ✅ No backend API changes required
- ✅ Reusable component pattern (shared between builder and renderer)
- ✅ TypeScript strict mode compilation
- ✅ Unit tests passing (35+ tests total)
- ✅ Integration tests passing (E2E workflow)
- ✅ WCAG AA accessibility compliance
- ✅ Performance: No bottlenecks with 10 images

---

## Compatibility Requirements

### Backward Compatibility

- ✅ **Existing APIs remain unchanged** - No backend modifications needed
- ✅ **Database schema changes are backward compatible** - Stored in form schema JSON (metadata)
- ✅ **UI changes follow existing patterns** - Exact replication of IMAGE and RADIO patterns
- ✅ **Performance impact is minimal** - Images lazy-loaded, thumbnails optimized

### System Integrity

- ✅ Existing forms without IMAGE_GALLERY continue to work
- ✅ Existing field types (TEXT, RADIO, IMAGE, etc.) unchanged
- ✅ Form builder functionality preserved (no regressions)
- ✅ Form submission flow unchanged (additive only)

---

## Risk Management

### Primary Risks

1. **Image upload/storage complexity**
   - **Risk:** S3/DO Spaces integration issues or metadata size limits
   - **Mitigation:** Reuse existing ImageUploadComponent, store URLs only (not base64), limit to 10
     images
   - **Impact:** Medium (could delay Story 18.2)

2. **Keyboard navigation complexity**
   - **Risk:** Complex arrow key logic could introduce accessibility bugs
   - **Mitigation:** Test with real screen readers, follow ARIA patterns, comprehensive unit tests
   - **Impact:** Low (isolated to Story 18.1)

3. **FormControl value serialization**
   - **Risk:** Storing object instead of string could break submission API
   - **Mitigation:** TypeScript type checking, unit tests for value format, integration tests for
     submission
   - **Impact:** Low (caught early in Story 18.3)

### Rollback Plan

**Story 18.1 Rollback:**

- Delete ImageGallerySelectorComponent files
- No impact (not yet integrated)
- Complexity: Trivial (5 minutes)

**Story 18.2 Rollback:**

- Remove IMAGE_GALLERY from FormFieldType enum
- Remove IMAGE_GALLERY from field palette
- Delete ImageGalleryPropertiesPanel and ImageGalleryPreviewComponent
- Rebuild shared package
- Complexity: Medium (30 minutes)

**Story 18.3 Rollback:**

- Remove IMAGE_GALLERY switch case from FormRendererComponent
- Delete ImageGalleryRendererComponent
- Forms with IMAGE_GALLERY fields show "Unknown field type"
- Existing submissions remain intact (no data loss)
- Complexity: Simple (15 minutes)

---

## Dependencies

### External Dependencies

- ✅ PrimeNG 17+ (Image, Button, Accordion modules) - Already installed
- ✅ Angular CDK (Drag-Drop for image reordering) - Already installed
- ✅ S3/DO Spaces (Image storage) - Already configured
- ✅ PostgreSQL (Form submissions storage) - Already running

### Internal Dependencies

- Story 18.2 depends on Story 18.1 (uses ImageGallerySelectorComponent)
- Story 18.3 depends on Story 18.1 (uses ImageGallerySelectorComponent)
- Story 18.3 depends on Story 18.2 (IMAGE_GALLERY field type must exist)

**Critical Path:** Story 18.1 → Story 18.2 → Story 18.3 (sequential execution required)

---

## Testing Strategy

### Unit Tests

- **Story 18.1:** 10+ tests (ImageGallerySelectorComponent)
- **Story 18.2:** 15+ tests (Properties panel, preview component, integration)
- **Story 18.3:** 10+ tests (Renderer component, FormControl integration)
- **Total:** 35+ unit tests

**Coverage:**

- Component rendering (all scenarios: empty, partial, full)
- User interactions (click, keyboard navigation, validation)
- Data flow (props → state → events)
- Edge cases (empty data, invalid data, missing metadata)

### Integration Tests

- **Story 18.2:** Form builder integration (add field → upload images → save form)
- **Story 18.3:** E2E workflow (create form → publish → submit → verify database)

**Critical Paths:**

- Add IMAGE_GALLERY from palette → Upload 3 images → Save form → Load form
- Create form → Publish → Open public URL → Select image → Submit → Verify submission

### Manual Tests

- Keyboard navigation (VoiceOver on macOS, NVDA on Windows)
- Mobile responsiveness (iOS Safari, Android Chrome)
- Performance testing (10 images, slow network)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

## Documentation Updates

### Files to Update

1. **CLAUDE.md** (Project documentation)
   - Add IMAGE_GALLERY to field types list
   - Document metadata structure (ImageGalleryMetadata)
   - Add usage examples

2. **README.md** (if applicable)
   - Update field types count (15 → 16)
   - Add IMAGE_GALLERY to features list

3. **Architecture Docs** (if exists)
   - Document shared component pattern
   - Add IMAGE_GALLERY to field type architecture

### Code Documentation

- JSDoc comments for all public APIs (components, interfaces, methods)
- Inline comments for complex logic (keyboard navigation, validation)
- README in shared component directory

---

## Definition of Done (Epic Level)

### All Stories Complete

- ✅ Story 18.1 delivered (ImageGallerySelectorComponent)
- ✅ Story 18.2 delivered (Form builder integration)
- ✅ Story 18.3 delivered (Public form renderer integration)

### Quality Gates

- ✅ All unit tests passing (35+ tests)
- ✅ Integration tests passing (E2E workflow)
- ✅ TypeScript compilation successful (no errors)
- ✅ No console errors or warnings
- ✅ Accessibility audit passing (WCAG AA compliance)
- ✅ Code review approved (follows existing patterns)

### Functional Verification

- ✅ Form creators can add IMAGE_GALLERY field
- ✅ Form creators can upload/manage gallery images
- ✅ End-users can select images in published forms
- ✅ Form submissions store selected image keys
- ✅ Submissions display correctly in submissions list

### Non-Functional Verification

- ✅ No regressions in existing form builder functionality
- ✅ Performance acceptable (no lag with 10 images)
- ✅ Mobile responsive behavior verified
- ✅ Keyboard navigation working correctly
- ✅ Screen reader compatibility confirmed

### Documentation Complete

- ✅ CLAUDE.md updated (field types list)
- ✅ JSDoc comments added (all public APIs)
- ✅ Story files updated with "Dev Agent Record" sections
- ✅ README updated (if applicable)

---

## Handoff Notes

### For Development Agent

**Start with Story 18.1** (foundational component required by other stories).

**Key Patterns to Follow:**

- RadioPreviewComponent (single-selection behavior)
- ImagePreviewComponent (image display structure)
- Standalone component architecture (OnPush change detection, signals)

**Testing Checklist:**

- Test keyboard navigation thoroughly (most complex part)
- Verify WCAG AA compliance with screen readers
- Test mobile touch interactions (44px minimum touch targets)

**Story Files:**

- Story 18.1: `docs/stories/story-18.1-shared-image-gallery-selector.md`
- Story 18.2: `docs/stories/story-18.2-form-builder-integration.md`
- Story 18.3: `docs/stories/story-18.3-public-form-renderer-submissions.md`

### For QA

**Critical Test Cases:**

1. **Keyboard Navigation:** Arrow keys navigate, Space/Enter select
2. **Validation:** Required fields show errors when no selection
3. **Submission:** Selected image key stored correctly in database
4. **Mobile:** Gallery adapts to screen size, touch targets adequate
5. **Accessibility:** Screen reader announces selections and errors

**Test Data:**

- Use 3-5 images for typical gallery
- Test edge cases: 2 images (minimum), 10 images (recommended max)
- Test various image aspect ratios (portrait, landscape, square)

---

## Related Documentation

- **Epic Definition:** `docs/stories/epic-18-image-gallery-selector.md` (this file)
- **Story 18.1:** `docs/stories/story-18.1-shared-image-gallery-selector.md`
- **Story 18.2:** `docs/stories/story-18.2-form-builder-integration.md`
- **Story 18.3:** `docs/stories/story-18.3-public-form-renderer-submissions.md`
- **Project Documentation:** `CLAUDE.md`
- **Shared Types:** `packages/shared/src/types/forms.types.ts`

---

## Revision History

| Date       | Version | Author | Changes                                   |
| ---------- | ------- | ------ | ----------------------------------------- |
| 2025-01-11 | 1.0     | John   | Epic created with 3 stories               |
| TBD        | 1.1     | Dev    | Implementation notes added after delivery |

---

**Epic Status:** ✅ Ready for Development **Next Action:** Start Story 18.1 (Shared Image Gallery
Selector Component)
