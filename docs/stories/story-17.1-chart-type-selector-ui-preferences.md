# Story 17.1: Chart Type Selector UI and Preference Storage - Brownfield Addition

**Epic:** Epic 17 - Dynamic Chart Type Selection for Analytics **Story Points:** 4 hours
**Priority:** High **Status:** Ready for Development

---

## User Story

**As a** form analytics user, **I want** to select and change the chart type for each field's
visualization, **So that** I can view my form submission data in the format that best suits my
analysis needs.

---

## Story Context

### Existing System Integration

**Integrates with:**

- `FormAnalyticsComponent`
  (apps/web/src/app/features/tools/components/form-builder/form-analytics/form-analytics.component.ts)
- Visual Analytics section template (lines 216-272)
- Field card rendering logic (lines 231-270)

**Technology:**

- Angular 20+ standalone components with signals
- PrimeNG UI components (Dropdown, ButtonGroup)
- TypeScript with computed properties
- localStorage API for browser-side persistence

**Follows pattern:**

- Existing preference storage pattern (field visibility preferences, lines 614-644)
- PrimeNG component styling and design system
- Signal-based reactive state management

**Touch points:**

- Each field card in Visual Analytics section (template lines 231-270)
- localStorage preference keys (pattern: `analytics-chart-type-${formId}-${fieldId}`)
- Field statistics rendering logic (lines 234-267)

---

## Acceptance Criteria

### Functional Requirements

1. **Chart Type Selector UI**
   - Each field card in Visual Analytics section displays a chart type selector control
   - Selector appears in field card header (next to field title)
   - Selector shows icon + dropdown or segmented button group UI
   - Available chart types displayed with icons and labels:
     - Bar Chart (pi-chart-bar)
     - Line Chart (pi-chart-line)
     - Pie Chart (pi-chart-pie)
     - Polar Chart (custom icon)
     - Radar Chart (custom icon)
     - Area Chart (custom icon)
     - Doughnut Chart (custom icon)
     - Stat Card (pi-calculator)
   - Currently selected chart type is visually indicated
   - Selector is keyboard accessible (Tab navigation, Enter/Space to select)

2. **Chart Type Selection Behavior**
   - Clicking chart type immediately updates the visualization
   - No page reload required for chart type change
   - Smooth transition between chart types (fade in/out animation)
   - Loading indicator shown during chart re-render (< 200ms typically)
   - Selection persists immediately to localStorage

3. **Chart Preference Storage Service**
   - New `ChartPreferenceService` injectable service created
   - Service provides methods:
     - `getChartType(formId: string, fieldId: string): ChartType | null`
     - `setChartType(formId: string, fieldId: string, chartType: ChartType): void`
     - `clearChartTypes(formId: string): void`
     - `clearAllChartTypes(): void`
   - Preferences stored in localStorage with keys: `analytics-chart-type-${formId}-${fieldId}`
   - Service handles JSON serialization/deserialization
   - Service provides default fallback when no preference exists

### Integration Requirements

4. **Existing Analytics Functionality Continues Unchanged**
   - Submissions table rendering unaffected
   - Field visibility toggle continues to work
   - Export to CSV functionality unaffected
   - Statistics calculation engine (StatisticsEngineService) works as before
   - Field selector dialog functionality intact

5. **Integration with FormAnalyticsComponent**
   - Chart type selector integrated into field card template
   - Signal-based reactive updates for chart type changes
   - Computed signal for chart preferences:
     `chartTypePreferences = signal<Map<string, ChartType>>(new Map())`
   - Preference service injected into component:
     `private readonly chartPreferenceService = inject(ChartPreferenceService)`
   - Chart type change triggers re-render of affected field card only (not entire dashboard)

6. **Backward Compatibility**
   - Forms without saved preferences display default chart types:
     - Numeric fields → Stat Card
     - Choice fields (select/radio) → Bar Chart
     - Timeseries fields (date/datetime) → Line Chart
     - Toggle fields → Pie Chart
     - Checkbox fields → Bar Chart
   - Default behavior matches existing hard-coded chart type mapping

### Quality Requirements

