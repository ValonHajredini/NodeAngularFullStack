# Story 17.3: Dynamic Chart Type Mapping and Integration - Brownfield Addition

**Epic:** Epic 17 - Dynamic Chart Type Selection for Analytics **Story Points:** 4 hours
**Priority:** High **Status:** Ready for Development **Dependencies:**

- Story 17.1 (Chart Preference Service)
- Story 17.2 (New Chart Components)

---

## User Story

**As a** form analytics user, **I want** the analytics dashboard to dynamically render my selected
chart type for each field, **So that** my chart type preferences are reflected immediately and
persist across browser sessions.

---

## Story Context

### Existing System Integration

**Integrates with:**

- `FormAnalyticsComponent` (apps/web/.../form-analytics/form-analytics.component.ts)
- `fieldStatistics` computed signal (lines 386-458) - **Primary modification point**
- Visual Analytics template section (lines 216-272) - **Chart rendering logic**
- `ChartPreferenceService` from Story 17.1
- All chart components (existing + new from Story 17.2)

**Technology:**

- Angular 20+ signals and computed properties
- TypeScript with strict type checking
- Template control flow (`@switch`, `@case`)
- Dynamic component rendering

**Follows pattern:**

- Signal-based reactive state management
- Computed signal dependencies trigger automatic updates
- Type-safe chart type to component mapping

**Touch points:**

- `fieldStatistics` computed signal must check preferences before assigning default chart type
- Template `@switch` statement must handle all chart types (8 total)
- Chart type selector from Story 17.1 must show only compatible chart types
- Shared types package must export `ChartType` enum

---

## Acceptance Criteria

### Functional Requirements

1. **Chart Type Compatibility Matrix**
   - Define which chart types work with which data types:
     - **Numeric data** (NumericStatistics): Stat Card, Bar Chart, Line Chart, Area Chart
     - **Choice data** (ChoiceDistribution): Bar Chart, Pie Chart, Doughnut Chart, Polar Chart,
       Radar Chart, Horizontal Bar Chart
     - **Timeseries data** (TimeSeriesData): Line Chart, Area Chart, Bar Chart
     - **Toggle data** (ChoiceDistribution for Yes/No): Pie Chart, Doughnut Chart, Polar Chart, Bar
       Chart
   - Matrix implemented as TypeScript constant: `CHART_TYPE_COMPATIBILITY`
   - Matrix used to filter chart selector options per field

2. **Dynamic Chart Type Resolution**
   - `fieldStatistics` computed signal enhanced with preference lookup
   - For each field, check `ChartPreferenceService.getChartType(formId, fieldId)` first
   - If preference exists and is compatible with data type, use it
   - If no preference or incompatible, fall back to existing default logic:
     - Numeric → Stat Card
     - Choice (select/radio/checkbox) → Bar Chart
     - Timeseries (date/datetime) → Line Chart
     - Toggle → Pie Chart
   - New `FieldStatistics` interface includes `chartType` property

3. **Template Dynamic Rendering**
   - Visual Analytics section template updated with comprehensive `@switch` statement
   - Switch cases for all 8 chart types:
     - `@case ('bar')` → `<app-bar-chart>`
     - `@case ('line')` → `<app-line-chart>`
     - `@case ('pie')` → `<app-pie-chart>`
     - `@case ('polar')` → `<app-polar-chart>`
     - `@case ('radar')` → `<app-radar-chart>`
     - `@case ('area')` → `<app-area-chart>`
     - `@case ('doughnut')` → `<app-doughnut-chart>`
     - `@case ('horizontal-bar')` → `<app-horizontal-bar-chart>`
     - `@case ('stat')` → `<app-stat-card>`
     - `@default` → Error state or fallback to bar chart
   - Each chart component receives correct input data type

### Integration Requirements

