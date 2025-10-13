# Story 18.4: Image Gallery Preview Pane UI Enhancement - Brownfield Addition

**Epic:** Epic 18 - Image Gallery Selector - Brownfield Enhancement **Story Points:** 4 hours
**Priority:** Medium **Status:** Ready for Development **Dependencies:** Story 18.3 (Public Form
Renderer)

---

## User Story

**As a** form respondent filling out a form with an image gallery field, **I want** to see a large
preview of the selected image above the thumbnail gallery with an option to add descriptions in edit
mode, **So that** I can better view and select images with confidence and provide detailed
information when editing.

---

## Story Context

### Existing System Integration

**Integrates with:**

- `ImageGallerySelectorComponent` (apps/web/.../shared/components/image-gallery-selector/)
- `ImageGalleryRendererComponent`
  (apps/web/.../public/form-renderer/image-gallery-renderer.component.ts)
- `ImageGalleryPropertiesPanelComponent` (apps/web/.../form-builder/field-properties/panels/)
- FormControl reactive form integration

**Technology:**

- Angular 20+ standalone components with signals
- PrimeNG UI components + Tailwind CSS
- Angular Reactive Forms (FormControl)
- Component inputs for mode detection (edit vs preview)

**Follows pattern:**

- Existing ImageGallerySelectorComponent grid layout pattern
- Selection state management with signals
- Two-mode component behavior (edit/preview) similar to form builder preview mode

**Touch points:**

- `apps/web/src/app/shared/components/image-gallery-selector/image-gallery-selector.component.ts`
  (enhance or extend)
- `apps/web/src/app/features/public/form-renderer/image-gallery-renderer.component.ts` (add mode
  input)
- `apps/web/src/app/features/tools/components/form-builder/field-properties/panels/image-gallery-properties-panel.component.ts`
  (add description inputs)

---

## Acceptance Criteria

### Functional Requirements

1. **Two-Pane Layout Structure**
   - Component displays two distinct sections:
     - Top section: Large preview area showing selected image
     - Bottom section: Horizontal thumbnail gallery (scrollable if needed)
   - Preview area has minimum height of 300px, maximum 500px
   - Preview area maintains aspect ratio of selected image (no distortion)
   - Thumbnail gallery shows all images in horizontal row
   - Responsive: On mobile (<768px), preview adjusts to smaller height (200px min)

2. **Large Preview Functionality**
   - On component initialization: First image selected by default, shown in preview
   - When user clicks thumbnail: Selected image displays large in preview area
   - Preview shows full image with object-fit: contain (entire image visible)
   - Preview has subtle border and background to distinguish from page
   - Smooth transition animation when switching preview images (fade or slide)
   - Preview includes alt text below image for accessibility

3. **Thumbnail Gallery Layout**
   - Thumbnails display horizontally below preview area
   - Each thumbnail: Fixed height (100px), width auto-maintains aspect ratio
   - Selected thumbnail has blue border (3px) and slight scale (1.05x)
   - Non-selected thumbnails have gray border (2px)
   - Thumbnails have hover effect (border color change, subtle scale)
   - Gap between thumbnails: 12px
   - Horizontal scroll if thumbnails exceed container width

4. **Add New Image Button (Edit Mode Only)**
   - Button appears at end of thumbnail row (rightmost position)
   - Button styled as dashed border box with "+" icon
   - Button has same height as thumbnails (100px)
   - Button label: "Add Image" with icon
   - Button click triggers file upload dialog
   - Button disabled when max images reached
   - Button hidden in preview mode (mode === 'preview')
   - Button follows existing ImageUploadComponent upload pattern

5. **Description Input Fields (Edit Mode Only)**
   - Each thumbnail has input field directly below it
   - Input field: Single-line text input (pInputText)
   - Input placeholder: "Image description..."
   - Input value binds to image.alt property
   - Input updates emit metadataChange event
   - Input fields hidden in preview mode (mode === 'preview')
   - Input fields have 8px top margin from thumbnail

### Integration Requirements

6. **Mode-Aware Behavior**
   - Component accepts `@Input() mode: 'edit' | 'preview' = 'preview'`
   - **Preview mode (default):**
     - Show preview pane + thumbnail gallery
     - Hide "Add Image" button
     - Hide description input fields
     - Selection enabled, visual feedback shown
   - **Edit mode:**
     - Show preview pane + thumbnail gallery
     - Show "Add Image" button
     - Show description input fields
     - Selection enabled, description editing enabled

