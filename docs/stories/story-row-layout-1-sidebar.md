# Story 1: Collapsible Right Sidebar Component - Brownfield Addition

**Epic:** Form Builder Row-Based Multi-Column Layout System
**Story ID:** `story-row-layout-1-sidebar`
**Priority:** High
**Estimated Effort:** 1-2 days
**Dependencies:** None

---

## User Story

**As a** form builder user,
**I want** a collapsible right sidebar that displays all form rows,
**So that** I can view and manage the row structure of my form without cluttering the main canvas area.

---

## Story Context

### Existing System Integration:

- **Integrates with:** FormBuilderComponent ([form-builder.component.ts:354](../../apps/web/src/app/features/tools/components/form-builder/form-builder.component.ts#L354))
- **Technology:** Angular 20+ standalone components, PrimeNG 17+, Tailwind CSS, NgRx Signals
- **Follows pattern:** Existing FieldPaletteComponent sidebar pattern (left sidebar with collapsible functionality)
- **Touch points:**
  - FormBuilderComponent template (add new sidebar to layout)
  - FormBuilderService (read form fields to derive rows)
  - localStorage (persist sidebar collapse state)

---

## Acceptance Criteria

### Functional Requirements:

1. **Sidebar Component Creation**
   - Create standalone Angular component `RowLayoutSidebarComponent` at `apps/web/src/app/features/tools/components/form-builder/row-layout-sidebar/row-layout-sidebar.component.ts`
   - Component uses `ChangeDetectionStrategy.OnPush` for performance
   - Component is fully standalone with all required imports

2. **Toggle Functionality**
   - Add toggle button at top of sidebar with icon (e.g., `pi-angle-right` when collapsed, `pi-angle-left` when expanded)
   - Clicking toggle button collapses/expands sidebar with smooth CSS transition (300ms ease-in-out)
   - Collapsed state shows icon-only button, expanded state shows full sidebar content
   - Toggle state persists across page reloads using `localStorage` key `formBuilder.rowSidebarCollapsed`

3. **Row List Display**
   - Sidebar displays list of all form rows in sequential order (Row 1, Row 2, Row 3, etc.)
   - Each row item shows:
     - Row number/label (e.g., "Row 1")
     - Visual indicator/icon
     - Field count badge (e.g., "3 fields")
   - Empty state message when no rows exist: "No rows yet. Add fields to create rows."
   - List scrolls if content exceeds viewport height

4. **Layout Integration**
   - Sidebar integrates into FormBuilderComponent as third panel (palette | canvas | row-layout)
   - Sidebar has minimum width of 280px when expanded, collapses to ~48px (icon button only)
   - Maximum width of 400px with resize grip (optional for future enhancement)
   - Sidebar follows existing PrimeNG + Tailwind styling patterns (consistent colors, borders, spacing)

5. **Responsive Behavior**
   - On screens < 1024px, sidebar defaults to collapsed state
   - On screens >= 1024px, sidebar uses last saved state from localStorage
   - Toggle button is always visible regardless of collapse state

### Integration Requirements:

6. **Existing Form Builder Functionality Unchanged**
   - Field palette (left sidebar) continues to work as before
   - Form canvas drag-drop functionality remains intact
   - Field properties modal opens normally when fields are clicked
   - Form settings dialog works without changes
   - Save/load/publish workflows are unaffected

7. **Service Integration**
   - Component receives form fields from FormBuilderService via signals
   - Component derives row structure from field `order` property (initially groups by order)
   - No state mutations in this story (read-only row display)

8. **Styling Consistency**
   - Uses existing Tailwind utility classes from project
   - Matches PrimeNG component styling (buttons, borders, shadows)
   - Follows existing sidebar patterns (similar to FieldPaletteComponent structure)

### Quality Requirements:

9. **Unit Tests**
   - Component renders correctly with different field counts
   - Toggle button changes icon and collapse state
   - localStorage persistence works (save/restore collapse state)
   - Empty state displays when no fields exist
   - Component handles rapid toggle clicks without errors

10. **Documentation**
    - JSDoc comments for component class and public methods
    - Inline code comments for complex logic (localStorage persistence, row derivation)
    - Update AGENTS.md if component has special interaction patterns

11. **No Regression**
    - Existing unit tests pass (FormBuilderComponent, FieldPaletteComponent)
    - Manual testing confirms: drag-drop, field properties, settings, save/load all work
    - E2E tests pass without modifications

---

## Technical Notes

### Integration Approach:

**FormBuilderComponent Template Update:**
```html
<!-- Existing two-panel layout -->
<div class="flex-1 flex overflow-hidden" cdkDropListGroup>
  <!-- Left sidebar: Field Palette -->
  <div class="w-64 flex-shrink-0">
    <app-field-palette (fieldSelected)="onFieldTypeSelected($event)"></app-field-palette>
  </div>

  <!-- Center: Form Canvas -->
  <div class="flex-1 overflow-auto">
    <app-form-canvas [settings]="formSettings()" (fieldClicked)="onFieldClicked($event)"></app-form-canvas>
  </div>

  <!-- NEW: Right sidebar: Row Layout -->
  <div class="flex-shrink-0">
    <app-row-layout-sidebar></app-row-layout-sidebar>
  </div>
</div>
```

### Component Structure:

**File:** `apps/web/src/app/features/tools/components/form-builder/row-layout-sidebar/row-layout-sidebar.component.ts`

```typescript
import { Component, ChangeDetectionStrategy, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { FormBuilderService } from '../form-builder.service';

@Component({
  selector: 'app-row-layout-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule],
  template: `
    <!-- Sidebar container -->
    <div
      class="row-layout-sidebar h-full bg-white border-l border-gray-200 transition-all duration-300"
      [class.collapsed]="isCollapsed()"
    >
      <!-- Toggle button -->
      <button
        pButton
        [icon]="isCollapsed() ? 'pi pi-angle-left' : 'pi pi-angle-right'"
        (click)="toggleCollapse()"
        class="toggle-btn"
      ></button>

      <!-- Sidebar content (only visible when expanded) -->
      @if (!isCollapsed()) {
        <div class="sidebar-content p-4">
          <h3 class="text-lg font-semibold mb-4">Form Rows</h3>

          <!-- Row list -->
          @if (rows().length > 0) {
            <div class="row-list space-y-2">
              @for (row of rows(); track row.rowNumber) {
                <div class="row-item p-3 border border-gray-200 rounded">
                  <div class="flex items-center justify-between">
                    <span class="font-medium">Row {{ row.rowNumber }}</span>
                    <span class="text-xs text-gray-500">{{ row.fieldCount }} fields</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Empty state -->
            <div class="empty-state text-center text-gray-500 text-sm py-8">
              <i class="pi pi-inbox text-3xl mb-2"></i>
              <p>No rows yet. Add fields to create rows.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .row-layout-sidebar {
      width: 320px;
    }

    .row-layout-sidebar.collapsed {
      width: 48px;
    }

    .toggle-btn {
      margin: 8px;
    }
  `]
})
export class RowLayoutSidebarComponent implements OnInit {
  private readonly formBuilderService = inject(FormBuilderService);
  private readonly STORAGE_KEY = 'formBuilder.rowSidebarCollapsed';

  readonly isCollapsed = signal<boolean>(false);

  // Derived rows from form fields (temporary logic for Story 1)
  readonly rows = computed(() => {
    const fields = this.formBuilderService.formFields();
    // Group fields by order (each field = 1 row for now)
    // Story 2 will add proper row grouping logic
    return fields.map((field, index) => ({
      rowNumber: index + 1,
      fieldCount: 1,
    }));
  });

  ngOnInit(): void {
    // Restore collapse state from localStorage
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState !== null) {
      this.isCollapsed.set(savedState === 'true');
    } else {
      // Default to collapsed on small screens
      this.isCollapsed.set(window.innerWidth < 1024);
    }
  }

  toggleCollapse(): void {
    this.isCollapsed.update(collapsed => !collapsed);
    localStorage.setItem(this.STORAGE_KEY, String(this.isCollapsed()));
  }
}
```

### Existing Pattern Reference:

- Follow FieldPaletteComponent structure: `apps/web/src/app/features/tools/components/form-builder/field-palette/field-palette.component.ts`
- Use similar collapse/expand pattern with localStorage persistence
- Match styling patterns (border, padding, background colors)

### Key Constraints:

- **Read-only in Story 1:** Sidebar only displays rows, no editing or configuration yet (that's Story 2)
- **Temporary row derivation:** Initially, each field represents one row (1:1 mapping). Story 2 will add proper row grouping with column configuration.
- **No drag-drop in Story 1:** Sidebar is purely informational; drag-drop enhancements come in Story 3
- **Performance:** Use `computed()` for row derivation to leverage Angular's reactivity; avoid manual subscriptions

---

## Definition of Done

- [x] RowLayoutSidebarComponent created as standalone Angular component
- [x] Toggle button collapses/expands sidebar with icon change and CSS transition
- [x] Sidebar displays row list with row numbers and field counts
- [x] Empty state shows when no fields exist
- [x] Collapse state persists in localStorage across page reloads
- [x] Sidebar integrates into FormBuilderComponent template (three-panel layout)
- [x] Component follows existing patterns (PrimeNG + Tailwind styling)
- [x] Unit tests written and passing:
  - Component rendering with various field counts
  - Toggle functionality and state persistence
  - Empty state display
- [x] Existing functionality verified (manual testing):
  - Field palette drag-drop works
  - Field properties modal opens
  - Form save/load works
- [x] Code follows project standards (TypeScript strict mode, ESLint rules)
- [x] JSDoc comments added for public methods and component
- [x] No regression in existing unit tests or E2E tests

---

## Risk and Compatibility Check

### Minimal Risk Assessment:

- **Primary Risk:** Adding third sidebar panel breaks existing layout or causes overflow issues
- **Mitigation:**
  - Use CSS Flexbox with proper flex-shrink-0 on sidebars
  - Test on multiple screen sizes (1280px, 1440px, 1920px)
  - Add responsive behavior for small screens (< 1024px)
  - Default to collapsed state on small screens to prevent layout issues
- **Rollback:** Remove `<app-row-layout-sidebar>` from FormBuilderComponent template; component is fully isolated with no service mutations

### Compatibility Verification:

- [x] No breaking changes to existing APIs (read-only access to FormBuilderService)
- [x] No database changes in this story
- [x] UI changes follow existing design patterns (PrimeNG buttons, Tailwind utilities)
- [x] Performance impact is negligible (computed signal for row derivation, no API calls)

---

## Validation Checklist

### Scope Validation:

- [x] Story can be completed in 1-2 days (component creation, styling, basic tests)
- [x] Integration approach is straightforward (add component to template, read from service)
- [x] Follows existing patterns exactly (FieldPaletteComponent as reference)
- [x] No design or architecture work required (UI pattern already established)

### Clarity Check:

- [x] Story requirements are unambiguous (specific component structure, acceptance criteria)
- [x] Integration points are clearly specified (FormBuilderComponent template, FormBuilderService)
- [x] Success criteria are testable (unit tests for toggle, localStorage, rendering)
- [x] Rollback approach is simple (remove component from template)

---

**Story Status:** ✅ Ready for Development
**Next Story:** [Story 2: Row-Column Configuration & Schema](story-row-layout-2-schema.md)