4. **ChartType Enum in Shared Package**
   - Add `ChartType` enum to @nodeangularfullstack/shared types
   - Enum values:
     `'bar' | 'line' | 'pie' | 'polar' | 'radar' | 'area' | 'doughnut' | 'horizontal-bar' | 'stat'`
   - Export from shared package index
   - Used consistently across service, component, and template

5. **Chart Type Selector Integration**
   - Chart selector from Story 17.1 filters options based on compatibility matrix
   - Method `getAvailableChartTypes(stat: FieldStatistics): ChartTypeOption[]` returns compatible
     types
   - Chart selector dropdown populated with filtered list
   - Incompatible chart types not shown to user (prevents errors)

6. **Backward Compatibility Maintained**
   - Forms without saved preferences work exactly as before
   - Default chart type logic unchanged
   - No breaking changes to existing analytics functionality
   - Migration path for existing users (preferences start empty, defaults apply)

### Quality Requirements

7. **Type Safety and Validation**
   - All chart type strings use `ChartType` enum (no magic strings)
   - TypeScript strict mode catches incompatible data/chart combinations at compile time
   - Runtime validation prevents rendering errors if invalid chart type selected
   - Defensive coding for edge cases (null data, missing preferences)

8. **Component Integration Tests**
   - FormAnalyticsComponent tests cover dynamic chart rendering
   - Tests verify preference lookup before default assignment
   - Tests verify all 8 chart types render correctly with appropriate data
   - Tests verify compatibility matrix filtering works
   - Tests verify backward compatibility (no preferences)

9. **Performance Verification**
   - Chart type change triggers minimal re-renders (only affected field card)
   - Computed signal dependencies optimized (no unnecessary recalculations)
   - No performance degradation with 20+ fields displayed
   - Browser profiling shows < 50ms render time for chart type switch

---

## Technical Notes

### Integration Approach

**ChartType Enum in Shared Package:**

```typescript
// packages/shared/src/types/analytics.types.ts

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'polar'
  | 'radar'
  | 'area'
  | 'doughnut'
  | 'horizontal-bar'
  | 'stat';

export interface ChartTypeOption {
  value: ChartType;
  label: string;
  icon: string;
}

// Export from index
export * from './analytics.types';
```

**Chart Type Compatibility Matrix:**

```typescript
// apps/web/.../form-analytics/form-analytics.component.ts

import { ChartType } from '@nodeangularfullstack/shared';

const CHART_TYPE_COMPATIBILITY: Record<string, ChartType[]> = {
  numeric: ['stat', 'bar', 'line', 'area'],
  choice: ['bar', 'pie', 'doughnut', 'polar', 'radar', 'horizontal-bar'],
  timeseries: ['line', 'area', 'bar'],
  toggle: ['pie', 'doughnut', 'polar', 'bar'],
};

const DEFAULT_CHART_TYPES: Record<string, ChartType> = {
  numeric: 'stat',
  choice: 'bar',
  timeseries: 'line',
  toggle: 'pie',
};
```

**Enhanced FieldStatistics Interface:**

```typescript
// Extend existing FieldStatistics interface in shared package

export interface FieldStatistics {
  field: FormField;
  type: 'numeric' | 'choice' | 'timeseries' | 'toggle' | 'none';
  data: NumericStatistics | ChoiceDistribution[] | TimeSeriesData[] | null;
  chartType: ChartType; // NEW: Selected or default chart type
}
```

**Refactored fieldStatistics Computed Signal:**

