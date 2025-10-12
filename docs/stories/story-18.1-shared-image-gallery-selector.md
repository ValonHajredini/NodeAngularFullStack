# Story 18.1: Shared Image Gallery Selector Component - Brownfield Addition

**Epic:** Epic 18 - Image Gallery Selector - Brownfield Enhancement **Story Points:** 6 hours
**Priority:** High **Status:** Ready for Development **Dependencies:** None (foundational story)

---

## User Story

**As a** form builder developer, **I want** a reusable image gallery selector component that
displays multiple images in a grid and allows single-selection with radio button behavior, **So
that** I can integrate this component into both the form builder preview and the public form
renderer without code duplication.

---

## Story Context

### Existing System Integration

**Integrates with:**

- FormBuilderComponent (will use in Story 18.2 for builder preview)
- FormRendererComponent (will use in Story 18.3 for public form rendering)
- Existing PrimeNG Image module (for image display)
- Angular CDK (for keyboard navigation utilities if needed)

**Technology:**

- Angular 20+ standalone component with OnPush change detection
- PrimeNG 17+ (Image module for display)
- TypeScript with signals and computed properties
- Tailwind CSS for styling (following existing form builder patterns)
- Responsive grid layout (CSS Grid or Flexbox)

**Follows pattern:**

- Existing preview components pattern (apps/web/.../form-canvas/field-preview-renderer/)
- RadioPreviewComponent for single-selection behavior (radio-preview.component.ts)
- ImagePreviewComponent for image display structure (image-preview.component.ts)
- Standalone component architecture with input/output signals

**Touch points:**

- New shared component directory: `apps/web/src/app/shared/components/image-gallery-selector/`
- Component files:
  - `image-gallery-selector.component.ts`
  - `image-gallery-selector.component.spec.ts`
- Exports from: `apps/web/src/app/shared/components/index.ts` (if exists) or direct imports

---

## Acceptance Criteria

### Functional Requirements

1. **Grid Layout Display**
   - Component displays images in a responsive grid layout
   - Grid columns: 4 columns on desktop (≥ 1024px), 3 on tablet (768-1023px), 2 on mobile (< 768px)
   - Images render as thumbnails with consistent aspect ratio (square or 16:9 configurable)
   - Each image has a border and padding for visual separation
   - Empty state: Shows placeholder message when no images provided

2. **Single Selection Behavior (Radio Button Logic)**
   - Only one image can be selected at a time
   - Clicking an image selects it (deselects previous selection)
   - Selected image displays with:
     - Highlighted border (2px solid blue, or configurable color)
     - Scale animation (1.05x transform, smooth transition)
     - Checkmark overlay icon (pi pi-check-circle in top-right corner)
   - Initial state: No image selected (unless `selectedImageKey` input provided)
   - Selection persists until user selects different image

3. **Keyboard Navigation (Accessibility)**
   - Component is keyboard-navigable using arrow keys
   - **Arrow keys:** Navigate between images (Up/Down/Left/Right)
   - **Space or Enter:** Select focused image
   - **Tab:** Moves focus into/out of gallery
   - Focused image has visible focus ring (2px dotted outline)
   - Screen reader announces: "Image gallery, {{totalImages}} images. {{currentIndex}} of
     {{totalImages}} selected."

4. **Input/Output Interface**
   - **@Input() images:** Array of image objects `{ key: string, url: string, alt?: string }[]`
   - **@Input() selectedImageKey:** Optional initial selection (string | null)
   - **@Input() columns:** Optional grid columns override (number, default: responsive)
   - **@Input() aspectRatio:** Optional aspect ratio ('square' | '16:9' | 'auto', default: 'square')
   - **@Output() selectionChange:** Emits selected image key when user selects image
     `EventEmitter<string>`
   - Component validates inputs (shows error message if images array empty or invalid)

5. **Visual Feedback and Animations**
   - Hover state: Image scales slightly (1.02x) with smooth transition
   - Click feedback: Brief scale-down animation (0.98x) on click
   - Selection animation: Smooth border color change and scale transition (200ms ease-out)
   - Loading state: Shows skeleton loader while images are loading (if lazy loading enabled)
   - All animations use CSS transitions (no JavaScript animation libraries)

