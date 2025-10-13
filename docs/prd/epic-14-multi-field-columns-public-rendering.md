# Epic 14: Multi-Field Column Support & Public Form Rendering - Brownfield Enhancement

**Epic ID:** `epic-14-multi-field-columns-public-rendering` **Priority:** High **Estimated Effort:**
5-7 days (2-3 stories) **Dependencies:** Epic 13 (Row Layout System)

---

## Epic Goal

Enable form builders to stack multiple fields vertically within a single column of a row-based
layout, and ensure the row-based layout renders correctly in both preview mode and published public
forms. This transforms rows into true "sections" where each section can have 1-4 columns, and each
column can contain unlimited fields stacked vertically.

---

## Epic Description

### Existing System Context:

**Current State (Epic 13 Completed):**

- Row-based layout system with sidebar UI for row configuration
- Schema supports `RowLayoutConfig` (rowId, columnCount, order)
- Schema supports `FieldPosition` (rowId, columnIndex)
- FormBuilderService manages row layout state
- FormCanvasComponent renders row-column drop zones
- **Limitation #1:** Each column can only hold ONE field (one-field-per-column constraint)
- **Limitation #2:** FormRendererComponent (public view) does NOT render row-based layouts -
  displays all forms as single column

**Technology Stack:**

- Angular 20+ standalone components, signals
- Express.js backend with PostgreSQL
- Shared types package (`@nodeangularfullstack/shared`)
- PrimeNG 17+ UI components with Tailwind CSS
- Angular CDK Drag-Drop for form builder

**Integration Points:**

- Form schema stored in `form_schemas` table with JSON `fields` and `settings` columns
- `FormField.position` property contains `{ rowId, columnIndex }`
- `FormSettings.rowLayout` property contains `{ enabled, rows: RowLayoutConfig[] }`
- FormBuilderComponent → FormBuilderService → FormCanvasComponent (builder)
- FormRendererComponent renders published/preview forms at `/public/form/:shortCode`

---

### Enhancement Details:

**What's Being Added/Changed:**

#### 1. **Multi-Field Column Support (Schema Evolution)**

**Current JSON Structure (Epic 13):**

```json
{
  "fields": [
    {
      "id": "field_1",
      "type": "text",
      "label": "First Name",
      "position": { "rowId": "row_1", "columnIndex": 0 }
    },
    {
      "id": "field_2",
      "type": "email",
      "label": "Email",
      "position": { "rowId": "row_1", "columnIndex": 1 }
    }
  ],
  "settings": {
    "rowLayout": {
      "enabled": true,
      "rows": [{ "rowId": "row_1", "columnCount": 2, "order": 0 }]
    }
  }
}
```

**Problem:** Each column can only hold ONE field. No way to stack multiple fields vertically in a
column.

**New JSON Structure (Epic 14):**

```json
{
  "fields": [
    {
      "id": "field_1",
      "type": "text",
      "label": "First Name",
      "position": { "rowId": "row_1", "columnIndex": 0, "orderInColumn": 0 }
    },
    {
      "id": "field_2",
      "type": "text",
      "label": "Last Name",
      "position": { "rowId": "row_1", "columnIndex": 0, "orderInColumn": 1 }
    },
    {
      "id": "field_3",
      "type": "email",
      "label": "Email",
      "position": { "rowId": "row_1", "columnIndex": 1, "orderInColumn": 0 }
    },
    {
      "id": "field_4",
      "type": "number",
      "label": "Phone",
      "position": { "rowId": "row_1", "columnIndex": 1, "orderInColumn": 1 }
    }
  ],
  "settings": {
    "rowLayout": {
      "enabled": true,
      "rows": [{ "rowId": "row_1", "columnCount": 2, "order": 0 }]
    }
  }
}
```

**Key Change:** Add `orderInColumn` property to `FieldPosition` to enable vertical stacking within
columns.

#### 2. **Form Builder Drag-Drop Enhancement**

- Remove "one field per column" constraint
- Allow dropping multiple fields into the same column (stacks vertically)
- Visual feedback: Show drop indicator between fields within column
- Reorder fields within column via drag-drop
- Move fields between columns via drag-drop

#### 3. **Public Form Rendering (FormRendererComponent)**

**Current State:** FormRendererComponent completely ignores row layout. All forms render as single
column.

**Required Implementation:**

- Read `formSchema.settings.rowLayout` to detect row-based layouts
- Render rows as horizontal containers with CSS Grid (matching builder layout)
- Render columns within rows with proper spacing
- Render fields within columns vertically stacked
- Apply responsive behavior (mobile: stack columns vertically)
- Maintain backward compatibility (forms without row layout use global column layout)

#### 4. **Preview Mode Integration**

