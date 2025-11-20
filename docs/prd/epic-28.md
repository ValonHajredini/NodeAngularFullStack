# Epic 28: Row Duplication and Multi-Selection - Brownfield Enhancement

**Epic Status:** Draft **Epic Owner:** Product Manager **Epic Goal:** Enable form builders to
rapidly prototype and iterate on forms by duplicating rows with all fields and configurations

## Epic Description

**Existing System Context:**

- Current functionality: Form builder supports row-based layouts with 1-4 columns, sub-columns,
  field positioning, and width configurations
- Technology stack: Angular 20+ signals (reactive state), FormBuilderService (state management),
  RowLayoutSidebarComponent (row management UI)
- Integration points: FormBuilderService state methods, RowLayoutSidebarComponent UI controls,
  FormCanvasComponent visual rendering

**Enhancement Details:**

**What's being added:**

1. **Single Row Duplication**: Duplicate button for each row that clones the row with all fields,
   positions, sub-column configs, and width ratios preserved
2. **Multi-Row Selection**: Click to select rows, Shift+Click for range selection, Ctrl/Cmd+Click
   for multi-select
3. **Batch Duplication**: Duplicate selected rows as a group with sequential insertion

**How it integrates:**

- New methods in FormBuilderService: `duplicateRow()`, `duplicateRows()`, selection state signals
- UI additions to RowLayoutSidebarComponent: duplicate icon button per row, selection checkboxes,
  batch action toolbar
- Follows existing patterns: Signal-based state, immutable updates, dirty tracking, order
  recalculation

**Success criteria:**

- Users can duplicate single row with one click, all fields cloned with new UUIDs
- Sub-column configurations and width ratios preserved in duplicated rows
- Multi-row selection works with keyboard modifiers (Shift, Ctrl/Cmd)
- Batch duplication maintains relative field order and row relationships
- Step form assignments preserved when duplicating rows within steps

## Stories

### Story 28.1: Single Row Duplication with Field Preservation

Implement core duplication logic for cloning a single row with all fields, positions, sub-columns,
and configuration metadata. Add duplicate button UI to RowLayoutSidebarComponent.

### Story 28.2: Multi-Row Selection and Batch Duplication

Add row selection state management and UI for selecting multiple rows with keyboard modifiers.
Implement batch duplication that maintains row order and relationships.

## Compatibility Requirements

- ✅ Existing APIs remain unchanged (only additive methods)
- ✅ Database schema changes: none required (uses existing FormSchema structure)
- ✅ UI changes follow existing patterns (PrimeNG buttons, signals, FormBuilderService integration)
- ✅ Performance impact minimal (duplication is O(n) where n = fields in row, batched updates)

## Risk Mitigation

**Primary Risk**: UUID collision or field position conflicts when duplicating rows with complex
sub-column configurations

**Mitigation**:

- Use crypto.randomUUID() for guaranteed unique IDs
- Recalculate row order after insertion using existing `recalculateOrder()` pattern
- Preserve position metadata as-is (rowId changes, but columnIndex/orderInColumn/subColumnIndex stay
  the same)
- Comprehensive unit tests for edge cases (empty rows, max sub-columns, step boundaries)

**Rollback Plan**:

- Feature is purely additive (no schema changes, no API modifications)
- Remove duplicate buttons and selection UI from RowLayoutSidebarComponent
- Remove new methods from FormBuilderService
- No database migration required

## Definition of Done

- ✅ All stories completed with acceptance criteria met
- ✅ Existing row/field management verified through regression testing
- ✅ Integration with step forms, sub-columns, and width ratios tested
- ✅ Unit tests for FormBuilderService duplication methods (≥90% coverage)
- ✅ Component tests for RowLayoutSidebarComponent UI interactions
- ✅ No regression in existing form builder features
- ✅ Dev notes added to story files documenting duplication algorithm