7. **ImageGalleryPropertiesPanelComponent Integration**
   - Properties panel uses edit mode for inline gallery management
   - Properties panel shows preview pane with add/edit capabilities
   - Replaces existing flat thumbnail list with enhanced two-pane UI
   - Maintains drag-drop reordering functionality (apply to thumbnails)
   - Maintains delete button per thumbnail (overlay on thumbnail hover)

8. **ImageGalleryRendererComponent Integration**
   - Public form renderer uses preview mode (no add/edit buttons)
   - Passes mode='preview' to enhanced gallery component
   - Maintains FormControl integration unchanged
   - Maintains validation display unchanged
   - Preview pane improves user experience for selection

### Quality Requirements

9. **Responsive Behavior**
   - Desktop (≥768px): Preview 400px height, thumbnails 100px height
   - Tablet (≥600px, <768px): Preview 300px height, thumbnails 80px height
   - Mobile (<600px): Preview 200px height, thumbnails 60px height
   - Thumbnail gallery scrolls horizontally on all screen sizes
   - No horizontal page scroll (gallery container width constrained)

10. **Accessibility**
    - Preview area has aria-label describing current selection
    - Thumbnails remain keyboard navigable (Tab, Arrow keys)
    - Screen reader announces preview image changes
    - Description inputs have accessible labels (sr-only if needed)
    - Focus management: Tab order flows preview → thumbnails → inputs → add button

11. **Animation and Performance**
    - Preview image transition: 200ms fade or slide animation
    - Thumbnail selection transition: 150ms ease-out
    - Lazy loading for preview images (loading="lazy")
    - No janky animations or layout shifts
    - CSS transitions over JavaScript animations (performance)

---

## Technical Notes

### Integration Approach

**Option 1: Enhance ImageGallerySelectorComponent (Recommended)**

- Add `@Input() layoutMode: 'grid' | 'preview-gallery' = 'grid'`
- Add `@Input() editMode: boolean = false`
- Conditional template rendering based on layoutMode
- Preserve existing grid layout for backward compatibility

**Option 2: Create New Component (Alternative)**

- Create `ImageGalleryPreviewPaneComponent` (separate component)
- Wrap `ImageGallerySelectorComponent` for thumbnails
- Add preview pane section above
- More code duplication, cleaner separation

**Recommendation:** Option 1 (enhance existing) - maintains single source of truth, less duplication

### Component Structure (Option 1)

```typescript
// Enhanced ImageGallerySelectorComponent

@Component({
  selector: 'app-image-gallery-selector',
  // ...
})
export class ImageGallerySelectorComponent {
  // Existing inputs
  images = input.required<GalleryImage[]>();
  selectedImageKey = input<string | null>(null);
  columns = input<2 | 3 | 4>(4);
  aspectRatio = input<'square' | '16:9' | 'auto'>('square');
  ariaLabel = input<string>('Image gallery selector');

  // New inputs for preview-gallery layout
  layoutMode = input<'grid' | 'preview-gallery'>('grid');
  editMode = input<boolean>(false);
  maxImages = input<number>(10);

  // New outputs for edit mode
  imageUploadRequested = output<void>();
  imageDescriptionChanged = output<{ key: string; description: string }>();
  imageDeleted = output<string>();

  // ... existing signals and methods

  // New computed signal for preview image
  protected previewImage = computed(() => {
    const selectedKey = this.selectedImageKey();
    const images = this.images();
    return images.find((img) => img.key === selectedKey) ?? images[0] ?? null;
  });
}
```

### Template Structure (Preview-Gallery Mode)

```html
<!-- apps/web/.../image-gallery-selector.component.ts template -->

@if (layoutMode() === 'preview-gallery') {
<!-- Preview Pane Section -->
<div class="preview-pane">
  @if (previewImage()) {
  <img
    [src]="previewImage()!.url"
    [alt]="previewImage()!.alt || 'Selected image preview'"
    class="preview-image"
    loading="lazy"
  />
  <p class="preview-alt-text">{{ previewImage()!.alt }}</p>
  } @else {
  <div class="empty-preview">
    <i class="pi pi-image text-5xl text-gray-300"></i>
    <p>No image selected</p>
  </div>
  }
</div>

<!-- Thumbnail Gallery Section -->
<div class="thumbnail-gallery">
  <div class="thumbnail-scroll-container">
    @for (image of images(); track image.key; let idx = $index) {
    <div class="thumbnail-item">
      <div
        class="thumbnail-wrapper"
        [class.selected]="selectedImageKey() === image.key"
        (click)="selectImage(image.key)"
      >
        <img
          [src]="image.url"
          [alt]="image.alt || 'Thumbnail ' + (idx + 1)"
          class="thumbnail-image"
        />
        <!-- Delete button (edit mode, hover overlay) -->
        @if (editMode()) {
        <button
          class="thumbnail-delete"
          (click)="deleteImageHandler(image.key); $event.stopPropagation()"
          aria-label="Delete image"
        >
          <i class="pi pi-times"></i>
        </button>
        }
      </div>
      <!-- Description input (edit mode) -->
      @if (editMode()) {
      <input
        type="text"
        pInputText
        placeholder="Image description..."
        [value]="image.alt"
        (input)="onDescriptionChange(image.key, $any($event.target).value)"
        class="thumbnail-description"
      />
      }
    </div>
    }

    <!-- Add Image Button (edit mode) -->
    @if (editMode() && images().length < maxImages()) {
    <button class="add-image-button" (click)="requestImageUpload()" aria-label="Add new image">
      <i class="pi pi-plus text-2xl"></i>
      <span class="text-xs">Add Image</span>
    </button>
    }
  </div>
</div>
} @else {
<!-- Existing grid layout (unchanged) -->
<div class="image-grid" ...>
  <!-- ... existing grid template ... -->
</div>
}
```