```typescript
// apps/web/.../form-analytics/form-analytics.component.ts

readonly fieldStatistics = computed<FieldStatistics[]>(() => {
  const submissions = this.submissions();
  const fields = this.formFields();
  const formId = this.formId();

  if (submissions.length === 0 || fields.length === 0) {
    return [];
  }

  const displayOnlyFields = [
    FormFieldType.HEADING,
    FormFieldType.IMAGE,
    FormFieldType.TEXT_BLOCK,
    FormFieldType.DIVIDER,
  ];

  return fields
    .filter((field) => !displayOnlyFields.includes(field.type))
    .map((field) => {
      const values = submissions.map((s) => s.values[field.fieldName]);
      let type: 'numeric' | 'choice' | 'timeseries' | 'toggle' | 'none';
      let data: any;

      // Determine data type and calculate statistics (existing logic)
      switch (field.type) {
        case FormFieldType.NUMBER:
          type = 'numeric';
          data = this.statisticsEngine.calculateNumericStats(values as number[]);
          break;
        case FormFieldType.SELECT:
        case FormFieldType.RADIO:
        case FormFieldType.CHECKBOX:
          type = 'choice';
          data = this.statisticsEngine.calculateChoiceDistribution(
            values as (string | number | string[])[],
            field.options ?? []
          );
          break;
        case FormFieldType.DATE:
        case FormFieldType.DATETIME:
          type = 'timeseries';
          data = this.statisticsEngine.generateTimeSeries(
            values.filter((v) => v != null).map((v) => new Date(v as string)),
            'day'
          );
          break;
        case FormFieldType.TOGGLE:
          type = 'toggle';
          data = this.statisticsEngine.calculateToggleDistribution(values as boolean[]);
          break;
        default:
          type = 'none';
          data = null;
      }

      // NEW: Determine chart type based on preference or default
      let chartType: ChartType;
      const savedPreference = this.chartPreferenceService.getChartType(formId, field.id);

      if (savedPreference && this.isCompatibleChartType(type, savedPreference)) {
        // Use saved preference if compatible
        chartType = savedPreference;
      } else {
        // Fall back to default chart type for data type
        chartType = DEFAULT_CHART_TYPES[type] || 'bar';
      }

      return { field, type, data, chartType };
    });
});

/**
 * Check if chart type is compatible with data type
 */
private isCompatibleChartType(dataType: string, chartType: ChartType): boolean {
  return CHART_TYPE_COMPATIBILITY[dataType]?.includes(chartType) ?? false;
}

/**
 * Get available chart types for a field based on its data type
 */
getAvailableChartTypes(stat: FieldStatistics): ChartTypeOption[] {
  const compatibleTypes = CHART_TYPE_COMPATIBILITY[stat.type] || [];

  return ALL_CHART_TYPE_OPTIONS.filter(option =>
    compatibleTypes.includes(option.value)
  );
}

// Define all chart type options with icons and labels
const ALL_CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  { value: 'bar', label: 'Bar Chart', icon: 'pi pi-chart-bar' },
  { value: 'line', label: 'Line Chart', icon: 'pi pi-chart-line' },
  { value: 'pie', label: 'Pie Chart', icon: 'pi pi-chart-pie' },
  { value: 'polar', label: 'Polar Chart', icon: 'pi pi-circle' },
  { value: 'radar', label: 'Radar Chart', icon: 'pi pi-star' },
  { value: 'area', label: 'Area Chart', icon: 'pi pi-wave' },
  { value: 'doughnut', label: 'Doughnut Chart', icon: 'pi pi-circle-off' },
  { value: 'horizontal-bar', label: 'Horizontal Bar', icon: 'pi pi-align-left' },
  { value: 'stat', label: 'Stat Card', icon: 'pi pi-calculator' }
];
```

**Updated Template with Dynamic Chart Rendering:**

