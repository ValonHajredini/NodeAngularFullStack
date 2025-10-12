# Story 18.3: Public Form Renderer and Submissions Integration - Brownfield Addition

**Epic:** Epic 18 - Image Gallery Selector - Brownfield Enhancement **Story Points:** 5 hours
**Priority:** High **Status:** Ready for Development **Dependencies:** Story 18.1 (Shared
Component), Story 18.2 (Form Builder Integration)

---

## User Story

**As a** form end-user, **I want** to select one image from a gallery when filling out a published
form, **So that** I can provide my choice visually (e.g., product variant, avatar preference, design
selection) and have my selection stored in the form submission.

---

## Story Context

### Existing System Integration

**Integrates with:**

- `FormRendererComponent` (apps/web/.../public/form-renderer/form-renderer.component.ts)
- `FormRendererService` (apps/web/.../public/form-renderer/form-renderer.service.ts)
- Form submission API (`POST /api/public/forms/:shortCode/submit`)
- Form validation logic (required field validation)
- Existing IMAGE_GALLERY field type (from Story 18.2)
- ImageGallerySelectorComponent (from Story 18.1)

**Technology:**

- Angular 20+ standalone component with reactive forms
- FormRendererComponent reactive form integration (Angular FormGroup/FormControl)
- Backend Express.js submission endpoint (no changes required)
- PostgreSQL form submissions storage (form_submissions table)
- Validation: Client-side (Angular validators) + server-side (express-validator)

**Follows pattern:**

- RADIO field renderer implementation (apps/web/.../public/form-renderer/)
- SELECT field renderer implementation
- IMAGE field renderer implementation (non-interactive display)
- Reactive form control binding pattern (FormGroup integration)

**Touch points:**

- `apps/web/src/app/features/public/form-renderer/form-renderer.component.ts` (add switch case)
- `apps/web/src/app/features/public/form-renderer/form-renderer.service.ts` (no changes needed)
- Create new: `apps/web/src/app/features/public/form-renderer/image-gallery-renderer.component.ts`
- Backend validation: `apps/api/src/validators/forms.validator.ts` (no changes needed)

---

## Acceptance Criteria

### Functional Requirements

1. **Create ImageGalleryRendererComponent**
   - New component: `apps/web/.../public/form-renderer/image-gallery-renderer.component.ts`
   - Uses ImageGallerySelectorComponent from Story 18.1
   - **Interactive mode** (not disabled like builder preview)
   - Displays field label above gallery
   - Shows required indicator (\*) if field.required is true
   - Shows help text below gallery if field.helpText exists
   - Initial state: No image selected (selectedImageKey = null)

2. **Reactive Form Integration**
   - Component receives FormControl from parent FormRendererComponent
   - Binds FormControl value to ImageGallerySelectorComponent selectedImageKey input
   - On selectionChange event: Updates FormControl value with selected image key
   - FormControl value type: `string | null` (selected image key or null)
   - FormControl validates correctly (required validator if field.required)
   - FormControl touched on first selection (for validation display)

3. **Selection Behavior**
   - User clicks image → Image selected with visual feedback (border + checkmark)
   - User clicks different image → Previous selection cleared, new image selected
   - User can change selection unlimited times before submitting
   - Selected image key stored in FormControl value
   - FormControl dirty flag set on first selection
   - FormControl valid/invalid based on required validator

4. **Form Submission**
   - On form submit: Selected image key included in submission payload
   - Submission data format: `{ [field.fieldName]: "selectedImageKey" }`
   - Example: `{ "productVariant": "image-gallery-abc123" }`
   - If no selection and field required: Form validation prevents submission
   - If no selection and field optional: Null value submitted
   - Backend receives and stores image key in form_submissions.values JSON column

5. **Validation and Error Display**
   - Required validation: Shows error if field.required and no selection
   - Error message: "Please select an image" (default) or field.validation.errorMessage
   - Error displays below gallery when FormControl touched and invalid
   - Error styling: Red text with pi-exclamation-circle icon
   - Validation triggers on FormControl touch (first click in gallery)
   - Validation clears when user selects image

### Integration Requirements

6. **FormRendererComponent Integration**
   - Add switch case for FormFieldType.IMAGE_GALLERY
   - Renders ImageGalleryRendererComponent
   - Passes field definition and FormControl
   - Follows existing field renderer pattern (RADIO, SELECT, etc.)
   - No changes to form submission logic (works automatically)

7. **FormControl Value Mapping**
   - FormControl stores selected image key as string value
   - Example: `formGroup.controls['fieldName'].value = "image-gallery-abc123"`
   - Null value when no selection (not empty string)
   - FormControl initialized with null (no default selection)
   - Value serializes correctly for JSON submission payload

