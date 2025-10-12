# Story 18.2: Form Builder Integration (IMAGE_GALLERY Field Type) - Brownfield Addition

**Epic:** Epic 18 - Image Gallery Selector - Brownfield Enhancement **Story Points:** 8 hours
**Priority:** High **Status:** Ready for Development **Dependencies:** Story 18.1 (Shared Image
Gallery Selector Component)

---

## User Story

**As a** form creator, **I want** to add an IMAGE_GALLERY field type to my forms through the form
builder, **So that** I can create forms where users select one image from a gallery of options (like
choosing a product variant, avatar, or visual preference).

---

## Story Context

### Existing System Integration

**Integrates with:**

- `packages/shared/src/types/forms.types.ts` (add IMAGE_GALLERY enum + metadata interface)
- `FieldPaletteComponent` (apps/web/.../field-palette/field-palette.component.ts)
- `FieldPropertiesComponent` (apps/web/.../field-properties/field-properties.component.ts)
- `FieldPreviewRendererComponent`
  (apps/web/.../field-preview-renderer/field-preview-renderer.component.ts)
- `FormBuilderService` (apps/web/.../form-builder.service.ts)
- Existing image upload infrastructure (ImageUploadComponent, **DigitalOcean Spaces** storage)

**Technology:**

- Angular 20+ standalone components with OnPush change detection
- PrimeNG 17+ (FileUpload, Button, Accordion, InputText modules)
- TypeScript strict mode with shared types
- Form builder drag-and-drop system (Angular CDK)
- **DigitalOcean Spaces** for image storage (existing cloud object storage infrastructure)

**Follows pattern:**

- IMAGE field type implementation (ImagePropertiesPanel, ImagePreviewComponent, ImageMetadata)
- RADIO field type implementation (OptionsPropertiesPanel, RadioPreviewComponent)
- Field metadata pattern (GroupMetadata, HeadingMetadata, ImageMetadata, TextBlockMetadata)
- Properties panel pattern (accordion-based panels in field-properties/panels/)

**Touch points:**

- `packages/shared/src/types/forms.types.ts` (lines 9-42: FormFieldType enum)
- `packages/shared/src/types/forms.types.ts` (lines 109-335: Metadata interfaces)
- `apps/web/.../field-palette/field-palette.component.ts` (lines 298-325: fieldTypes array)
- `apps/web/.../field-properties/panels/` (create new image-gallery-properties-panel.component.ts)
- `apps/web/.../field-preview-renderer/` (create new image-gallery-preview.component.ts)
- `apps/web/.../field-preview-renderer/field-preview-renderer.component.ts` (add switch case)

---

## Acceptance Criteria

### Functional Requirements

1. **Add IMAGE_GALLERY to FormFieldType Enum**
   - Add `IMAGE_GALLERY = 'image_gallery'` to FormFieldType enum in shared package
   - Update FIELD_TYPE_CATEGORIES.INPUT_FIELDS to include IMAGE_GALLERY
   - IMAGE_GALLERY treated as input field (stores selected image key in submission)
   - Rebuild shared package after enum change: `npm run build:shared`
   - No breaking changes to existing field types

2. **Create ImageGalleryMetadata Interface**
   - Define ImageGalleryMetadata interface in `forms.types.ts`:
     ```typescript
     export interface ImageGalleryMetadata extends BaseFieldMetadata {
       /** Array of gallery images (2-10 images recommended) */
       images: { key: string; url: string; alt: string }[];
       /** Number of grid columns (2-4) */
       columns?: 2 | 3 | 4;
       /** Image aspect ratio */
       aspectRatio?: 'square' | '16:9' | 'auto';
       /** Maximum number of images allowed */
       maxImages?: number;
     }
     ```
   - Interface extends BaseFieldMetadata (customStyle support)
   - Default values: columns=4, aspectRatio='square', maxImages=10
   - **Images array stores DigitalOcean Spaces URLs** (not base64 or local file paths)