### CSS Styles (Preview-Gallery Mode)

```scss
// Preview Pane
.preview-pane {
  width: 100%;
  min-height: 300px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 450px;
  object-fit: contain;
  border-radius: 4px;
  transition: opacity 200ms ease-in-out;
}

.preview-alt-text {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #9ca3af;
}

// Thumbnail Gallery
.thumbnail-gallery {
  width: 100%;
  overflow: hidden;
}

.thumbnail-scroll-container {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-behavior: smooth;

  /* Hide scrollbar visually, keep functionality */
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
}

.thumbnail-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.thumbnail-wrapper {
  position: relative;
  width: auto;
  height: 100px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover {
    border-color: #9ca3af;
    transform: scale(1.02);
  }

  &.selected {
    border: 3px solid #3b82f6;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
}

.thumbnail-image {
  width: auto;
  height: 100%;
  object-fit: cover;
}

.thumbnail-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms;

  .thumbnail-wrapper:hover & {
    display: flex;
  }

  &:hover {
    background: rgb(220, 38, 38);
  }
}

.thumbnail-description {
  margin-top: 8px;
  width: 120px;
  font-size: 0.75rem;
}

.add-image-button {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 150ms ease-out;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
    transform: scale(1.02);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Responsive
@media (max-width: 767px) {
  .preview-pane {
    min-height: 200px;
    max-height: 300px;
  }

  .preview-image {
    max-height: 250px;
  }

  .thumbnail-wrapper {
    height: 60px;
  }

  .thumbnail-description {
    width: 80px;
  }

  .add-image-button {
    width: 60px;
    height: 60px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .preview-pane {
    min-height: 300px;
    max-height: 400px;
  }

  .preview-image {
    max-height: 350px;
  }

  .thumbnail-wrapper {
    height: 80px;
  }

  .thumbnail-description {
    width: 100px;
  }

  .add-image-button {
    width: 80px;
    height: 80px;
  }
}
```

### Existing Pattern Reference

**ImageGallerySelectorComponent (existing grid layout):**

- Selection state management with signals
- Keyboard navigation (arrow keys, Space, Enter)
- Responsive column layout with breakpoints
- Accessibility with ARIA attributes and screen reader support

**Image upload pattern (from ImageGalleryPropertiesPanelComponent):**

- Hidden ImageUploadComponent triggers file dialog
- imageUploaded event adds image to array
- Uses FormId for upload context

**Key Constraints:**

- Must maintain backward compatibility with existing grid layout
- Must preserve all existing accessibility features
- Edit mode only for form builder, preview mode for public forms
- Component must work with existing FormControl integration

---

## Definition of Done

- ✅ ImageGallerySelectorComponent enhanced with layoutMode='preview-gallery' option
- ✅ Two-pane layout renders correctly (preview + thumbnails)
- ✅ Default first image selected and displayed in preview
- ✅ Thumbnail click updates preview with smooth transition
- ✅ Edit mode shows "Add Image" button and description inputs
- ✅ Preview mode hides "Add Image" button and description inputs
- ✅ ImageGalleryPropertiesPanelComponent uses edit mode
- ✅ ImageGalleryRendererComponent uses preview mode
- ✅ Unit tests written and passing (minimum 10 tests):
  - ✅ Preview pane renders selected image
  - ✅ Thumbnail click updates preview
  - ✅ First image selected by default
  - ✅ Edit mode shows add button and inputs
  - ✅ Preview mode hides add button and inputs
  - ✅ Add button triggers upload event
  - ✅ Description input updates emit event
  - ✅ Responsive styles apply correctly
  - ✅ Keyboard navigation works
  - ✅ Accessibility attributes correct