- FormBuilderComponent preview mode should use FormRendererComponent
- Preview button opens modal/dialog showing exact public form rendering
- Preview reflects current unsaved changes (uses in-memory schema)
- Preview shows row-based layout if enabled, global layout otherwise

---

### How It Integrates:

**Schema Changes (Additive Only):**

1. Extend `FieldPosition` interface: Add optional `orderInColumn?: number` property
2. Update FormBuilderService to manage `orderInColumn` for multi-field columns
3. Update FormCanvasComponent drag-drop to set `orderInColumn` on drop
4. Update FormRendererComponent to read `orderInColumn` and render fields in order

**Backward Compatibility:**

- Forms without `rowLayout` continue to work (global column layout)
- Forms with `rowLayout` but no `orderInColumn` default to `orderInColumn = 0` (single field per
  column, Epic 13 behavior)
- No database migration required (optional property, JSON schema evolution)

---

### Success Criteria:

1. **Builder:** Drop 3 fields into same column → fields stack vertically in builder canvas
2. **Builder:** Drag field between columns → field moves correctly, `orderInColumn` updates
3. **Builder:** Reorder fields within column → `orderInColumn` updates, visual order changes
4. **Preview:** Click preview button → modal shows form with correct row-column layout
5. **Published:** Navigate to `/public/form/:shortCode` → form renders with row-column layout
   matching builder
6. **Mobile:** Published form on mobile (< 768px) → columns stack vertically, fields within columns
   maintain vertical order
7. **Backward Compatibility:** Load form without row layout → renders as global column layout (no
   regression)
8. **Save/Load:** Save form with multi-field columns → reload form → fields render in correct
   positions

---

## Stories

### Story 1: Multi-Field Column Support in Builder (Schema + Drag-Drop)

**Goal:** Enable dropping multiple fields into the same column with vertical stacking.

**Tasks:**

- Extend `FieldPosition` interface with `orderInColumn?: number` property
- Update FormBuilderService methods to manage `orderInColumn`
- Remove "one field per column" constraint in FormCanvasComponent
- Update `canDropIntoColumn` predicate to allow drops into occupied columns
- Add drop indicator between fields within column
- Update `onFieldDroppedInRow` to calculate `orderInColumn` based on drop position
- Add reorder-within-column drag-drop logic
- Update unit tests for multi-field column scenarios
- Manual testing: Create form with 3 fields in same column, verify ordering

**Estimated Effort:** 2 days

---

### Story 2: Public Form Rendering with Row Layout (FormRendererComponent)

**Goal:** Render published and preview forms with correct row-column layout matching builder.

**Tasks:**

- Update FormRendererComponent template to detect `formSchema.settings.rowLayout`
- Add row-based layout rendering logic (rows → columns → fields)
- Sort fields by `position.orderInColumn` within each column
- Apply CSS Grid layout for rows and columns (matching builder styles)
- Add responsive behavior: stack columns vertically on mobile (< 768px)
- Maintain backward compatibility: render global column layout when `rowLayout` disabled
- Test published form rendering: navigate to `/public/form/:shortCode`, verify layout
- Test mobile rendering: resize browser, verify columns stack correctly
- Update unit tests for FormRendererComponent row layout rendering
- E2E tests: Create form with row layout → publish → verify public form matches builder

**Estimated Effort:** 2 days

---

### Story 3: Preview Mode Integration & Polish

**Goal:** Add preview button to form builder that shows exact public rendering in modal.

**Tasks:**

- Add "Preview" button to FormBuilderComponent toolbar
- Create preview dialog/modal component that embeds FormRendererComponent
- Pass current form schema (in-memory, unsaved) to FormRendererComponent in preview mode
- Preview shows row-column layout if enabled, global layout otherwise
- Preview reflects unsaved changes (live preview)
- Add visual indicator: "Preview Mode" badge/header in dialog
- Close preview dialog returns to builder
- Update FormBuilderComponent to export current schema for preview
- E2E tests: Edit form → click preview → verify preview matches builder → close dialog
- Manual QA: Test preview with row layout, global layout, unsaved changes

**Estimated Effort:** 1-2 days

---

## Compatibility Requirements

- [x] **Existing APIs remain unchanged:** FormBuilderService extends existing API, no breaking
      changes
- [x] **Database schema changes are backward compatible:** `orderInColumn` is optional property
      (JSON schema evolution)
- [x] **UI changes follow existing patterns:** Uses Angular CDK Drag-Drop, PrimeNG Dialog, CSS Grid
      (existing patterns)
- [x] **Performance impact is minimal:** Computed signals, OnPush change detection, no additional
      API calls

---

## Risk Mitigation

**Primary Risk:** Breaking existing form save/load or schema serialization for forms without row
layout

**Mitigation:**