```html
<!-- Visual Analytics Section (lines 216-272) -->
<div class="charts-dashboard">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-gray-900">Visual Analytics</h2>
    <button
      pButton
      label="Configure Fields"
      icon="pi pi-cog"
      severity="secondary"
      [outlined]="true"
      (click)="showFieldSelector.set(true)"
    ></button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    @for (stat of fieldStatistics(); track stat.field.id) { @if
    (visibleFieldIds().has(stat.field.id)) {
    <div class="bg-white rounded-lg shadow p-6">
      <!-- Chart Type Selector (from Story 17.1) -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">{{ stat.field.label }}</h3>
        <p-dropdown
          [options]="getAvailableChartTypes(stat)"
          [ngModel]="stat.chartType"
          (onChange)="onChartTypeChange(stat.field.id, $event.value)"
          optionLabel="label"
          optionValue="value"
          [style]="{ width: '200px' }"
        ></p-dropdown>
      </div>

      <!-- Dynamic Chart Rendering based on chartType -->
      @if (stat.data) { @switch (stat.chartType) { @case ('bar') {
      <app-bar-chart [title]="stat.field.label" [data]="$any(stat.data)"></app-bar-chart>
      } @case ('line') {
      <app-line-chart
        [title]="stat.field.label + ' - Timeline'"
        [data]="$any(stat.data)"
      ></app-line-chart>
      } @case ('pie') {
      <app-pie-chart [title]="stat.field.label" [data]="$any(stat.data)"></app-pie-chart>
      } @case ('polar') {
      <app-polar-chart [title]="stat.field.label" [data]="$any(stat.data)"></app-polar-chart>
      } @case ('radar') {
      <app-radar-chart [title]="stat.field.label" [data]="$any(stat.data)"></app-radar-chart>
      } @case ('area') {
      <app-area-chart
        [title]="stat.field.label + ' - Timeline'"
        [data]="$any(stat.data)"
      ></app-area-chart>
      } @case ('doughnut') {
      <app-doughnut-chart [title]="stat.field.label" [data]="$any(stat.data)"></app-doughnut-chart>
      } @case ('horizontal-bar') {
      <app-horizontal-bar-chart
        [title]="stat.field.label"
        [data]="$any(stat.data)"
      ></app-horizontal-bar-chart>
      } @case ('stat') {
      <app-stat-card [title]="stat.field.label" [data]="$any(stat.data)"></app-stat-card>
      } @default {
      <!-- Fallback to bar chart -->
      <app-bar-chart [title]="stat.field.label" [data]="$any(stat.data)"></app-bar-chart>
      } } }
    </div>
    } }
  </div>
</div>
```

**Component Imports Update:**

```typescript
// Add new chart component imports
import { PolarChartComponent } from './charts/polar-chart.component';
import { RadarChartComponent } from './charts/radar-chart.component';
import { AreaChartComponent } from './charts/area-chart.component';
import { DoughnutChartComponent } from './charts/doughnut-chart.component';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart.component';

@Component({
  // ...
  imports: [
    // ... existing imports
    PolarChartComponent,
    RadarChartComponent,
    AreaChartComponent,
    DoughnutChartComponent,
    HorizontalBarChartComponent,
  ]
})
```

### Existing Pattern Reference

**Current `fieldStatistics` computed signal (lines 386-458):**

- Maps each field to statistics based on field type
- Uses switch statement to determine data type
- Calls StatisticsEngineService methods for calculations
- Returns array of `FieldStatistics` objects

**This story extends the pattern by:**

- Adding `chartType` property to FieldStatistics
- Looking up preference before assigning chart type
- Validating compatibility with data type
- Providing method to get available chart types for selector

### Key Constraints

- **No StatisticsEngineService changes** - Data transformation logic unchanged
- **Type safety** - All chart types use enum, no magic strings
- **Performance** - Chart type change should not recalculate statistics (only re-render)
- **Backward compatibility** - Default behavior identical to current implementation

---

## Definition of Done

- ✅ `ChartType` enum added to @nodeangularfullstack/shared types
- ✅ `CHART_TYPE_COMPATIBILITY` matrix implemented
- ✅ `FieldStatistics` interface extended with `chartType` property
- ✅ `fieldStatistics` computed signal refactored with preference lookup
- ✅ `isCompatibleChartType()` validation method implemented
- ✅ `getAvailableChartTypes()` method for chart selector filtering
- ✅ Template updated with comprehensive `@switch` statement for all 8 chart types
- ✅ All chart components imported into FormAnalyticsComponent
- ✅ Chart type selector filters options based on data type compatibility
- ✅ Default chart type behavior matches existing logic (backward compatible)
- ✅ Integration tests updated and passing
- ✅ Manual testing confirms all chart types render correctly with appropriate data
- ✅ Performance profiling shows < 50ms render time for chart type switches
- ✅ No console errors or warnings
- ✅ Existing analytics functionality regression tested
- ✅ Code follows TypeScript strict mode and type safety standards
- ✅ JSDoc comments added for new methods and constants
- ✅ Code reviewed and approved
- ✅ Story demonstrated to product owner with all 8 chart types working

