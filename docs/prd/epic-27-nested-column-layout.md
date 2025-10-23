# Epic 27: Nested Column Layout System with Variable Width Configuration

**Epic ID**: EPIC-27 **Priority**: High **Status**: Draft **Created**: 2025-10-22 **Type**:
Brownfield Enhancement **Depends On**: Epic 14 (Multi-Field Columns & Row-Based Layout)

---

## Executive Summary

Enable form builders to create sophisticated multi-column layouts with variable column widths and
nested sub-columns, while maintaining full backward compatibility with existing equal-width row
layouts. This enhancement extends the current row-based layout system (Epic 14) by adding fractional
unit-based width configuration and one-level nested sub-columns (Row → Column → Sub-Column → Field).

**Key Capabilities:**

- Configure custom column width ratios using fractional units (e.g., `1fr, 3fr` = 25%-75% split)
- Subdivide any column into 2-4 sub-columns for granular field positioning
- Preset width ratios (Equal, Narrow-Wide, Narrow-Wider, etc.) plus custom free-form input
- Drag-and-drop fields into specific sub-columns with visual drop zones
- Responsive rendering (desktop: horizontal sub-columns, mobile: vertical stacking)
- Full backward compatibility (existing equal-width forms work without changes)

---

## Table of Contents

1. [Project Context](#project-context)
2. [Enhancement Scope](#enhancement-scope)
3. [Requirements](#requirements)
4. [Technical Constraints](#technical-constraints)
5. [Epic Goal](#epic-goal)
6. [Stories](#stories)
7. [Success Metrics](#success-metrics)
8. [Rollback Plan](#rollback-plan)

---

## Project Context

### Existing System Architecture

NodeAngularFullStack is a full-stack TypeScript monorepo featuring a visual form builder with
row-based layout system (Epic 14). The current implementation supports:

- **Row-based layout** with 1-4 equal-width columns per row
- **Multi-field column support** where multiple fields stack vertically within columns
- **Drag-and-drop field positioning** via `FieldPosition` (rowId + columnIndex + orderInColumn)
- **Responsive rendering** that stacks columns vertically on mobile devices
- **Angular 20+ frontend** with signals, PrimeNG components, and Tailwind CSS
- **Express.js backend** with PostgreSQL database storing form schemas as JSONB

### Current Limitation

All columns within a row have **equal width** (e.g., 2-column row = 50%-50%, 3-column row =
33%-33%-33%). Users cannot:

- Create asymmetric layouts (25%-75%, 30%-70%, etc.)
- Subdivide columns into nested sub-columns for complex layouts
- Position fields in side-by-side arrangements within a single column

### User Need

Form creators need flexible layouts for:

- **Side-by-side field groupings** (First Name + Last Name in one section, Address in another wider
  section)
- **Asymmetric visual hierarchy** (narrow label column + wide content column)
- **Complex data entry forms** (financial forms, medical intake, survey instruments)

---

## Enhancement Scope

### Enhancement Type

☑ **New Feature Addition** ☑ **Major Feature Modification** (extends existing row layout system)

### Enhancement Description

Add **nested column layout** capability to the form builder, allowing users to:

1. **Configure variable column widths** using fractional units (1fr, 2fr, 3fr) with preset ratios
2. **Subdivide columns into sub-columns** (2-4 sub-columns per column, one level deep)
3. **Position fields within sub-columns** for complex multi-column layouts

**Example Layout:** Row with 2 columns → Column 1 (25% width via `1fr`, single field) + Column 2
(75% width via `3fr`, subdivided into 3 sub-columns for side-by-side fields)

### Impact Assessment

☑ **Significant Impact** (substantial existing code changes)

**Changes Required:**

- Extend shared types (`RowLayoutConfig`, `FieldPosition`, new `SubColumnConfig`)
- Update FormBuilderService state management (signals, computed properties)
- Modify drag-drop logic and drop zone rendering
- Extend public form renderer for nested column support
- Database schema compatible (JSONB column accommodates new structure)
- **Full backward compatibility** maintained for existing forms

---

## Requirements

### Functional Requirements

**FR1: Variable Column Width Configuration** The row layout system shall allow users to configure
column widths using fractional units (fr) with both preset ratios and custom free-form input.

**FR2: Sub-Column Creation** Users shall be able to subdivide any column into 2-4 sub-columns,
creating a nested layout structure one level deep (Row → Column → Sub-Column → Field).

**FR3: Sub-Column Width Configuration** Sub-columns shall support the same variable width
configuration as top-level columns, using fractional units with preset ratios and custom input.

**FR4: Preset Width Ratios** The system shall provide preset width ratios including:

- Equal (1fr, 1fr) - 50%-50%
- Narrow-Wide (1fr, 2fr) - 33%-67%
- Narrow-Wider (1fr, 3fr) - 25%-75%
- Wide-Narrow (2fr, 1fr) - 67%-33%
- Wider-Narrow (3fr, 1fr) - 75%-25%
- Custom (free-form fractional input)

**FR5: Field Positioning in Sub-Columns** Users shall be able to drag fields from the palette or
existing positions into specific sub-columns, with support for multiple fields stacking vertically
within each sub-column.

**FR6: Drag-and-Drop Sub-Column Support** The form builder canvas shall render visual drop zones for
each sub-column, allowing intuitive drag-and-drop field placement with real-time visual feedback.

**FR7: Sub-Column UI Controls** The Row Layout Sidebar shall provide controls to enable/disable
sub-columns for any column, configure sub-column count (2-4), and adjust sub-column width ratios.

**FR8: Public Form Nested Rendering** The FormRendererComponent shall render nested column layouts
correctly on desktop (horizontal sub-columns) and mobile (vertically stacked sub-columns).

**FR9: Backward Compatibility - Equal Width Columns** Existing forms with equal-width columns (no
width configuration) shall continue rendering correctly without migration or manual updates.

**FR10: Type Safety for Nested Structure** The shared types package shall define TypeScript
interfaces for nested column configuration, ensuring type safety across frontend and backend.

### Non-Functional Requirements

**NFR1: Performance - No Degradation** The nested column system shall not degrade form builder or
renderer performance compared to the current equal-width column system (target: <50ms render time
for 50-field form).

**NFR2: Responsive Layout Integrity** Nested column layouts shall maintain visual integrity and
usability on mobile devices (320px width minimum) by stacking sub-columns vertically.

**NFR3: CSS Grid Implementation** The system shall use native CSS Grid (`grid-template-columns`) for
fractional unit rendering to ensure cross-browser compatibility and optimal performance.

**NFR4: Memory Efficiency** Nested column state management shall not increase memory usage by more
than 15% compared to current implementation (target: <2MB additional memory for 100-field form).

**NFR5: Developer Experience** The nested column type definitions shall be self-documenting with
comprehensive JSDoc comments and intuitive naming conventions.

**NFR6: Accessibility Compliance** Nested column layouts shall maintain WCAG AA compliance with
proper keyboard navigation, focus management, and screen reader support.

### Compatibility Requirements

**CR1: Database Schema Compatibility** The nested column configuration shall be stored within the
existing `form_schemas.schema` JSONB column without requiring database migrations. The JSONB
structure shall accommodate new `columnWidths` and `subColumns` properties while preserving existing
equal-width column data.

**CR2: Shared Types Package Compatibility** Changes to `RowLayoutConfig` and `FieldPosition`
interfaces shall be backward-compatible using optional properties. Existing code consuming these
types shall compile without modifications.

**CR3: FormBuilderService API Compatibility** New methods for sub-column management shall be
additive. Existing methods (`addRow()`, `removeRow()`, `updateRowColumns()`, `setFieldPosition()`)
shall continue functioning for forms without nested columns.

**CR4: Drag-Drop System Compatibility** The Angular CDK Drag-Drop integration shall extend existing
drop zone logic without breaking current palette-to-canvas or field-to-field drag operations.

**CR5: Public Form Renderer Compatibility** The FormRendererComponent shall detect nested column
configuration and render appropriately, falling back to equal-width rendering for forms without
`columnWidths` configuration.

**CR6: Theme System Compatibility** Nested column layouts shall respect existing theme
configurations (colors, typography, container styling) without requiring theme updates or
migrations.

---

## Technical Constraints

### Technology Stack

| Category               | Technology   | Version | Relevance to Nested Columns                                            |
| ---------------------- | ------------ | ------- | ---------------------------------------------------------------------- |
| **Frontend Framework** | Angular      | 20+     | Signal-based state management for nested column configuration          |
| **Frontend Language**  | TypeScript   | 5.3+    | Type-safe interfaces for `SubColumnConfig`, extended `RowLayoutConfig` |
| **UI Components**      | PrimeNG      | 17+     | Reusable dropdown/input components for width ratio selectors           |
| **State Management**   | NgRx Signals | 17+     | Reactive signals for sub-column state                                  |
| **CSS Framework**      | Tailwind CSS | 3.4+    | Utility classes for responsive sub-column stacking                     |
| **Backend Language**   | TypeScript   | 5.3+    | Shared type validation for nested column configs                       |
| **Backend Framework**  | Express.js   | 4.19+   | REST API endpoints for saving nested column schemas                    |
| **Database**           | PostgreSQL   | 15+     | JSONB column stores nested config (no migration needed)                |

### Integration Approach

**Database Integration:**

- **No Migration Required**: Extend `form_schemas.schema` JSONB with optional properties:
  - `RowLayoutConfig.columnWidths?: string[]` (fractional units, e.g., `["1fr", "3fr"]`)
  - `RowLayoutConfig.subColumns?: SubColumnConfig[]` (nested sub-column configs)
- **Backward Compatibility**: Forms without `columnWidths` use equal-width logic
- **Validation**: Backend validates fractional unit syntax (e.g., `1fr`, `2fr`)

**Frontend Integration:**

- **FormBuilderService Extension**:
  - New signals: `_subColumnConfigs = signal<SubColumnConfig[]>([])`
  - New methods: `addSubColumn()`, `removeSubColumn()`, `updateSubColumnWidths()`
  - Computed signals: `subColumnsByRowColumn()` for reactive UI
- **Drag-Drop Extension**: Extend Angular CDK `cdkDropList` for sub-column drop zones
- **Renderer Integration**: Detect `row.columnWidths` and apply dynamic `grid-template-columns`

**Type System Changes:**

```typescript
// packages/shared/src/types/forms.types.ts

export interface SubColumnConfig {
  columnIndex: number; // Parent column (0-3)
  subColumnCount: 1 | 2 | 3 | 4; // Number of sub-columns
  subColumnWidths?: string[]; // Optional fractional units
}

export interface RowLayoutConfig {
  rowId: string;
  columnCount: 0 | 1 | 2 | 3 | 4;
  columnWidths?: string[]; // NEW: Fractional units for columns
  subColumns?: SubColumnConfig[]; // NEW: Nested sub-column configs
  order: number;
  stepId?: string;
}

export interface FieldPosition {
  rowId: string;
  columnIndex: number;
  subColumnIndex?: number; // NEW: Sub-column index (0-3)
  orderInColumn?: number;
  stepId?: string;
}
```

### Risk Assessment

**Technical Risks:**

1. **Complexity Explosion in Drag-Drop Logic** (Medium likelihood, High impact)
   - Mitigation: Reuse `cdkDropListGroup`, extend predicates incrementally, comprehensive E2E tests

2. **Performance Degradation with Deep Nesting** (Medium likelihood, Medium impact)
   - Mitigation: Use `trackBy` functions, debounce width updates, lazy render off-screen rows

3. **Type Safety Erosion** (Low likelihood, Medium impact)
   - Mitigation: Strict null checks, runtime validation guards, comprehensive unit tests

**Integration Risks:**

1. **Backward Compatibility Breaking** (Low likelihood, Critical impact)
   - Mitigation: Maintain fallback logic for `undefined` configs, regression tests on existing forms

2. **JSONB Schema Validation Gap** (Medium likelihood, High impact)
   - Mitigation: Express-validator middleware validates fractional syntax, reject invalid configs

3. **Mobile Rendering Issues** (Medium likelihood, Medium impact)
   - Mitigation: Media queries force vertical stacking, test on real mobile devices

---

## Epic Goal

Enable form builders to create sophisticated multi-column layouts with variable column widths and
nested sub-columns, while maintaining full backward compatibility with existing equal-width row
layouts.

---

## Stories

### Story 1.1: Type System Foundation for Nested Columns

**As a** backend developer, **I want** extended TypeScript interfaces for nested column
configuration, **so that** the type system enforces valid nested column structures across frontend
and backend.

#### Acceptance Criteria

1. `SubColumnConfig` interface added to `packages/shared/src/types/forms.types.ts` with properties:
   `columnIndex`, `subColumnCount`, `subColumnWidths?`
2. `RowLayoutConfig` interface extended with optional properties: `columnWidths?`, `subColumns?`
3. `FieldPosition` interface extended with optional property: `subColumnIndex?`
4. All existing code importing these types compiles without errors
5. JSDoc comments added explaining fractional unit syntax and nesting limitations
6. Backend validator `validateFractionalUnits(widths: string[])` added to reject invalid `fr` syntax
7. Backend validator `validateSubColumnStructure(config: SubColumnConfig)` ensures consistency

#### Integration Verification

- Run `npm run typecheck` for all workspaces - verify zero type errors
- Existing forms without `columnWidths`/`subColumns` load and save successfully via API
- Backend unit tests for existing form validators continue passing

---

### Story 1.2: Variable Column Width Configuration

**As a** form builder, **I want** to configure custom width ratios for columns in a row, **so that**
I can create asymmetric layouts like 25%-75% or 33%-67% column splits.

#### Acceptance Criteria

1. FormBuilderService adds method `updateRowColumnWidths(rowId: string, widths: string[])`
2. Row Layout Sidebar displays "Column Widths" section when row has 2+ columns
3. Preset width ratio dropdown added with options: Equal, Narrow-Wide, Narrow-Wider, Wide-Narrow,
   Wider-Narrow, Custom
4. Custom option reveals text input accepting comma-separated fractional units
5. Input validation rejects invalid syntax with inline error message
6. FormCanvasComponent renders columns with dynamic widths using CSS Grid `grid-template-columns`
7. Forms without `columnWidths` continue rendering with equal-width columns

#### Integration Verification

- Existing equal-width row layouts render identically before and after deployment
- Drag-drop from palette to equal-width columns continues working
- Public form renderer displays equal-width forms correctly

---

### Story 1.3: Sub-Column State Management Infrastructure

**As a** form builder service, **I want** reactive state management for sub-column configurations,
**so that** UI components can display and update sub-column settings efficiently.

#### Acceptance Criteria

1. FormBuilderService adds private signal `_subColumnConfigs = signal<SubColumnConfig[]>([])`
2. Public readonly signal `subColumnConfigs = this._subColumnConfigs.asReadonly()` exposed
3. Method `addSubColumn(rowId, columnIndex, subColumnCount)` adds sub-column config
4. Method `removeSubColumn(rowId, columnIndex)` removes config and moves fields to parent
5. Method `updateSubColumnWidths(rowId, columnIndex, widths)` updates sub-column ratios
6. Computed signal `subColumnsByRowColumn` enables efficient lookups
7. `loadForm()` method populates `_subColumnConfigs` from schema
8. `buildSchema()` method includes sub-column configs in saved schema

#### Integration Verification

- Loading existing forms without sub-columns sets `_subColumnConfigs` to empty array
- Saving forms without sub-columns omits `subColumns` property
- Unit tests for FormBuilderService methods pass without modifications

---

### Story 1.4: Sub-Column UI Controls

**As a** form builder, **I want** UI controls to enable sub-columns for a column and configure
sub-column count and widths, **so that** I can subdivide columns into 2-4 nested sub-columns.

#### Acceptance Criteria

1. Row Layout Sidebar displays "Sub-Columns" section for each column in active row
2. Toggle button "Enable Sub-Columns" appears for each column (disabled by default)
3. When enabled, sub-column count dropdown displays options: 2, 3, 4 sub-columns
4. Sub-column width ratio dropdown displays same presets as column widths
5. Custom width input field appears when "Custom" selected
6. Disabling sub-columns prompts confirmation dialog warning about moving fields
7. Sub-column configuration persists when switching between rows
8. Visual indicator (icon/badge) shows which columns have sub-columns enabled

#### Integration Verification

- Row Layout Sidebar displays correctly for forms without sub-columns
- Toggling row layout on/off does not break sub-column controls
- Forms without sub-columns save and load without `subColumns` property

---

### Story 1.5: Drag-and-Drop Sub-Column Support

**As a** form builder, **I want** to drag fields into specific sub-columns, **so that** I can
position fields precisely within nested layouts.

#### Acceptance Criteria

1. FormCanvasComponent renders sub-column drop zones when `subColumns` defined
2. Sub-column drop zones display dashed border and "Drop field here" placeholder when empty
3. Drop zones highlight with green border during drag-over
4. Dragging field from palette to sub-column creates field with `position.subColumnIndex`
5. Dragging existing field to sub-column updates `position.subColumnIndex`
6. Multiple fields can stack vertically within sub-column (ordered by `position.orderInColumn`)
7. Drag-drop between sub-columns recalculates `orderInColumn` for source and destination
8. Dragging field from sub-column to parent column clears `position.subColumnIndex`
9. Angular CDK `cdkDropListGroup` connects palette and all sub-column drop lists

#### Integration Verification

- Dragging fields to equal-width columns continues working identically
- Palette-to-canvas drag-drop works for forms without sub-columns
- Existing field repositioning works correctly for non-nested columns

---

### Story 1.6: Public Form Nested Column Rendering

**As a** form viewer, **I want** published forms with nested columns to render correctly on desktop
and mobile, **so that** I can view and complete complex multi-column forms.

#### Acceptance Criteria

1. FormRendererComponent detects `row.columnWidths` and applies dynamic
   `[style.grid-template-columns]` binding
2. FormRendererComponent detects `row.subColumns` and renders nested grid containers
3. Sub-column containers use CSS Grid `grid-template-columns` with fractional units
4. Fields within sub-columns sorted by `position.subColumnIndex` then `position.orderInColumn`
5. Desktop (≥768px): Sub-columns render horizontally side-by-side within parent column
6. Mobile (<768px): Sub-columns stack vertically via media query
7. Forms without `columnWidths` or `subColumns` render with equal-width logic
8. Theme styles apply correctly to nested column layouts

#### Integration Verification

- Existing published forms without nested columns render identically
- Form submission for non-nested forms works without regression
- Mobile rendering for equal-width columns continues working correctly

---

### Story 1.7: Comprehensive Testing and Backward Compatibility Validation

**As a** QA engineer, **I want** comprehensive test coverage for nested column functionality and
backward compatibility, **so that** we can confidently deploy without breaking existing forms.

#### Acceptance Criteria

1. Unit tests for FormBuilderService sub-column methods achieve 90%+ code coverage
2. Component tests for Row Layout Sidebar verify all sub-column control interactions
3. Component tests for FormCanvasComponent verify sub-column drop zone rendering and drag-drop
4. Integration tests for backend API validate fractional unit syntax rejection
5. Playwright E2E tests cover: Drag to sub-column, configure widths, publish with nested columns,
   view on desktop, view on mobile
6. Regression test suite validates 10+ existing forms render identically before/after deployment
7. Performance benchmark confirms render time remains <50ms for 50-field form with nested columns
8. Accessibility audit confirms WCAG AA compliance for sub-column drop zones

#### Integration Verification

- All existing backend integration tests pass without modifications
- All existing frontend component tests pass without modifications
- Existing E2E tests for equal-width row layouts pass without regression

---

## Success Metrics

**Adoption Metrics:**

- 30% of new forms created after launch use variable column widths within 1 month
- 15% of new forms use nested sub-columns within 1 month
- User feedback survey shows 4.0+ satisfaction rating (out of 5) for nested column feature

**Performance Metrics:**

- Form builder render time remains <50ms for 50-field forms with nested columns
- Public form load time remains <100ms for forms with 5 rows + nested sub-columns
- No increase in memory usage beyond 15% compared to equal-width layouts

**Quality Metrics:**

- Zero critical bugs related to nested columns in first 2 weeks post-launch
- Zero regression bugs in existing equal-width row layout functionality
- 90%+ test coverage for all nested column code (unit + integration + E2E)

**Backward Compatibility:**

- 100% of existing forms render correctly without migration
- Zero API breaking changes (all changes are additive optional properties)

---

## Rollback Plan

Each story can be rolled back independently:

**Story 1.1 (Types)**: Revert type changes (no runtime impact, pure TypeScript)

**Story 1.2 (Column Widths)**: Remove column width UI controls, existing forms unaffected

**Story 1.3 (State Management)**: Remove state management signals, no UI if controls not deployed

**Story 1.4 (UI Controls)**: Hide sub-column controls via feature flag or CSS, no data created

**Story 1.5 (Drag-Drop)**: Disable sub-column drop zones, fields remain in parent columns

**Story 1.6 (Renderer)**: Revert renderer to equal-width fallback, forms still functional

**Story 1.7 (Testing)**: Tests can be disabled without affecting functionality

**Full Epic Rollback:**

1. Deploy backend with validation removal (accepts but ignores nested configs)
2. Deploy frontend with UI controls hidden or removed
3. Database retains old format (JSONB gracefully handles missing properties)
4. Existing forms continue working without any data migration

---

## Change Log

| Change                | Date       | Version | Description                                             | Author  |
| --------------------- | ---------- | ------- | ------------------------------------------------------- | ------- |
| Initial Epic Creation | 2025-10-22 | 0.1     | Created brownfield epic for nested column layout system | PM John |

---

**Next Steps:**

1. Review and approve epic with stakeholders
2. Break down stories into detailed development tasks
3. Sequence stories for implementation (foundation-first approach)
4. Begin Story 1.1 (Type System Foundation)