- ✅ Manual testing:
  - ✅ Form builder properties panel shows edit mode UI
  - ✅ Public form shows preview mode UI
  - ✅ Image upload works (add button)
  - ✅ Description editing works
  - ✅ Preview transitions smoothly
  - ✅ Responsive behavior verified (mobile, tablet, desktop)
- ✅ Accessibility verified:
  - ✅ Screen reader announces preview changes
  - ✅ Keyboard navigation works (Tab, Arrow keys)
  - ✅ Focus order logical (preview → thumbnails → inputs → add button)
- ✅ No console errors or warnings
- ✅ TypeScript compilation successful
- ✅ ESLint clean (0 errors)
- ✅ Existing grid layout functionality unchanged (backward compatibility)
- ✅ Code follows existing component patterns
- ✅ JSDoc comments added for new inputs/outputs/methods

---

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk:** Adding new layout mode could break existing grid layout behavior or cause visual
regressions.

**Mitigation:**

1. Use conditional template rendering based on layoutMode input
2. Default layoutMode to 'grid' (existing behavior)
3. Existing usages automatically use grid layout (no breaking changes)
4. Add feature flag if needed for gradual rollout
5. Comprehensive unit tests for both layout modes
6. Manual regression testing of existing grid layout

**Rollback:**

- Set layoutMode input to 'grid' in all usages
- Comment out preview-gallery template section
- No data loss (metadata unchanged)
- Rollback complexity: Simple (5 minutes, input change)

### Compatibility Verification

- ✅ **No breaking changes to existing APIs** - New inputs are optional with defaults
- ✅ **Database changes** - None (no schema changes)
- ✅ **UI changes follow existing design patterns** - Matches PrimeNG + Tailwind styling
- ✅ **Performance impact is negligible** - CSS transitions, lazy loading, no heavy JS

---

## Implementation Checklist

### Phase 1: Component Enhancement (2 hours)

- [ ] Add new inputs to ImageGallerySelectorComponent (layoutMode, editMode, maxImages)
- [ ] Add new outputs (imageUploadRequested, imageDescriptionChanged, imageDeleted)
- [ ] Add previewImage computed signal
- [ ] Implement preview-gallery template section
- [ ] Add CSS styles for preview pane and thumbnail gallery
- [ ] Implement event handlers (requestImageUpload, onDescriptionChange, deleteImageHandler)
- [ ] Test component in isolation (grid layout still works)

### Phase 2: Integration (1 hour)

- [ ] Update ImageGalleryPropertiesPanelComponent:
  - [ ] Pass layoutMode='preview-gallery' to ImageGallerySelectorComponent
  - [ ] Pass editMode=true
  - [ ] Handle imageUploadRequested output
  - [ ] Handle imageDescriptionChanged output
  - [ ] Handle imageDeleted output
  - [ ] Remove old flat thumbnail list UI
- [ ] Update ImageGalleryRendererComponent:
  - [ ] Pass layoutMode='preview-gallery' to ImageGallerySelectorComponent
  - [ ] Pass editMode=false (preview mode)
  - [ ] Verify FormControl integration unchanged
- [ ] Test both integrations (form builder + public form)

### Phase 3: Testing (1 hour)

- [ ] Write unit tests (minimum 10):
  - [ ] Preview pane renders selected image
  - [ ] Thumbnail click updates preview
  - [ ] First image auto-selected on init
  - [ ] Edit mode shows add button and inputs
  - [ ] Preview mode hides add button and inputs
  - [ ] Add button emits imageUploadRequested
  - [ ] Description input emits imageDescriptionChanged
  - [ ] Delete button emits imageDeleted
  - [ ] Responsive styles apply (mobile, tablet, desktop)
  - [ ] Grid layout mode still works (backward compatibility)
- [ ] Manual testing:
  - [ ] Form builder: Edit mode UI works
  - [ ] Public form: Preview mode UI works
  - [ ] Image upload flow (add button → file dialog → image added)
  - [ ] Description editing flow
  - [ ] Responsive behavior (resize browser)
  - [ ] Keyboard navigation
  - [ ] Screen reader announcements
- [ ] Regression testing:
  - [ ] Existing grid layout still works
  - [ ] Existing form builder functionality unchanged
  - [ ] Existing public form rendering unchanged

---

**Story Status:** Ready for Development **Dependencies:** Story 18.3 (Public Form Renderer -
Completed) **Blocked By:** None **Next Story:** None (Epic 18 extension)

---

## Dev Notes

**Design Decisions:**

