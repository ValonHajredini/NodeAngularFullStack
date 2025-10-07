# Epic 11: Enhanced In-Place Field Editing with Live Preview

**Epic ID:** 11 **Epic Title:** Enhanced In-Place Field Editing with Live Preview - Brownfield
Enhancement **Status:** Planning **Priority:** High **Related Epics:** Epic 10 (Form Builder and
Dynamic Form Renderer)

---

## Epic Goal

Transform the Form Builder field editing experience to provide inline label editing and contextual
modal-based property editing, allowing users to see exactly how fields will appear on the final form
while building them.

---

## Epic Description

### Existing System Context

- **Current functionality:** Form Builder uses a three-panel layout with Field Palette (left), Form
  Canvas (center), and Field Properties (right sidebar)
- **Technology stack:** Angular 20+ standalone components, PrimeNG 17+, TypeScript strict mode,
  shared types package
- **Integration points:**
  - `FormBuilderService` for state management
  - `form-canvas.component.ts` for field display (currently card-based)
  - `field-properties.component.ts` for property editing
  - `FormField` interface in `@nodeangularfullstack/shared`
  - Supports 12 field types: text, email, number, select, textarea, file, checkbox, radio, date,
    datetime, toggle, divider

### Enhancement Details

#### What's being added/changed:

- Replace card-based field display with **live form field preview rendering**
- **Inline label editing** directly above each field input (click/focus to edit)
- **Click-to-edit modal** for field settings (name, placeholder, validation, help text)
- **Inline option management** for select/radio/checkbox fields with key-value pairs
- Real-time field type rendering matching final published form appearance

#### How it integrates:

- Modify `form-canvas.component.ts` to render actual form controls instead of field cards
- Create new inline editing components:
  - Inline label editor (contenteditable or input overlay)
  - Option manager component for choice fields
- Convert `field-properties.component.ts` to modal-based editing dialog
- Leverage existing `FormBuilderService` for state synchronization
- Maintain compatibility with existing `FormField` interface (no breaking changes)

#### Success criteria:

1. Fields render as they will appear on published form (WYSIWYG)
2. Users can edit labels inline with click/focus interaction
3. Settings modal opens with all field configuration options
4. Select/radio/checkbox options managed inline with add/remove/reorder
5. No breaking changes to existing form save/load functionality
6. Drag-drop and field selection work seamlessly with live previews

---

## Stories

### Story 1: Live Field Preview Rendering

**Goal:** Replace field cards with actual rendered form controls matching published form appearance

**Tasks:**

- Create field renderer component for each field type (text input, select dropdown, textarea, etc.)
- Update `form-canvas.component.ts` template to render live form controls
- Maintain drag-drop functionality using CDK drag handles
- Add visual indicators for required fields and validation rules
- Implement hover/focus states for field selection
- Ensure responsive column layout (1-3 columns) works with live fields

**Acceptance Criteria:**

- ✅ All 12 field types render as actual form controls
- ✅ Drag-drop works with live field previews
- ✅ Field selection highlights the selected field
- ✅ Required and validation indicators display correctly
- ✅ Column layout applies to live field rendering

---

### Story 2: Inline Label Editing & Settings Modal

**Goal:** Enable inline label editing and modal-based property configuration

**Tasks:**

- Implement contenteditable label above each field preview
- Create click handler to toggle label edit mode
- Build modal dialog component for field settings:
  - Field name input
  - Placeholder text input
  - Help text textarea
  - Validation rules (min/max length, pattern, required toggle)
  - Default value input
- Connect modal to `FormBuilderService.updateFieldProperties()`
- Implement auto-save on label blur/enter key
- Add keyboard shortcuts (Escape to cancel, Enter to save)

**Acceptance Criteria:**

- ✅ Labels are editable inline with click/focus
- ✅ Label changes update immediately in FormBuilderService
- ✅ Settings modal opens on field click (designated area)
- ✅ All field properties configurable in modal
- ✅ Changes in modal update field preview in real-time
- ✅ Modal validation prevents empty required fields

---

### Story 3: Inline Option Management for Choice Fields