8. **Backward Compatibility**
   - Existing form submissions without IMAGE_GALLERY continue to work
   - New IMAGE_GALLERY submissions store image key as string value
   - Backend validation accepts string values for IMAGE_GALLERY fields
   - Graceful degradation: If metadata.images missing, show error message

### Quality Requirements

9. **Unit Tests**
   - ImageGalleryRendererComponent: Renders gallery with field metadata
   - ImageGalleryRendererComponent: Updates FormControl on selection
   - ImageGalleryRendererComponent: Shows validation error when required + no selection
   - ImageGalleryRendererComponent: Clears validation error on selection
   - ImageGalleryRendererComponent: Handles empty metadata.images gracefully
   - FormRendererComponent: IMAGE_GALLERY switch case renders component
   - FormRendererComponent: IMAGE_GALLERY field included in form submission
   - Minimum 10 unit tests covering all acceptance criteria

10. **Integration Testing (E2E)**
    - Create form with IMAGE_GALLERY field (3 images) in form builder
    - Publish form (generate short link)
    - Open public form URL
    - Select image from gallery
    - Submit form
    - Verify submission stored in database with correct image key
    - Verify submission displays in submissions list

11. **Accessibility**
    - Gallery is keyboard-navigable (arrow keys, Space, Enter)
    - Field label associated with gallery (for="fieldName")
    - Required indicator announced by screen readers
    - Validation errors announced via aria-live region
    - Focus management works correctly (Tab into/out of gallery)
    - Screen reader announces selection changes

---

## Technical Notes

### Integration Approach

**1. ImageGalleryRendererComponent Structure:**

```typescript
@Component({
  selector: 'app-image-gallery-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ImageGallerySelectorComponent],
  template: `
    <div class="form-field mb-4">
      <!-- Field Label -->
      <label [for]="field.fieldName" class="block text-sm font-medium text-gray-700 mb-2">
        {{ field.label }}
        @if (field.required) {
          <span class="text-red-500 ml-1" aria-label="required">*</span>
        }
      </label>

      <!-- Help Text -->
      @if (field.helpText) {
        <p class="text-xs text-gray-500 mb-2">{{ field.helpText }}</p>
      }

      <!-- Image Gallery -->
      @if (metadata.images && metadata.images.length > 0) {
        <app-image-gallery-selector
          [images]="metadata.images"
          [columns]="metadata.columns || 4"
          [aspectRatio]="metadata.aspectRatio || 'square'"
          [selectedImageKey]="control.value"
          (selectionChange)="onSelectionChange($event)"
        />
      } @else {
        <div class="error-state">
          <i class="pi pi-exclamation-triangle text-2xl text-red-500"></i>
          <p class="text-sm text-red-600">Gallery configuration error: No images available</p>
        </div>
      }

      <!-- Validation Error -->
      @if (control.invalid && control.touched) {
        <div class="validation-error mt-2 flex items-center gap-2" aria-live="polite">
          <i class="pi pi-exclamation-circle text-red-500"></i>
          <span class="text-sm text-red-600">
            {{ getErrorMessage() }}
          </span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .form-field {
        width: 100%;
      }

      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: #fef2f2;
        border: 2px solid #fca5a5;
        border-radius: 8px;
        min-height: 150px;
      }

      .validation-error {
        animation: slideDown 0.2s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ImageGalleryRendererComponent implements OnInit {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) control!: FormControl;

  /**
   * Get image gallery metadata with defaults
   */
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

  ngOnInit(): void {
    // Initialize FormControl value as null (no default selection)
    if (this.control.value === undefined) {
      this.control.setValue(null, { emitEvent: false });
    }
  }

  /**
   * Handles image selection from gallery
   * Updates FormControl value and marks as touched
   */
  onSelectionChange(imageKey: string): void {
    this.control.setValue(imageKey);
    this.control.markAsTouched();
    this.control.markAsDirty();
  }

  /**
   * Gets validation error message
   */
  getErrorMessage(): string {
    if (this.control.hasError('required')) {
      return this.field.validation?.errorMessage || 'Please select an image';
    }
    return 'Invalid selection';
  }
}
```

**2. FormRendererComponent Integration:**

```typescript
// In FormRendererComponent template (add switch case)
@switch (field.type) {
  // ... existing cases
  @case (FormFieldType.RADIO) {
    <div class="form-field">
      <label>{{ field.label }}</label>
      @for (option of field.options; track option.value) {
        <p-radioButton
          [formControlName]="field.fieldName"
          [value]="option.value"
          [label]="option.label"
        />
      }
    </div>
  }
  @case (FormFieldType.IMAGE_GALLERY) {
    <app-image-gallery-renderer
      [field]="field"
      [control]="$any(formGroup.controls[field.fieldName])"
    />
  }
  @case (FormFieldType.IMAGE) {
    <app-image-preview [field]="field" />
  }
  // ...
}
```

**3. FormControl Creation (in FormRendererService):**

```typescript
// No changes needed - existing createFormControl method works automatically
private createFormControl(field: FormField): FormControl {
  const validators = [];

  if (field.required) {
    validators.push(Validators.required);
  }

  // IMAGE_GALLERY uses default null initial value
  return new FormControl(null, validators);
}
```

**4. Form Submission Payload Example:**

```typescript
// Before submission (FormGroup value)
{
  "userName": "John Doe",
  "email": "john@example.com",
  "productVariant": "image-gallery-1234567890-abc123", // IMAGE_GALLERY selection
  "agreeToTerms": true
}