- **Layout Mode Input:** Allows component to support both grid and preview-gallery layouts without
  breaking changes
- **Edit Mode Input:** Controls visibility of add button and description inputs (cleaner than
  separate components)
- **Auto-select First Image:** Improves UX by always showing something in preview on load
- **Horizontal Thumbnail Scroll:** Works better for varying image counts (2-20 images)
- **CSS Transitions Over JS:** Better performance, hardware-accelerated, more maintainable

**Alternative Approaches Considered:**

1. **Separate Component (ImageGalleryPreviewPaneComponent):**
   - Pros: Clean separation, no risk to existing component
   - Cons: Code duplication, harder to maintain, two sources of truth
   - Rejected: More maintenance burden

2. **Always Use Preview-Gallery Layout:**
   - Pros: Simpler, no layout mode switching
   - Cons: Breaking change, forces all users to new UI
   - Rejected: Must maintain backward compatibility

3. **JavaScript-based Preview Animation:**
   - Pros: More animation control
   - Cons: Worse performance, more code, harder to maintain
   - Rejected: CSS transitions sufficient

**Testing Strategy:**

- Unit tests: Component behavior, input/output handling, conditional rendering
- Integration tests: Form builder and public form contexts
- Manual tests: Visual appearance, responsiveness, accessibility
- Regression tests: Existing grid layout functionality

**Accessibility Considerations:**

- Preview area has aria-label for current selection
- Thumbnails remain keyboard navigable (Tab, Arrow keys for grid)
- Screen reader announces preview changes (aria-live on preview alt text)
- Description inputs have labels (sr-only class if needed)
- Focus order: Preview → Thumbnails → Inputs → Add Button

---

## E2E Test Script

**Manual E2E Test Steps:**

### Test 1: Form Builder (Edit Mode)

1. **Navigate to Form Builder**
   - Create new form or open existing form
   - Add IMAGE_GALLERY field or select existing one

2. **Verify Edit Mode UI**
   - Verify preview pane displays above thumbnails
   - Verify first image selected by default (or previously selected image)
   - Verify large preview shows selected image clearly
   - Verify thumbnails display horizontally below preview
   - Verify "Add Image" button visible at end of thumbnails
   - Verify description input fields visible below each thumbnail

3. **Test Preview Interaction**
   - Click different thumbnail → Verify preview updates with smooth transition
   - Verify selected thumbnail has blue border and scale effect
   - Verify non-selected thumbnails have gray border
   - Verify preview alt text updates when selection changes

4. **Test Edit Functionality**
   - Click "Add Image" button → Verify file dialog opens
   - Upload image → Verify new thumbnail appears at end
   - Type in description input → Verify metadata updates
   - Hover over thumbnail → Verify delete button appears
   - Click delete button → Verify thumbnail removed

5. **Test Responsive (Edit Mode)**
   - Resize browser to tablet width → Verify preview height adjusts
   - Resize to mobile width → Verify thumbnails scale down
   - Verify horizontal scroll works for many thumbnails

### Test 2: Public Form (Preview Mode)

1. **Publish Form and Open Public URL**
   - Publish form with IMAGE_GALLERY field (3+ images)
   - Open public form URL in new tab

2. **Verify Preview Mode UI**
   - Verify preview pane displays above thumbnails
   - Verify first image selected by default
   - Verify large preview shows selected image
   - Verify thumbnails display horizontally below
   - Verify "Add Image" button hidden (not visible)
   - Verify description inputs hidden (not visible)

3. **Test Selection Interaction**
   - Click different thumbnail → Verify preview updates
   - Verify selected thumbnail has blue border
   - Verify selection persists (doesn't reset)
   - Click same thumbnail again → Verify no change (idempotent)

4. **Test Form Submission**
   - Select image from gallery
   - Fill other form fields (if any)
   - Submit form → Verify success
   - Check form submissions → Verify correct image key stored

5. **Test Responsive (Preview Mode)**
   - Resize browser to tablet width → Verify preview adjusts
   - Resize to mobile width → Verify thumbnails scale down
   - Verify horizontal scroll works

### Test 3: Backward Compatibility (Grid Layout)

1. **Verify Existing Grid Layout**
   - Find existing usage of ImageGallerySelectorComponent (if any outside form builder/renderer)
   - Verify grid layout still renders correctly (not broken)
   - Verify selection behavior unchanged
   - Verify keyboard navigation unchanged

2. **Verify No Regressions**
   - Test existing forms with IMAGE_GALLERY fields
   - Verify form submissions still work
   - Verify published forms still render
   - Verify no console errors

**Expected Outcome:** All tests pass, both edit and preview modes work correctly, no regressions in
existing functionality.