### Integration Requirements

6. **Standalone Component Architecture**
   - Component is standalone (no NgModule required)
   - Uses `ChangeDetectionStrategy.OnPush` for performance
   - All inputs use `input<T>()` signal syntax (Angular 20+)
   - `selectedImageKey` tracked with `signal<string | null>(null)`
   - `selectionChange` uses `output<string>()` syntax (or `EventEmitter` for compatibility)

7. **PrimeNG Integration**
   - Uses PrimeNG Image component for image display (`<p-image>`)
   - Leverages PrimeNG styling conventions (Tailwind + PrimeNG classes)
   - Follows existing form builder component styling patterns
   - No custom PrimeNG theme changes required

8. **Responsive Behavior**
   - Component adapts to container width (uses `width: 100%`)
   - Grid layout adjusts automatically based on viewport breakpoints
   - Touch-friendly: Minimum touch target size 44×44px (WCAG 2.2 guideline)
   - Mobile: Images stacked with adequate spacing (no cramped layout)

### Quality Requirements

9. **Unit Tests (Jasmine + Karma)**
   - Component renders correctly with valid images array
   - Component handles empty images array (shows placeholder)
   - Single selection logic works (selecting one deselects previous)
   - `selectionChange` event emits correct image key on selection
   - Keyboard navigation works (arrow keys, Space, Enter)
   - Focus management works correctly
   - Input validation prevents errors with invalid data
   - Accessibility attributes present (role, aria-labels, aria-selected)
   - Minimum 10 unit tests covering all acceptance criteria

10. **Accessibility (WCAG AA Compliance)**
    - Component has `role="radiogroup"` for radio button semantics
    - Each image has `role="radio"` with `aria-checked` attribute
    - Component has `aria-label="Image gallery selector"` (or configurable)
    - Keyboard navigation fully functional (no mouse-only interactions)
    - Focus visible at all times (focus ring)
    - Screen reader announces selection changes via `aria-live="polite"`
    - Color contrast meets WCAG AA standards (3:1 for borders, 4.5:1 for text)

11. **Performance Optimization**
    - Images lazy-loaded using `loading="lazy"` attribute
    - OnPush change detection minimizes re-renders
    - No performance bottlenecks with 10 images (tested)
    - Grid layout uses CSS Grid (GPU-accelerated, performant)
    - Animations use `transform` and `opacity` (GPU-accelerated properties)

---

## Technical Notes

### Integration Approach

**Component Structure:**