---

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk:** Incorrect chart type/data type pairing causing runtime rendering errors or
incorrect visualizations.

**Mitigation:**

1. TypeScript strict mode catches type mismatches at compile time
2. `CHART_TYPE_COMPATIBILITY` matrix prevents incompatible selections
3. Runtime validation in `isCompatibleChartType()` method
4. `@default` case in template switch provides fallback
5. Defensive `$any()` type casts only where necessary
6. Comprehensive integration tests cover all chart/data type combinations

**Rollback:**

- Revert `fieldStatistics` computed signal to original implementation (remove chartType logic)
- Remove chart type selector from template
- Remove new chart component imports
- Restore hard-coded chart type switch statement (lines 234-267)
- Keep ChartType enum and compatibility matrix for future use

**Rollback Complexity:** Medium (~ 20 minutes, revert 3-4 file changes)

### Compatibility Verification

- ✅ **No breaking changes to existing APIs** - No backend changes
- ✅ **Database changes** - None
- ✅ **UI changes follow existing patterns** - Extends existing computed signal and template
  patterns
- ✅ **Performance impact is negligible** - Computed signals optimize re-renders, localStorage
  lookup is < 1ms
- ✅ **Backward compatible** - Default behavior identical for users without preferences

---

## Implementation Checklist

### Phase 1: Shared Types and Constants (1 hour)

- [ ] Add `ChartType` enum to packages/shared/src/types/analytics.types.ts
- [ ] Export ChartType from shared package index
- [ ] Run `npm run build:shared` to rebuild shared package
- [ ] Define `CHART_TYPE_COMPATIBILITY` matrix in FormAnalyticsComponent
- [ ] Define `DEFAULT_CHART_TYPES` mapping
- [ ] Define `ALL_CHART_TYPE_OPTIONS` array with icons

### Phase 2: FieldStatistics Refactoring (1.5 hours)

- [ ] Extend `FieldStatistics` interface with `chartType` property
- [ ] Refactor `fieldStatistics` computed signal with preference lookup logic
- [ ] Implement `isCompatibleChartType()` validation method
- [ ] Implement `getAvailableChartTypes()` method for chart selector
- [ ] Update `onChartTypeChange()` method to trigger re-render
- [ ] Test computed signal with various preference scenarios

### Phase 3: Template Integration (1 hour)

- [ ] Import all 5 new chart components into FormAnalyticsComponent
- [ ] Update template with comprehensive `@switch` statement (8 cases + default)
- [ ] Integrate chart type selector with `getAvailableChartTypes()` filtering
- [ ] Update chart selector to use `stat.chartType` as model
- [ ] Add default fallback case in switch
- [ ] Test all chart types render in browser

### Phase 4: Testing and Validation (0.5 hours)

- [ ] Update FormAnalyticsComponent integration tests
- [ ] Test all data type / chart type combinations
- [ ] Test compatibility matrix filtering
- [ ] Test backward compatibility (no preferences)
- [ ] Test preference persistence after chart type change
- [ ] Performance profiling for chart type switches
- [ ] Verify no console errors or warnings
- [ ] Regression test existing analytics functionality

---

**Story Status:** Ready for Development **Dependencies:**

- Story 17.1 (ChartPreferenceService) - MUST be complete
- Story 17.2 (New Chart Components) - MUST be complete **Blocked By:** None **Completes Epic:** Epic
  17 - Dynamic Chart Type Selection for Analytics