7. **Service Unit Tests**
   - ChartPreferenceService has comprehensive unit tests (chart-preference.service.spec.ts)
   - Tests cover: get, set, clear operations
   - Tests verify localStorage interaction
   - Tests verify JSON serialization edge cases

8. **Component Integration Tests**
   - FormAnalyticsComponent updated tests cover chart type selector rendering
   - Tests verify chart type change behavior
   - Tests verify preference persistence after selection

9. **Accessibility**
   - Chart type selector is keyboard navigable (Tab, Enter, Space, Arrow keys)
   - Selector has proper ARIA labels: `aria-label="Select chart type for {{field.label}}"`
   - Screen reader announces chart type changes via live region

---

## Technical Notes

### Integration Approach

**ChartPreferenceService Implementation:**

```typescript
// apps/web/src/app/features/tools/components/form-builder/form-analytics/chart-preference.service.ts

@Injectable({ providedIn: 'root' })
export class ChartPreferenceService {
  private readonly STORAGE_PREFIX = 'analytics-chart-type';

  getChartType(formId: string, fieldId: string): ChartType | null {
    const key = `${this.STORAGE_PREFIX}-${formId}-${fieldId}`;
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as ChartType) : null;
  }

  setChartType(formId: string, fieldId: string, chartType: ChartType): void {
    const key = `${this.STORAGE_PREFIX}-${formId}-${fieldId}`;
    localStorage.setItem(key, JSON.stringify(chartType));
  }

  clearChartTypes(formId: string): void {
    const keys = Object.keys(localStorage);
    keys
      .filter((key) => key.startsWith(`${this.STORAGE_PREFIX}-${formId}-`))
      .forEach((key) => localStorage.removeItem(key));
  }

  clearAllChartTypes(): void {
    const keys = Object.keys(localStorage);
    keys
      .filter((key) => key.startsWith(this.STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  }
}
```

**FormAnalyticsComponent Integration:**

```typescript
// Add to FormAnalyticsComponent

private readonly chartPreferenceService = inject(ChartPreferenceService);

// New computed signal for chart type preferences
readonly chartTypePreferences = computed<Map<string, ChartType>>(() => {
  const formId = this.formId();
  const fields = this.formFields();
  const preferences = new Map<string, ChartType>();

  fields.forEach(field => {
    const preference = this.chartPreferenceService.getChartType(formId, field.id);
    if (preference) {
      preferences.set(field.id, preference);
    }
  });

  return preferences;
});

// Method to handle chart type change
onChartTypeChange(fieldId: string, chartType: ChartType): void {
  this.chartPreferenceService.setChartType(this.formId(), fieldId, chartType);
  // Trigger re-render via signal update
  this.chartTypePreferences.set(new Map(this.chartTypePreferences()));
}
```

**Template Update (form-analytics.component.ts template section):**

```html
<!-- Add chart type selector to field card header -->
<div class="bg-white rounded-lg shadow p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900">{{ stat.field.label }}</h3>

    <!-- Chart Type Selector -->
    <p-dropdown
      [options]="availableChartTypes"
      [(ngModel)]="chartTypePreferences().get(stat.field.id)"
      (onChange)="onChartTypeChange(stat.field.id, $event.value)"
      optionLabel="label"
      optionValue="value"
      placeholder="Select chart type"
      [style]="{ width: '200px' }"
      [attr.aria-label]="'Select chart type for ' + stat.field.label"
    >
      <ng-template let-option pTemplate="item">
        <div class="flex items-center gap-2">
          <i [class]="option.icon"></i>
          <span>{{ option.label }}</span>
        </div>
      </ng-template>
    </p-dropdown>
  </div>

  <!-- Chart rendering based on preference -->
  @switch (getChartType(stat.field.id)) { @case ('bar') { <app-bar-chart ... /> } @case ('line') {
  <app-line-chart ... /> } @case ('pie') { <app-pie-chart ... /> } @case ('stat') {
  <app-stat-card ... /> } @default {
  <!-- Fallback to default -->
  } }
</div>
```

### Existing Pattern Reference

**Field Visibility Preference Pattern (lines 614-644):**