```typescript
@Component({
  selector: 'app-image-gallery-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule],
  template: `
    <div
      role="radiogroup"
      [attr.aria-label]="'Image gallery selector'"
      class="image-gallery-selector"
      (keydown)="onKeyDown($event)"
    >
      @if (images().length === 0) {
        <div class="empty-state">
          <i class="pi pi-images text-4xl text-gray-400"></i>
          <p class="text-gray-500">No images available</p>
        </div>
      } @else {
        <div
          class="image-grid"
          [class.grid-cols-2]="getColumns() === 2"
          [class.grid-cols-3]="getColumns() === 3"
          [class.grid-cols-4]="getColumns() === 4"
        >
          @for (image of images(); track image.key; let idx = $index) {
            <div
              role="radio"
              [attr.aria-checked]="selectedImageKey() === image.key"
              [attr.aria-label]="image.alt || 'Image ' + (idx + 1)"
              [tabindex]="focusedIndex() === idx ? 0 : -1"
              class="image-item"
              [class.selected]="selectedImageKey() === image.key"
              [class.focused]="focusedIndex() === idx"
              (click)="selectImage(image.key)"
              (focus)="focusedIndex.set(idx)"
              (keydown.space)="selectImage(image.key); $event.preventDefault()"
              (keydown.enter)="selectImage(image.key); $event.preventDefault()"
            >
              <img
                [src]="image.url"
                [alt]="image.alt || 'Image ' + (idx + 1)"
                [class.aspect-square]="aspectRatio() === 'square'"
                [class.aspect-video]="aspectRatio() === '16:9'"
                loading="lazy"
                class="w-full h-full object-cover"
              />
              @if (selectedImageKey() === image.key) {
                <div class="selection-indicator">
                  <i class="pi pi-check-circle"></i>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Screen reader live region -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        @if (selectedImageKey()) {
          Image selected: {{ getSelectedImageAlt() }}
        }
      </div>
    </div>
  `,
  styles: [
    `
      .image-gallery-selector {
        width: 100%;
      }

      .image-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(4, 1fr);
      }

      @media (max-width: 1023px) {
        .image-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 767px) {
        .image-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .image-item {
        position: relative;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease-out;
        min-height: 120px;
      }

      .image-item:hover {
        transform: scale(1.02);
        border-color: #9ca3af;
      }

      .image-item:active {
        transform: scale(0.98);
      }

      .image-item.selected {
        border-color: #3b82f6;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .image-item.focused {
        outline: 2px dotted #3b82f6;
        outline-offset: 2px;
      }

      .image-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .selection-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        padding: 4px;
        font-size: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        background: #f9fafb;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        min-height: 200px;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }

      .aspect-square {
        aspect-ratio: 1 / 1;
      }

      .aspect-video {
        aspect-ratio: 16 / 9;
      }
    `,
  ],
})
export class ImageGallerySelectorComponent {
  // Inputs
  images = input.required<{ key: string; url: string; alt?: string }[]>();
  selectedImageKey = input<string | null>(null);
  columns = input<2 | 3 | 4>(4);
  aspectRatio = input<'square' | '16:9' | 'auto'>('square');

  // Output
  selectionChange = output<string>();

  // Internal state
  focusedIndex = signal<number>(0);

  /**
   * Selects an image and emits the selection change event
   */
  selectImage(key: string): void {
    this.selectionChange.emit(key);
  }

  /**
   * Handles keyboard navigation within the gallery
   */
  onKeyDown(event: KeyboardEvent): void {
    const totalImages = this.images().length;
    const currentIndex = this.focusedIndex();
    const cols = this.getColumns();

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, totalImages - 1);
        event.preventDefault();
        break;
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0);
        event.preventDefault();
        break;
      case 'ArrowDown':
        newIndex = Math.min(currentIndex + cols, totalImages - 1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        newIndex = Math.max(currentIndex - cols, 0);
        event.preventDefault();
        break;
    }

    if (newIndex !== currentIndex) {
      this.focusedIndex.set(newIndex);
      // Focus the element programmatically
      setTimeout(() => {
        const element = document.querySelector(`.image-item[tabindex="0"]`) as HTMLElement;
        element?.focus();
      });
    }
  }

  /**
   * Gets the current number of grid columns based on responsive breakpoints
   */
  getColumns(): number {
    if (typeof window === 'undefined') return this.columns();

    const width = window.innerWidth;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    return this.columns();
  }

  /**
   * Gets the alt text of the currently selected image for screen readers
   */
  getSelectedImageAlt(): string {
    const selected = this.images().find((img) => img.key === this.selectedImageKey());
    return selected?.alt || 'Selected image';
  }
}
```

### Existing Pattern Reference

**RadioPreviewComponent (apps/web/.../radio-preview.component.ts lines 1-61):**

- Single selection behavior with `[(ngModel)]="previewValue"`
- PrimeNG RadioButton integration
- Options array iteration with `@for` loop
- Aria-labels for accessibility

**ImagePreviewComponent (apps/web/.../image-preview.component.ts lines 1-109):**

- Image display with responsive width/height
- Metadata interface pattern (ImageMetadata)
- Empty state placeholder with icon
- Object-fit CSS property for image scaling

**Key Constraints:**

- Component must be reusable in both builder and renderer contexts (no context-specific logic)
- Must work with server-rendered image URLs (S3/DO Spaces URLs)
- Maximum 10 images recommended (performance tested up to 20)
- No image upload functionality in this component (upload handled by properties panel in Story 18.2)
- Must support touch devices (mobile-first approach)
- No text input field (pure visual gallery selector only)

---

## Definition of Done

- ✅ Component renders image grid with 2-4 responsive columns
- ✅ Single selection behavior works (clicking selects, deselects previous)
- ✅ Selected image displays with highlighted border and checkmark icon
- ✅ Keyboard navigation works (arrow keys, Space, Enter)
- ✅ Focus management works correctly (Tab, visible focus ring)
- ✅ `selectionChange` event emits correct image key
- ✅ Component handles empty images array gracefully (placeholder message)
- ✅ Unit tests written and passing (minimum 10 tests)
- ✅ Accessibility attributes present (role, aria-labels, aria-checked, aria-live)
- ✅ Screen reader testing confirms announcements work (VoiceOver/NVDA)
- ✅ Mobile responsive behavior verified (touch targets ≥ 44px)
- ✅ Component follows standalone pattern with OnPush change detection
- ✅ No console errors or warnings
- ✅ Code follows existing component patterns (RadioPreview + ImagePreview)
- ✅ JSDoc comments added for all public methods and inputs
- ✅ Component ready for integration in Story 18.2 (builder) and Story 18.3 (renderer)

---

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk:** Complex keyboard navigation logic could introduce bugs or accessibility issues if
not thoroughly tested.

**Mitigation:**

1. Follow existing keyboard navigation patterns from PrimeNG components
2. Use Angular CDK FocusKeyManager (if available) for robust focus management
3. Test with real screen readers (VoiceOver on macOS, NVDA on Windows)
4. Add comprehensive unit tests for all keyboard interactions
5. Reference ARIA Authoring Practices Guide for radio group pattern
6. Manual testing on touch devices (mobile phones, tablets)

**Rollback:**

- Delete component files (image-gallery-selector.component.ts + .spec.ts)
- Remove from shared components exports
- No impact on existing system (additive change only)
- Rollback complexity: Trivial (< 5 minutes, delete 2 files)

### Compatibility Verification

- ✅ **No breaking changes to existing APIs** - New component, no modifications
- ✅ **Database changes** - None (component only)
- ✅ **UI changes follow existing design patterns** - Matches RadioPreview + ImagePreview patterns
- ✅ **Performance impact is negligible** - OnPush detection, lazy loading, GPU-accelerated
  animations

---

## Implementation Checklist

### Phase 1: Component Structure (1.5 hours)

- [ ] Create component file:
      `apps/web/src/app/shared/components/image-gallery-selector/image-gallery-selector.component.ts`
- [ ] Create spec file:
      `apps/web/src/app/shared/components/image-gallery-selector/image-gallery-selector.component.spec.ts`
- [ ] Implement standalone component with OnPush change detection
- [ ] Define input/output interface (images, selectedImageKey, columns, aspectRatio,
      selectionChange)
- [ ] Create basic template structure with @if/@for control flow

### Phase 2: Grid Layout and Selection Logic (2 hours)

- [ ] Implement responsive CSS Grid layout (2-4 columns based on breakpoints)
- [ ] Add image display with proper aspect ratio handling
- [ ] Implement single selection logic (selectImage method)
- [ ] Add selection visual feedback (border, scale, checkmark icon)
- [ ] Add hover/active states with CSS transitions
- [ ] Test selection behavior manually in browser

### Phase 3: Keyboard Navigation and Accessibility (1.5 hours)

- [ ] Implement arrow key navigation (Up/Down/Left/Right)
- [ ] Add Space/Enter key selection
- [ ] Implement focus management (focusedIndex signal)
- [ ] Add ARIA attributes (role, aria-checked, aria-label, aria-live)
- [ ] Add visible focus ring for keyboard users
- [ ] Test keyboard navigation manually

### Phase 4: Unit Tests (1 hour)

- [ ] Test: Component renders with valid images array
- [ ] Test: Component handles empty images array (shows placeholder)
- [ ] Test: Single selection logic (selecting one deselects previous)
- [ ] Test: selectionChange event emits correct key
- [ ] Test: Keyboard navigation works (arrow keys)
- [ ] Test: Space/Enter triggers selection
- [ ] Test: Focus management works correctly
- [ ] Test: ARIA attributes present
- [ ] Test: Input validation (invalid images array)
- [ ] Test: Responsive column logic

---

**Story Status:** Ready for Development **Dependencies:** None **Blocked By:** None **Next Story:**
Story 18.2 - Form Builder Integration (IMAGE_GALLERY Field Type)