- Make `orderInColumn` optional (defaults to 0 if undefined)
- Add comprehensive unit tests for schema serialization/deserialization
- Test backward compatibility with forms created before Epic 14
- Test forms with Epic 13 row layout (without `orderInColumn`) to verify default behavior
- Add E2E tests covering all scenarios: global layout, row layout (Epic 13), multi-field columns
  (Epic 14)

**Rollback Plan:**

- Disable row layout toggle in sidebar (reverts to global layout)
- Forms with `orderInColumn` degrade to single-field-per-column (Epic 13 behavior)
- Schema changes are additive only (optional property, no breaking changes)
- Feature flag can disable multi-field column support if issues arise

---

## Definition of Done

- [x] `FieldPosition` extended with `orderInColumn?: number` property
- [x] FormBuilderService manages `orderInColumn` for multi-field columns
- [x] FormCanvasComponent allows dropping multiple fields into same column
- [x] FormCanvasComponent renders fields vertically stacked within columns
- [x] Drag-drop within column updates `orderInColumn` and visual order
- [x] FormRendererComponent renders row-column layout matching builder
- [x] FormRendererComponent sorts fields by `orderInColumn` within columns
- [x] FormRendererComponent responsive behavior (mobile stacking) works correctly
- [x] Preview button opens dialog showing FormRendererComponent with current schema
- [x] Preview reflects unsaved changes (live preview)
- [x] Published forms render with row-column layout at `/public/form/:shortCode`
- [x] Backward compatibility verified: forms without row layout render correctly
- [x] Backward compatibility verified: forms with Epic 13 row layout (no `orderInColumn`) work
      correctly
- [x] Unit tests written and passing for all three stories
- [x] E2E tests written and passing:
  - Create form with multi-field columns → save → reload → verify layout
  - Publish form → navigate to public URL → verify layout matches builder
  - Preview form → verify layout matches published form
- [x] Existing functionality verified: field properties modal, settings, save/load workflows
      unaffected
- [x] Code follows project standards (TypeScript strict, ESLint, Prettier)
- [x] JSDoc comments added for new properties and methods
- [x] CLAUDE.md updated with multi-field column feature description
- [x] No regression in existing tests

---

## Handoff to Story Manager

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This enhances the existing row-based layout system (Epic 13) running on Angular 20+ and Express.js
- Integration points:
  - Shared types package (`@nodeangularfullstack/shared`)
  - FormBuilderService (signal-based state management)
  - FormCanvasComponent (Angular CDK Drag-Drop)
  - FormRendererComponent (public form rendering)
  - PostgreSQL schema JSON columns (`fields`, `settings`)
- Existing patterns to follow:
  - FieldPosition interface extension pattern (see Epic 13 for `RowLayoutConfig`, `FieldPosition`)
  - FormBuilderService signal-based state (see `formFields`, `rowLayoutEnabled`, `rowConfigs`
    signals)
  - Schema serialization in FormBuilderComponent (`exportFormData`, `loadExistingForm` methods)
  - Angular CDK Drag-Drop with custom drop predicates (see `canDropIntoColumn` in
    FormCanvasComponent)
- Critical compatibility requirements:
  - `orderInColumn` must be optional (backward compatibility with Epic 13 forms)
  - FormRendererComponent must handle three cases: global layout, Epic 13 row layout, Epic 14
    multi-field columns
  - Responsive behavior: columns stack vertically on mobile (< 768px)
  - Each story must include verification that existing functionality remains intact
- Epic goal: Enable multi-field columns in form builder and ensure published forms render correctly
  with row-column layout matching builder design.

The epic should maintain system integrity while delivering a complete row-based form layout
experience from builder to public form."

---

## Important Notes

- This epic is specifically for **small brownfield enhancements** to Epic 13
- If scope grows beyond 3 stories, consider full brownfield planning
- Always prioritize existing system integrity over new functionality
- Epic 13 provided the foundation (row layout UI, schema, drag-drop basics)
- Epic 14 completes the feature by enabling:
  1. Multi-field columns (vertical stacking)
  2. Public form rendering (FormRendererComponent)
  3. Preview mode (live preview in builder)

---

## Success Criteria Summary

The epic is successful when:

1. Form builders can drop unlimited fields into any column (vertical stacking works)
2. Published forms at `/public/form/:shortCode` render with row-column layout matching builder
3. Preview button shows exact public rendering in modal dialog
4. Mobile forms stack columns vertically while maintaining field order within columns
5. Backward compatibility maintained: forms without row layout render correctly (no regression)
6. Schema changes are additive only (optional `orderInColumn` property)
7. All three stories completed with passing unit tests and E2E tests
8. Manual QA confirms: builder drag-drop, published form rendering, preview mode all work correctly

---

**Epic Status:** ✅ Ready for Story Development **Next Step:** Story Manager develops detailed user
stories for 3 stories listed above