- Uses localStorage with form-scoped keys
- Loads preferences in `ngOnInit` via `loadVisibleFieldsPreference()`
- Saves preferences immediately on change via `saveVisibleFieldsPreference()`
- Uses Set data structure for efficient lookups
- Provides fallback with `initializeDefaultVisibleFields()`

**This story follows the same pattern for consistency.**

### Key Constraints

- **No backend API calls** - All preferences stored in localStorage (client-side only)
- **No breaking changes** - Existing chart rendering continues to work
- **Performance** - Preference lookup must be O(1) using Map/Set data structures
- **UI responsiveness** - Chart type change must feel instant (< 100ms)

---

## Definition of Done

- ✅ `ChartPreferenceService` implemented with all required methods
- ✅ Service unit tests written and passing (chart-preference.service.spec.ts)
- ✅ Chart type selector UI integrated into FormAnalyticsComponent field cards
- ✅ Selector follows PrimeNG design system and existing UI patterns
- ✅ Chart type changes immediately update visualization
- ✅ Preferences persist across browser sessions (localStorage)
- ✅ Default chart types work when no preference exists (backward compatible)
- ✅ Component integration tests updated and passing
- ✅ Accessibility requirements met (keyboard navigation, ARIA labels)
- ✅ Code follows existing patterns (signal-based, standalone component)
- ✅ No console errors or warnings
- ✅ Existing analytics functionality regression tested
- ✅ JSDoc comments added for new service and methods
- ✅ Code reviewed and approved
- ✅ Story demonstrated to product owner

---

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk:** localStorage quota exceeded for users with many forms, causing preference storage
failures.

**Mitigation:**

- Preferences are small (~50 bytes per field)
- localStorage quota is typically 5-10MB (enough for 100,000+ preferences)
- Service methods wrapped in try-catch to handle quota exceeded errors gracefully
- Fallback to default chart types if localStorage unavailable/full

**Rollback:**

- Remove chart type selector from template
- Remove ChartPreferenceService injection and usage
- Restore hard-coded chart type rendering logic
- Clear localStorage preferences with migration script

**Rollback Complexity:** Simple (< 15 minutes)

### Compatibility Verification

- ✅ **No breaking changes to existing APIs** - No backend changes
- ✅ **Database changes** - None (client-side only)
- ✅ **UI changes follow existing patterns** - Uses PrimeNG Dropdown, follows field visibility
  pattern
- ✅ **Performance impact is negligible** - localStorage access is ~1ms, Map lookups are O(1)
- ✅ **Backward compatible** - Default chart types match existing behavior

---

## Implementation Checklist

### Phase 1: Service Implementation (1 hour)

- [ ] Create `ChartPreferenceService` file
- [ ] Implement `getChartType()` method with localStorage access
- [ ] Implement `setChartType()` method with localStorage write
- [ ] Implement `clearChartTypes()` and `clearAllChartTypes()` methods
- [ ] Add error handling for localStorage quota exceeded
- [ ] Write unit tests for service (chart-preference.service.spec.ts)

### Phase 2: Component Integration (2 hours)

- [ ] Inject `ChartPreferenceService` into FormAnalyticsComponent
- [ ] Add `chartTypePreferences` computed signal
- [ ] Add `onChartTypeChange()` method
- [ ] Add `getChartType()` helper method for template
- [ ] Define `availableChartTypes` array with icons and labels
- [ ] Update field card template with chart type selector
- [ ] Implement chart rendering switch based on preference
- [ ] Add default fallback logic for missing preferences

### Phase 3: Testing and Refinement (1 hour)

- [ ] Update component integration tests
- [ ] Test chart type changes in browser
- [ ] Verify localStorage persistence across page refreshes
- [ ] Test with multiple forms and fields
- [ ] Verify default behavior for forms without preferences
- [ ] Test keyboard navigation and accessibility
- [ ] Verify no console errors or warnings
- [ ] Regression test existing analytics functionality

---

**Story Status:** Ready for Development **Dependencies:** None **Blocked By:** None **Next Story:**
Story 17.2 - New Chart Components