// After submission (stored in database)
{
  "form_submissions": {
    "id": "uuid",
    "form_schema_id": "uuid",
    "values": {
      "userName": "John Doe",
      "email": "john@example.com",
      "productVariant": "image-gallery-1234567890-abc123", // String value
      "agreeToTerms": true
    },
    "submitted_at": "2025-01-11T12:00:00Z"
  }
}
```

### Existing Pattern Reference

**Radio Renderer Pattern (form-renderer.component.ts):**

- Uses FormControl binding with `[formControlName]="field.fieldName"`
- Validation displays below field when `control.invalid && control.touched`
- Required indicator (\*) shown when `field.required`
- Help text displayed when `field.helpText` exists

**Select Renderer Pattern:**

- Dropdown component bound to FormControl
- Options array mapped to dropdown options
- Single value stored in FormControl (not array)
- Validation error displayed below dropdown

**Key Constraints:**

- FormControl value must be serializable to JSON (string, not object)
- Component must handle null value gracefully (initial state)
- Validation must trigger on touch (first interaction)
- Component must work with existing form submission API (no backend changes)
- Selected image key must match metadata.images[].key format

---

## Definition of Done

- ✅ ImageGalleryRendererComponent created and renders correctly
- ✅ Component uses ImageGallerySelectorComponent (interactive mode)
- ✅ FormControl integration works (value updates on selection)
- ✅ Validation works (required field shows error when no selection)
- ✅ Validation error clears when user selects image
- ✅ FormRendererComponent switch case added for IMAGE_GALLERY
- ✅ Unit tests written and passing (minimum 10 tests)
- ✅ E2E test passes:
  - ✅ Create form with IMAGE_GALLERY field (3 images)
  - ✅ Publish form
  - ✅ Open public form URL
  - ✅ Select image from gallery
  - ✅ Submit form
  - ✅ Verify submission stored with correct image key
  - ✅ Verify submission displays in submissions list
- ✅ Keyboard navigation works (arrow keys, Space, Enter)
- ✅ Screen reader announces selection and validation errors
- ✅ Mobile responsive behavior verified
- ✅ No console errors or warnings
- ✅ TypeScript compilation successful
- ✅ Existing form renderer functionality unchanged (regression testing)
- ✅ Code follows existing field renderer patterns (RADIO, SELECT)
- ✅ JSDoc comments added for all public methods
- ✅ **Epic 18 complete** - All 3 stories delivered

---

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk:** FormControl value serialization could fail if component stores object instead of
string, causing submission API errors.

**Mitigation:**

1. Store only image key as string value (not image object)
2. Add TypeScript type checking: `FormControl<string | null>`
3. Unit test FormControl value format (verify string type)
4. Integration test submission payload (verify JSON serializable)
5. Add console.warn if invalid value type detected
6. Backend validation accepts string values (existing validator works)

**Rollback:**

- Remove IMAGE_GALLERY switch case from FormRendererComponent
- Delete ImageGalleryRendererComponent files
- Forms with IMAGE_GALLERY fields will not render gallery (show "Unknown field type")
- Existing submissions with IMAGE_GALLERY data remain intact (no data loss)
- Rollback complexity: Simple (15 minutes, remove switch case + delete files)

### Compatibility Verification

- ✅ **No breaking changes to existing APIs** - Uses existing submission endpoint
- ✅ **Database changes** - None (image key stored as string in values JSON)
- ✅ **UI changes follow existing design patterns** - Matches RADIO/SELECT renderer patterns
- ✅ **Performance impact is negligible** - ImageGallerySelectorComponent already optimized

---

## Implementation Checklist

### Phase 1: ImageGalleryRendererComponent (2 hours)

- [ ] Create component file: `image-gallery-renderer.component.ts`
- [ ] Create spec file: `image-gallery-renderer.component.spec.ts`
- [ ] Implement template with label, gallery, help text, validation error
- [ ] Add FormControl integration (value binding, selectionChange handler)
- [ ] Implement validation error display
- [ ] Add metadata getter with defaults
- [ ] Test component in isolation (manual browser testing)

### Phase 2: FormRendererComponent Integration (30 minutes)

- [ ] Add IMAGE_GALLERY switch case to FormRendererComponent template
- [ ] Pass field and FormControl to ImageGalleryRendererComponent
- [ ] Test rendering in published form context
- [ ] Verify FormControl value updates on selection

### Phase 3: Unit Tests (1 hour)

- [ ] Test: Component renders with valid metadata
- [ ] Test: Component handles empty metadata.images
- [ ] Test: FormControl value updates on selection
- [ ] Test: Validation error shows when required + no selection
- [ ] Test: Validation error clears on selection
- [ ] Test: FormControl touched/dirty flags set correctly
- [ ] Test: getErrorMessage returns correct message
- [ ] Test: Field label displays correctly
- [ ] Test: Required indicator shows when field.required
- [ ] Test: Help text displays when field.helpText exists

### Phase 4: Integration (E2E) Testing (1.5 hours)

- [ ] Create test form in form builder with IMAGE_GALLERY field (3 images)
- [ ] Publish form (generate short link)
- [ ] Open public form URL in browser
- [ ] Verify gallery renders correctly
- [ ] Select first image (verify visual feedback)
- [ ] Select different image (verify previous deselected)
- [ ] Submit form without selection (verify validation error)
- [ ] Select image and submit form
- [ ] Verify submission stored in database:
  - [ ] Query form_submissions table
  - [ ] Verify values JSON contains image key
  - [ ] Verify image key matches expected format
- [ ] Open submissions list in form builder
- [ ] Verify submission displays with correct image key value
- [ ] Test with multiple submissions (verify each stores correct key)

---

**Story Status:** Ready for Development **Dependencies:** Story 18.1 (Shared Component), Story 18.2
(Form Builder Integration) **Blocked By:** None **Next Story:** None (Epic 18 complete)

---

## Dev Notes

**Testing Strategy:**

- Unit tests: Component rendering, FormControl integration, validation
- Integration tests: Full form submission flow (builder → publish → submit → database)
- Manual testing: Keyboard navigation, screen reader announcements, mobile responsiveness

**Validation Edge Cases:**

- No selection + required field → Show error
- No selection + optional field → Allow submission with null value
- Selection made → Clear any validation errors
- Invalid metadata (no images) → Show error state (not crash)

**FormControl Value Contract:**

- Type: `string | null`
- Format: `"image-gallery-{timestamp}-{uuid}"` (image key from metadata.images[].key)
- Initial value: `null` (no default selection)
- After selection: Selected image key as string
- Serialization: JSON.stringify works (primitive string value)

**Backend Compatibility:**

- No backend changes required (existing submission endpoint accepts any field values)
- Image key stored as string value in form_submissions.values JSON column
- Backend validation: Existing validator accepts string values for all field types
- No special handling needed for IMAGE_GALLERY field type

---

## E2E Test Script

**Manual E2E Test Steps:**

1. **Create Form (Form Builder):**
   - Navigate to Form Builder
   - Create new form: "Product Variant Selection"
   - Add IMAGE_GALLERY field:
     - Label: "Choose Product Variant"
     - Field Name: "productVariant"
     - Required: Yes
   - Upload 3 images via properties panel:
     - Image 1: Red variant (alt: "Red variant")
     - Image 2: Blue variant (alt: "Blue variant")
     - Image 3: Green variant (alt: "Green variant")
   - Configure: 3 columns, square aspect ratio
   - Save form

2. **Publish Form:**
   - Click "Publish" button
   - Verify short link generated
   - Copy public form URL

3. **Submit Form (Public URL):**
   - Open public form URL in new tab
   - Verify gallery renders with 3 images
   - Attempt to submit without selection → Verify error: "Please select an image"
   - Click "Red variant" image → Verify border highlights, checkmark appears
   - Click "Blue variant" image → Verify Red deselects, Blue selects
   - Submit form → Verify success message

4. **Verify Submission (Database):**
   - Query database:
     ```sql
     SELECT values FROM form_submissions
     WHERE form_schema_id = 'form-schema-uuid'
     ORDER BY submitted_at DESC
     LIMIT 1;
     ```
   - Expected result:
     ```json
     {
       "productVariant": "image-gallery-1234567890-uuid-blue"
     }
     ```
   - Verify image key matches Blue variant key from metadata

5. **Verify Submissions List (Form Builder):**
   - Navigate to Form Builder → Form → Submissions tab
   - Verify submission row displays
   - Verify "productVariant" column shows image key value
   - Click submission → Verify detail view shows image key

**Expected Outcome:** All steps complete successfully, submission stored with correct image key.