3. **Add IMAGE_GALLERY to Field Palette**
   - Add entry to `fieldTypes` array in FieldPaletteComponent:
     ```typescript
     {
       type: FormFieldType.IMAGE_GALLERY,
       icon: 'pi-images',
       label: 'Image Gallery',
       category: 'input'
     }
     ```
   - Appears in "Input Fields" section (not "Preview Elements")
   - Icon: `pi-images` (PrimeNG icon)
   - Draggable to form canvas (same behavior as other field types)
   - Clickable to add to canvas (same behavior as other field types)

4. **Create ImageGalleryPropertiesPanel Component**
   - New component:
     `apps/web/.../field-properties/panels/image-gallery-properties-panel.component.ts`
   - Manages gallery images (upload, delete, reorder)
   - Uses existing ImageUploadComponent for image upload
   - Image management features:
     - **Upload:** Click "Add Image" button → open file picker → **upload to DigitalOcean Spaces** →
       add DO Spaces URL to metadata.images array
     - **Delete:** Click trash icon on image thumbnail → remove from metadata.images array
     - **Reorder:** Drag-and-drop to reorder images (affects display order in gallery)
     - **Alt text:** Input field for each image's alt text (required for accessibility)
     - **Preview:** Shows thumbnail grid of uploaded images (uses ImageGallerySelectorComponent in
       read-only mode)
   - Validation rules:
     - Minimum 2 images required (show warning if < 2)
     - Maximum 10 images (configurable via metadata.maxImages)
     - Each image must have alt text (validate before save)
     - **Image URLs must be valid DigitalOcean Spaces URLs**
       (https://[bucket-name].[region].digitaloceanspaces.com/...)
   - Configuration options:
     - Grid columns dropdown (2, 3, or 4 columns)
     - Aspect ratio dropdown ('square', '16:9', 'auto')
     - Max images input (number, default 10)

5. **Create ImageGalleryPreviewComponent**
   - New component: `apps/web/.../field-preview-renderer/image-gallery-preview.component.ts`
   - Displays gallery in form builder canvas (non-interactive preview)
   - Uses ImageGallerySelectorComponent from Story 18.1
   - Preview mode: Shows thumbnail grid with mock selection (first image selected)
   - Disabled state: No click events (pointer-events: none)
   - Shows field label above gallery
   - Shows "No images uploaded" placeholder if metadata.images empty
   - Matches published form appearance exactly

6. **Integrate with FieldPreviewRendererComponent**
   - Add switch case for FormFieldType.IMAGE_GALLERY
   - Renders ImageGalleryPreviewComponent
   - Passes field.metadata as ImageGalleryMetadata
   - Follows existing pattern (matches IMAGE, RADIO, CHECKBOX cases)

7. **Integrate with FieldPropertiesComponent**
   - Add switch case for FormFieldType.IMAGE_GALLERY in properties panel selector
   - Renders ImageGalleryPropertiesPanel
   - Updates field metadata on changes (via FormBuilderService)
   - Validates metadata before saving (minimum 2 images, all have alt text)

### Integration Requirements

8. **FormBuilderService Integration**
   - Add IMAGE_GALLERY to supported field types
   - Create default ImageGalleryMetadata when field added:
     ```typescript
     {
       images: [],
       columns: 4,
       aspectRatio: 'square',
       maxImages: 10,
       customStyle: ''
     }
     ```
   - Update metadata when properties panel changes
   - Validate metadata on form save (minimum 2 images)

9. **Image Upload Infrastructure (DigitalOcean Spaces)**
   - Reuse existing ImageUploadComponent (from IMAGE field type)
   - **Upload images to DigitalOcean Spaces** (same bucket/path as IMAGE fields)
   - **Store DigitalOcean Spaces URLs** in metadata.images array (format:
     `https://[bucket].[region].digitaloceanspaces.com/[path]`)
   - Generate unique keys for each image (UUID or timestamp-based)
   - Image optimization: Resize to max 800px width server-side before uploading to DO Spaces
   - DO Spaces configuration: Use existing bucket and access keys (no new infrastructure needed)

10. **Backward Compatibility**
    - Existing forms without IMAGE_GALLERY field continue to work
    - IMAGE_GALLERY fields in old schemas load correctly
    - No breaking changes to form schema structure
    - Graceful degradation: If metadata.images missing, show empty state

### Quality Requirements

11. **Unit Tests**
    - ImageGalleryPropertiesPanel: Upload, delete, reorder images
    - ImageGalleryPropertiesPanel: Validation (min 2 images, alt text required)
    - ImageGalleryPreviewComponent: Renders gallery with metadata
    - ImageGalleryPreviewComponent: Handles empty metadata.images
    - FieldPreviewRendererComponent: IMAGE_GALLERY switch case works
    - FieldPropertiesComponent: IMAGE_GALLERY properties panel renders
    - FormBuilderService: Creates default metadata correctly
    - Minimum 15 unit tests covering all acceptance criteria

12. **Integration Testing**
    - Add IMAGE_GALLERY field from palette → verify appears on canvas
    - Upload 3 images via properties panel → verify URLs stored in metadata
    - Delete 1 image → verify removed from metadata.images
    - Reorder images → verify order updated in metadata
    - Save form → verify IMAGE_GALLERY field persists in schema
    - Load form → verify IMAGE_GALLERY field renders correctly

13. **Accessibility**
    - Properties panel: All inputs have labels and aria-labels
    - Image upload: File picker accessible via keyboard
    - Image thumbnails: Alt text displayed for screen readers
    - Delete buttons: Aria-labels ("Delete image {{alt}}")
    - Validation errors: Announced via aria-live regions

---

## Technical Notes

### Integration Approach

**1. Shared Package Changes (packages/shared/src/types/forms.types.ts):**

```typescript
// Add to FormFieldType enum (line 42)
export enum FormFieldType {
  // ... existing fields
  IMAGE = 'image',
  TEXT_BLOCK = 'text_block',
  IMAGE_GALLERY = 'image_gallery', // NEW
}

// Update FIELD_TYPE_CATEGORIES (line 49)
export const FIELD_TYPE_CATEGORIES = {
  INPUT_FIELDS: [
    // ... existing input fields
    FormFieldType.TOGGLE,
    FormFieldType.IMAGE_GALLERY, // NEW
  ] as const,
  // ...
} as const;

// Add ImageGalleryMetadata interface (after TextBlockMetadata, line 216)
/**
 * Image gallery metadata for IMAGE_GALLERY field type
 * Stores array of images for single-selection gallery
 */
export interface ImageGalleryMetadata extends BaseFieldMetadata {
  /** Array of gallery images (2-10 images recommended) */
  images: { key: string; url: string; alt: string }[];
  /** Number of grid columns (2-4, default: 4) */
  columns?: 2 | 3 | 4;
  /** Image aspect ratio (default: 'square') */
  aspectRatio?: 'square' | '16:9' | 'auto';
  /** Maximum number of images allowed (default: 10) */
  maxImages?: number;
}

// Update FormField.metadata union type (line 276)
export interface FormField {
  // ...
  metadata?:
    | GroupMetadata
    | HeadingMetadata
    | ImageMetadata
    | TextBlockMetadata
    | ImageGalleryMetadata;
  // ...
}
```

**2. Field Palette Integration (field-palette.component.ts):**

```typescript
// Add to fieldTypes array (line 324, after TEXT_BLOCK)
readonly fieldTypes: FieldTypeDefinition[] = [
  // ... existing fields
  {
    type: FormFieldType.TEXT_BLOCK,
    icon: 'pi-align-justify',
    label: 'Text Block',
    category: 'preview',
  },
  {
    type: FormFieldType.IMAGE_GALLERY,
    icon: 'pi-images',
    label: 'Image Gallery',
    category: 'input', // INPUT field, not preview
  },
];
```

**3. ImageGalleryPropertiesPanel Component Structure:**

```typescript
@Component({
  selector: 'app-image-gallery-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AccordionModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    ImageUploadComponent,
    ImageGallerySelectorComponent,
  ],
  template: `
    <p-accordion [activeIndex]="0">
      <!-- Gallery Images Section -->
      <p-accordionTab header="Gallery Images" [selected]="true">
        <!-- Image Upload -->
        <div class="mb-4">
          <button
            pButton
            type="button"
            label="Add Image"
            icon="pi pi-plus"
            (click)="openImageUpload()"
            [disabled]="images().length >= maxImages()"
            class="mb-3"
          ></button>
          <p class="text-xs text-gray-500">
            {{ images().length }} / {{ maxImages() }} images
            @if (images().length < 2) {
              <span class="text-orange-600">(Minimum 2 required)</span>
            }
          </p>
        </div>

        <!-- Image Thumbnails with Delete/Reorder -->
        <div class="image-list space-y-2">
          @for (image of images(); track image.key; let idx = $index) {
            <div class="image-item flex items-center gap-3 p-2 border rounded">
              <img [src]="image.url" [alt]="image.alt" class="w-16 h-16 object-cover rounded" />
              <div class="flex-1">
                <input
                  type="text"
                  pInputText
                  placeholder="Alt text (required)"
                  [value]="image.alt"
                  (input)="updateAltText(idx, $any($event.target).value)"
                  class="w-full mb-1"
                />
                <p class="text-xs text-gray-500">{{ image.key }}</p>
              </div>
              <button
                pButton
                type="button"
                icon="pi pi-trash"
                [attr.aria-label]="'Delete image ' + image.alt"
                (click)="deleteImage(idx)"
                severity="danger"
                [text]="true"
              ></button>
            </div>
          }
        </div>

        <!-- Preview -->
        @if (images().length > 0) {
          <div class="mt-4">
            <p class="text-sm font-semibold mb-2">Preview:</p>
            <app-image-gallery-selector
              [images]="images()"
              [columns]="columns()"
              [aspectRatio]="aspectRatio()"
              [selectedImageKey]="images()[0]?.key"
            />
          </div>
        }
      </p-accordionTab>

      <!-- Gallery Settings Section -->
      <p-accordionTab header="Gallery Settings">
        <div class="space-y-4">
          <!-- Grid Columns -->
          <div>
            <label class="block text-sm font-medium mb-1">Grid Columns</label>
            <p-dropdown
              [options]="columnOptions"
              [ngModel]="columns()"
              (ngModelChange)="updateColumns($event)"
              placeholder="Select columns"
              class="w-full"
            ></p-dropdown>
          </div>

          <!-- Aspect Ratio -->
          <div>
            <label class="block text-sm font-medium mb-1">Image Aspect Ratio</label>
            <p-dropdown
              [options]="aspectRatioOptions"
              [ngModel]="aspectRatio()"
              (ngModelChange)="updateAspectRatio($event)"
              placeholder="Select aspect ratio"
              class="w-full"
            ></p-dropdown>
          </div>

          <!-- Max Images -->
          <div>
            <label class="block text-sm font-medium mb-1">Maximum Images</label>
            <input
              type="number"
              pInputText
              [value]="maxImages()"
              (input)="updateMaxImages(+$any($event.target).value)"
              min="2"
              max="20"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">Recommended: 2-10 images</p>
          </div>
        </div>
      </p-accordionTab>
    </p-accordion>
  `,
})
export class ImageGalleryPropertiesPanel {
  @Input({ required: true }) field!: FormField;
  @Output() metadataChange = new EventEmitter<ImageGalleryMetadata>();

  // Signals
  images = signal<{ key: string; url: string; alt: string }[]>([]);
  columns = signal<2 | 3 | 4>(4);
  aspectRatio = signal<'square' | '16:9' | 'auto'>('square');
  maxImages = signal<number>(10);

  // Dropdown options
  columnOptions = [
    { label: '2 Columns', value: 2 },
    { label: '3 Columns', value: 3 },
    { label: '4 Columns', value: 4 },
  ];
  aspectRatioOptions = [
    { label: 'Square (1:1)', value: 'square' },
    { label: 'Widescreen (16:9)', value: '16:9' },
    { label: 'Auto', value: 'auto' },
  ];

  ngOnInit(): void {
    this.loadMetadata();
  }

  loadMetadata(): void {
    const metadata = this.field.metadata as ImageGalleryMetadata;
    if (metadata) {
      this.images.set(metadata.images || []);
      this.columns.set(metadata.columns || 4);
      this.aspectRatio.set(metadata.aspectRatio || 'square');
      this.maxImages.set(metadata.maxImages || 10);
    }
  }

  openImageUpload(): void {
    // Trigger image upload component
    // On success, add URL to images array
  }

  deleteImage(index: number): void {
    const updated = [...this.images()];
    updated.splice(index, 1);
    this.images.set(updated);
    this.emitMetadata();
  }

  updateAltText(index: number, altText: string): void {
    const updated = [...this.images()];
    updated[index] = { ...updated[index], alt: altText };
    this.images.set(updated);
    this.emitMetadata();
  }

  updateColumns(columns: 2 | 3 | 4): void {
    this.columns.set(columns);
    this.emitMetadata();
  }

  updateAspectRatio(ratio: 'square' | '16:9' | 'auto'): void {
    this.aspectRatio.set(ratio);
    this.emitMetadata();
  }

  updateMaxImages(max: number): void {
    this.maxImages.set(Math.max(2, Math.min(max, 20)));
    this.emitMetadata();
  }

  emitMetadata(): void {
    const metadata: ImageGalleryMetadata = {
      images: this.images(),
      columns: this.columns(),
      aspectRatio: this.aspectRatio(),
      maxImages: this.maxImages(),
    };
    this.metadataChange.emit(metadata);
  }
}
```

**4. ImageGalleryPreviewComponent Structure:**

```typescript
@Component({
  selector: 'app-image-gallery-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ImageGallerySelectorComponent],
  template: `
    <div class="field-preview">
      @if (metadata.images && metadata.images.length > 0) {
        <app-image-gallery-selector
          [images]="metadata.images"
          [columns]="metadata.columns || 4"
          [aspectRatio]="metadata.aspectRatio || 'square'"
          [selectedImageKey]="metadata.images[0]?.key"
          class="pointer-events-none"
        />
      } @else {
        <div class="empty-state">
          <i class="pi pi-images text-4xl text-gray-400"></i>
          <p class="text-sm text-gray-500">No images uploaded</p>
          <p class="text-xs text-gray-400">Add images in the properties panel</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
    .field-preview {
      pointer-events: none;
      opacity: 0.9;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-center;
      padding: 2rem;
      background: #f9fafb;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      min-height: 150px;
    }
  `,
  ],
})
export class ImageGalleryPreviewComponent {
  @Input({ required: true }) field!: FormField;

  get metadata(): ImageGalleryMetadata {
    return (
      (this.field.metadata as ImageGalleryMetadata) || {
        images: [],
        columns: 4,
        aspectRatio: 'square',
        maxImages: 10,
      }
    );
  }
}
```

**5. FieldPreviewRendererComponent Integration:**

```typescript
// Add switch case (after IMAGE case)
@switch (field().type) {
  // ... existing cases
  @case (FormFieldType.IMAGE) {
    <app-image-preview [field]="field()" />
  }
  @case (FormFieldType.IMAGE_GALLERY) {
    <app-image-gallery-preview [field]="field()" />
  }
  @case (FormFieldType.TEXT_BLOCK) {
    <app-text-block-preview [field]="field()" />
  }
  // ...
}
```

### Existing Pattern Reference

**ImagePropertiesPanel (image-properties-panel.component.ts lines 1-150):**

- Accordion-based layout with sections
- Image upload using ImageUploadComponent
- Metadata management (width, height, alignment, alt text)
- Preview of uploaded image
- Validation (alt text required)

**OptionsPropertiesPanel (options-properties-panel.component.ts lines 1-200):**

- Manages array of options (label + value pairs)
- Add/delete/reorder options
- Validation (minimum 2 options for radio/select)
- Inline editing of option labels

**Key Constraints:**

- IMAGE_GALLERY is an INPUT field (collects data), not a display element
- **Images stored as DigitalOcean Spaces URLs** (not base64, local paths, or external URLs)
- Minimum 2 images required (validate before form publish)
- Maximum 10 images recommended (configurable up to 20)
- Each image must have alt text (accessibility requirement)
- Properties panel must use existing ImageUploadComponent (no duplicate upload logic)
- Builder preview is read-only (no selection interaction)
- **All images must be uploaded to DigitalOcean Spaces** (no external image hosting allowed)

---

## Definition of Done

- ✅ IMAGE_GALLERY added to FormFieldType enum in shared package
- ✅ ImageGalleryMetadata interface created in shared package
- ✅ Shared package rebuilt successfully (`npm run build:shared`)
- ✅ IMAGE_GALLERY added to field palette (Input Fields section, pi-images icon)
- ✅ ImageGalleryPropertiesPanel created and functional:
  - ✅ Upload images via ImageUploadComponent
  - ✅ Delete images (trash icon)
  - ✅ Edit alt text for each image
  - ✅ Configure columns, aspect ratio, max images
  - ✅ Preview gallery in properties panel
  - ✅ Validation: Minimum 2 images, alt text required
- ✅ ImageGalleryPreviewComponent created and renders correctly:
  - ✅ Shows thumbnail grid on canvas
  - ✅ Mock selection (first image)
  - ✅ Read-only (pointer-events: none)
  - ✅ Empty state when no images
- ✅ FieldPreviewRendererComponent integrated (IMAGE_GALLERY switch case)
- ✅ FieldPropertiesComponent integrated (IMAGE_GALLERY properties panel)
- ✅ FormBuilderService creates default metadata correctly
- ✅ Drag IMAGE_GALLERY from palette to canvas works
- ✅ Unit tests written and passing (minimum 15 tests)
- ✅ Integration tests pass (add field → upload images → save form → load form)
- ✅ No console errors or warnings
- ✅ TypeScript compilation successful
- ✅ Existing form builder functionality unchanged (regression testing)
- ✅ Code follows existing patterns (IMAGE + RADIO field patterns)
- ✅ JSDoc comments added for all public APIs
- ✅ Ready for Story 18.3 (Public Form Renderer Integration)

---

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk:** Image upload infrastructure complexity could cause issues with DigitalOcean Spaces
integration or metadata storage size limits.

**Mitigation:**

1. Reuse existing ImageUploadComponent (proven working pattern with DO Spaces)
2. Store DigitalOcean Spaces URLs only (not base64) to minimize metadata size
3. Test with 10 images (verify form schema size acceptable)
4. Add validation to prevent > 20 images (metadata size limit)
5. Implement image optimization (resize to max 800px width before uploading to DO Spaces)
6. Add error handling for DO Spaces upload failures (show user-friendly messages)
7. Test with slow network (verify DO Spaces loading states work)
8. Verify DO Spaces CORS configuration allows uploads from form builder domain

**Rollback:**

- Remove IMAGE_GALLERY from FormFieldType enum
- Remove IMAGE_GALLERY from field palette
- Delete ImageGalleryPropertiesPanel and ImageGalleryPreviewComponent files
- Remove switch cases from FieldPreviewRendererComponent and FieldPropertiesComponent
- Rebuild shared package
- Existing forms with IMAGE_GALLERY fields will show "Unknown field type" (graceful degradation)
- Rollback complexity: Medium (30 minutes, multiple files + shared package rebuild)

### Compatibility Verification

- ✅ **No breaking changes to existing APIs** - Additive changes only
- ✅ **Database changes** - None (metadata stored in form schema JSON)
- ✅ **UI changes follow existing design patterns** - Exact replication of IMAGE + RADIO patterns
- ✅ **Performance impact is minimal** - Image URLs stored (not base64), lazy loading enabled

---

## Implementation Checklist

### Phase 1: Shared Package Changes (1 hour)

- [ ] Add IMAGE_GALLERY to FormFieldType enum
- [ ] Update FIELD_TYPE_CATEGORIES.INPUT_FIELDS
- [ ] Create ImageGalleryMetadata interface
- [ ] Update FormField.metadata union type
- [ ] Rebuild shared package: `npm run build:shared`
- [ ] Verify TypeScript compilation in both API and Web apps

### Phase 2: Field Palette Integration (30 minutes)

- [ ] Add IMAGE_GALLERY to fieldTypes array in FieldPaletteComponent
- [ ] Test drag-and-drop from palette to canvas
- [ ] Test click to add field to canvas
- [ ] Verify field appears in Input Fields section

### Phase 3: ImageGalleryPropertiesPanel (3 hours)

- [ ] Create component file and spec file
- [ ] Implement accordion layout (Gallery Images + Gallery Settings)
- [ ] Integrate ImageUploadComponent for image upload
- [ ] Implement image list with delete/alt text edit
- [ ] Add gallery preview using ImageGallerySelectorComponent
- [ ] Implement configuration options (columns, aspect ratio, max images)
- [ ] Add validation (min 2 images, alt text required)
- [ ] Implement metadata emit on changes
- [ ] Write unit tests (minimum 8 tests)

### Phase 4: ImageGalleryPreviewComponent (1 hour)

- [ ] Create component file and spec file
- [ ] Implement template using ImageGallerySelectorComponent
- [ ] Add read-only styling (pointer-events: none)
- [ ] Implement empty state
- [ ] Add metadata getter with defaults
- [ ] Write unit tests (minimum 4 tests)

### Phase 5: Integration with Form Builder (1.5 hours)

- [ ] Add switch case to FieldPreviewRendererComponent
- [ ] Add switch case to FieldPropertiesComponent
- [ ] Update FormBuilderService to create default metadata
- [ ] Test end-to-end: Add field → Upload images → Save form
- [ ] Test form loading with IMAGE_GALLERY field
- [ ] Test metadata updates persist correctly

### Phase 6: Testing and Validation (1 hour)

- [ ] Run all unit tests:
      `npm --workspace=apps/web run test -- --include="**/image-gallery*.spec.ts"`
- [ ] Manual integration testing (add/edit/delete images)
- [ ] Test with 2, 5, and 10 images (verify performance)
- [ ] Test validation (min 2 images, alt text required)
- [ ] Test drag-and-drop from palette
- [ ] Verify no regressions in existing field types
- [ ] Test TypeScript compilation
- [ ] Check console for errors/warnings

---

**Story Status:** Ready for Development **Dependencies:** Story 18.1 (Shared Image Gallery Selector
Component) **Blocked By:** None **Next Story:** Story 18.3 - Public Form Renderer and Submissions
Integration

---

## Dev Notes

**Image Upload Implementation (DigitalOcean Spaces):**

- Reuse existing ImageUploadComponent from IMAGE field type
- Upload endpoint: `/api/upload/image` (same as IMAGE field, uploads to DO Spaces)
- **Storage:** DigitalOcean Spaces bucket (same bucket as IMAGE field)
- **DO Spaces URL format:**
  `https://[bucket-name].[region].digitaloceanspaces.com/images/image-gallery-[timestamp]-[uuid].jpg`
- Image optimization: Resize to max 800px width server-side before uploading to DO Spaces
- Generate unique key: `image-gallery-${Date.now()}-${randomUUID()}`
- **DO Spaces configuration:** Uses existing access keys and bucket (no new infrastructure)
- **Image persistence:** Once uploaded to DO Spaces, images remain accessible even if form deleted
  (consider cleanup strategy)

**Validation Strategy:**

- Client-side validation in properties panel (show warnings immediately)
- Form save validation (prevent save if < 2 images or missing alt text)
- Form publish validation (block publish if validation fails)
- User-friendly error messages (highlight missing fields)

**Testing Focus:**

- Properties panel CRUD operations (upload, delete, edit)
- Metadata persistence (save form → reload → verify metadata intact)
- Validation edge cases (0 images, 1 image, missing alt text, > max images)
- Integration with FormBuilderService (field creation, metadata updates)