**Goal:** Provide inline key-value option editing for select/radio/checkbox fields

**Tasks:**

- Detect field types that support options (select, radio, checkbox)
- Render inline option editor component beneath field preview
- Implement key-value pair input rows:
  - Label input (displayed to user)
  - Value input (stored in submission)
  - Add/remove buttons
- Support drag-drop reordering of options
- Sync option changes with `FormField.options` array
- Validate unique option values
- Show "Add Option" button to append new rows

**Acceptance Criteria:**

- ✅ Option editor appears only for select/radio/checkbox fields
- ✅ Users can add/remove/reorder options inline
- ✅ Each option has label and value inputs
- ✅ Option changes update FormBuilderService state
- ✅ Field preview updates to show new options
- ✅ Validation prevents duplicate option values

---

## Compatibility Requirements

- [x] Existing `FormField` interface remains unchanged
- [x] `FormBuilderService` API preserved (no breaking changes)
- [x] Right sidebar (field-properties) can be repurposed or hidden
- [x] Drag-drop functionality works with live field previews
- [x] Form save/load operations unaffected
- [x] Published forms continue to render correctly

---

## Risk Mitigation

**Primary Risk:** Inline editing complexity interfering with drag-drop functionality

**Mitigation Strategy:**

- Use event propagation controls (`stopPropagation()`) to separate edit and drag interactions
- Designate specific drag handle areas (icon/grip) separate from editable content
- Implement edit mode toggle to disable drag when editing
- Test drag-drop extensively with live field components

**Rollback Plan:**

- Revert `form-canvas.component.ts` template changes
- Restore card-based field display from git history
- Disable inline editing features via feature flag

---

## Definition of Done

- [x] All field types render as live form controls in canvas
- [x] Labels are editable inline with click/focus interaction
- [x] Settings modal opens and updates field properties correctly
- [x] Options can be managed inline for select/radio/checkbox fields
- [x] Existing forms load and display correctly with new preview rendering
- [x] Drag-drop and field selection work seamlessly
- [x] Unit tests updated for new components (form-canvas, inline editors, modal)
- [x] Integration tests verify form save/load with new UI
- [x] No regression in form publish/save functionality
- [x] Accessibility standards met (keyboard navigation, ARIA labels)
- [x] User documentation updated with new editing workflow

---

## Technical Notes

### Component Architecture

```
form-canvas.component.ts
├── field-preview-renderer.component.ts (new)
│   ├── text-input-preview.component.ts
│   ├── select-preview.component.ts
│   ├── checkbox-preview.component.ts
│   └── ... (one per field type)
├── inline-label-editor.component.ts (new)
├── inline-option-manager.component.ts (new)
└── field-settings-modal.component.ts (converted from sidebar)
```

### State Flow

1. User clicks field → `FormBuilderService.selectField(field)`
2. User edits label → `FormBuilderService.updateFieldProperty(fieldId, { label })`
3. User opens settings → Modal displays `selectedField()` data
4. User saves settings → `FormBuilderService.updateFieldProperties(fieldId, updates)`
5. Canvas re-renders via signal updates

---

## Dependencies

- **Blocks:** None
- **Blocked By:** Epic 10 completion (Form Builder foundation)
- **Related:** Epic 12 (Advanced Canvas Elements)

---

## Estimated Effort

- **Story 1:** 5 days (field renderers + canvas integration)
- **Story 2:** 3 days (inline label + modal)
- **Story 3:** 3 days (option manager)
- **Total:** 11 days (2-2.5 weeks)

---

## Handoff Notes for Story Manager

"This epic enhances the existing Form Builder (Epic 10) with a WYSIWYG editing experience. Focus on:

1. **Integration with existing code:** All changes should work with current `FormBuilderService`,
   `FormField` interface, and `FormsApiService`
2. **Backward compatibility:** Existing forms must load without migration
3. **Event handling:** Carefully separate drag-drop and inline editing event propagation
4. **Accessibility:** Ensure keyboard navigation and screen reader support
5. **Testing:** Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering an intuitive, live-preview form building
experience."
