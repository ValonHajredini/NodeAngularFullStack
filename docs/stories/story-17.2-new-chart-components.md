# Story 17.2: New Chart Components (Polar, Radar, Area, Doughnut, Horizontal Bar) - Brownfield Addition

**Epic:** Epic 17 - Dynamic Chart Type Selection for Analytics **Story Points:** 6 hours
**Priority:** High **Status:** Ready for Development **Dependencies:** Story 17.1 (Chart Preference
Service)

---

## User Story

**As a** form analytics user, **I want** additional chart visualization options including polar,
radar, area, doughnut, and horizontal bar charts, **So that** I can visualize my form submission
data using the chart type that best communicates my insights.

---

## Story Context

### Existing System Integration

**Integrates with:**

- FormAnalyticsComponent Visual Analytics section (template lines 230-272)
- Existing chart components pattern (BarChartComponent, LineChartComponent, PieChartComponent,
  StatCardComponent)
- StatisticsEngineService data transformation methods (no changes needed)

**Technology:**

- Angular 20+ standalone components with OnPush change detection
- PrimeNG Chart (UIChart component wrapping Chart.js)
- TypeScript with signals and computed properties
- Chart.js configuration objects for chart options

**Follows pattern:**

- Existing BarChartComponent structure (apps/web/.../charts/bar-chart.component.ts)
- WCAG AA accessibility pattern with data table alternatives
- "Show Data Table" toggle functionality
- Screen reader accessible aria-labels and live regions
- PrimeNG Table for accessible data table view

**Touch points:**

- Chart components directory:
  apps/web/src/app/features/tools/components/form-builder/form-analytics/charts/
- FormAnalyticsComponent imports array (add new chart components)
- Chart type enum/type definition in shared package

---

## Acceptance Criteria

### Functional Requirements

1. **PolarChartComponent - Circular Radar-Style Chart**
   - Displays data in circular segments around a center point
   - Best for: Choice distribution data (select, radio, checkbox fields)
   - Uses `type="polarArea"` from Chart.js
   - Each option displayed as a colored segment with varying radius
   - Interactive tooltips show count and percentage
   - Legend displays option labels with color indicators
   - Accepts `ChoiceDistribution[]` input data

2. **RadarChartComponent - Multi-Axis Spider Chart**
   - Displays data across multiple axes radiating from center
   - Best for: Choice distribution or multi-series comparison data
   - Uses `type="radar"` from Chart.js
   - Each axis represents an option/category
   - Data points connected to form polygon shape
   - Supports multiple datasets for comparison (future enhancement)
   - Accepts `ChoiceDistribution[]` input data

3. **AreaChartComponent - Filled Line Chart**
   - Displays timeseries or trend data with filled area under curve
   - Best for: Date/datetime fields showing submission trends over time
   - Uses `type="line"` with `fill: true` configuration
   - Smooth curves with gradient fill under line
   - X-axis shows time periods, Y-axis shows count
   - Interactive tooltips show date and count
   - Accepts `TimeSeriesData[]` input data

4. **DoughnutChartComponent - Hollow Pie Chart**
   - Displays distribution data as hollow circular segments
   - Best for: Toggle fields (Yes/No) or choice fields with few options
   - Uses `type="doughnut"` from Chart.js
   - Similar to pie chart but with center cutout
   - Each segment shows percentage and count in tooltips
   - Legend displays category labels
   - Accepts `ChoiceDistribution[]` input data

5. **HorizontalBarChartComponent - Horizontal Bar Chart**
   - Displays choice distribution data with horizontal bars
   - Best for: Choice fields with long option labels
   - Uses `type="bar"` with `indexAxis: 'y'` configuration
   - Labels on Y-axis (left), bars extend rightward
   - Better readability for long option names
   - Interactive tooltips show count and percentage
   - Accepts `ChoiceDistribution[]` input data

### Integration Requirements

6. **Consistent Component Architecture**
   - All components follow standalone component pattern
   - All use `ChangeDetectionStrategy.OnPush`
   - All components located in: apps/web/.../form-analytics/charts/
   - File naming pattern: `{chart-type}-chart.component.ts`
   - Each component has corresponding spec file: `{chart-type}-chart.component.spec.ts`

7. **Common Component Interface**
   - All components accept `title` input: `title = input.required<string>()`
   - All components accept `data` input with appropriate type
   - All components provide "Show Data Table" toggle: `showDataTable = signal(false)`
   - All components provide `toggleDataTable()` method
   - All components use `chartData` computed signal for PrimeNG Chart
   - All components provide `getChartAriaLabel()` method for accessibility

8. **Data Type Compatibility**
   - PolarChartComponent: Accepts `ChoiceDistribution[]`
   - RadarChartComponent: Accepts `ChoiceDistribution[]`
   - AreaChartComponent: Accepts `TimeSeriesData[]`
   - DoughnutChartComponent: Accepts `ChoiceDistribution[]`
   - HorizontalBarChartComponent: Accepts `ChoiceDistribution[]`
   - Components validate input data and show "No data available" for empty arrays

### Quality Requirements

9. **WCAG AA Accessibility Compliance**
   - Each chart wrapped in `<div role="img" [attr.aria-label]="getChartAriaLabel()">...</div>`
   - Descriptive aria-label provides context: chart type, total responses, top value
   - Hidden data table for screen readers with same data (`<div class="sr-only" role="table">`)
   - Visible data table toggle for keyboard-only users
   - Live region announces chart updates:
     `<div aria-live="polite" aria-atomic="true" class="sr-only">`
   - Keyboard navigation support for chart interactions

10. **Unit Tests for Each Component**
    - Component renders correctly with valid data
    - Component handles empty data gracefully (shows "No data available")
    - Toggle data table functionality works
    - Chart options configured correctly
    - Aria-label generation provides meaningful description
    - Input validation prevents runtime errors

11. **Visual Consistency**
    - All charts use consistent color palette (primary: #3B82F6, secondary: #10B981, etc.)
    - Consistent font sizes and styling
    - Consistent spacing and padding
    - Chart container height: 300px (matching existing charts)
    - Responsive behavior on mobile devices
    - Loading states handled gracefully

---

## Technical Notes

### Integration Approach

**Component Template Structure (consistent across all charts):**

```typescript
@Component({
  selector: 'app-{chart-type}-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIChart, TableModule, ButtonModule],
  template: `
    <div class="chart-container" role="region" [attr.aria-label]="'Chart: ' + title()">
      <!-- Header with title and toggle button -->
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-900">{{ title() }}</h3>
        <button
          pButton
          type="button"
          [label]="showDataTable() ? 'Show Chart' : 'Show Data Table'"
          [icon]="showDataTable() ? 'pi pi-chart-bar' : 'pi pi-table'"
          class="p-button-sm p-button-text"
          (click)="toggleDataTable()"
        ></button>
      </div>

      @if (data().length > 0) {
        @if (!showDataTable()) {
          <!-- Visual Chart -->
          <div role="img" [attr.aria-label]="getChartAriaLabel()">
            <p-chart
              type="{chartType}"
              [data]="chartData()"
              [options]="chartOptions"
              [style]="{ height: '300px' }"
            ></p-chart>
          </div>

          <!-- Hidden data table for screen readers -->
          <div class="sr-only" role="table">
            <!-- Accessible data table -->
          </div>
        } @else {
          <!-- Visible Data Table View -->
          <p-table [value]="data()">
            <!-- Table structure -->
          </p-table>
        }
      } @else {
        <!-- Empty state -->
        <div class="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <p class="text-gray-500">No data available</p>
        </div>
      }

      <!-- Live region for dynamic updates -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        @if (data().length > 0) {
          Chart updated: {{ data().length }} items displayed
        }
      </div>
    </div>
  `,
  styles: [ /* Standard styles */ ]
})
export class {ChartType}ChartComponent { /* ... */ }
```

**Chart.js Configuration Examples:**

**PolarChartComponent:**

```typescript
chartData = computed(() => ({
  labels: this.data().map((d) => d.label),
  datasets: [
    {
      data: this.data().map((d) => d.count),
      backgroundColor: CHART_COLORS, // Array of colors
      borderColor: '#FFFFFF',
      borderWidth: 2,
    },
  ],
}));

chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' },
    tooltip: {
      callbacks: {
        label: (context) => {
          const distribution = this.data()[context.dataIndex];
          return `${context.parsed.r} responses (${distribution.percentage.toFixed(1)}%)`;
        },
      },
    },
  },
};
```

**RadarChartComponent:**

```typescript
chartData = computed(() => ({
  labels: this.data().map((d) => d.label),
  datasets: [
    {
      label: 'Responses',
      data: this.data().map((d) => d.count),
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3B82F6',
      borderWidth: 2,
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#FFFFFF',
      pointHoverBackgroundColor: '#FFFFFF',
      pointHoverBorderColor: '#3B82F6',
    },
  ],
}));

chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      /* ... */
    },
  },
};
```

**AreaChartComponent:**

```typescript
chartData = computed(() => ({
  labels: this.data().map((d) => d.label),
  datasets: [
    {
      label: 'Submissions',
      data: this.data().map((d) => d.count),
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3B82F6',
      borderWidth: 2,
      tension: 0.4, // Smooth curves
    },
  ],
}));

chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
  plugins: {
    /* ... */
  },
};
```

**DoughnutChartComponent:**

```typescript
chartData = computed(() => ({
  labels: this.data().map((d) => d.label),
  datasets: [
    {
      data: this.data().map((d) => d.count),
      backgroundColor: CHART_COLORS,
      borderColor: '#FFFFFF',
      borderWidth: 2,
    },
  ],
}));

chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%', // Size of center hole
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      /* ... */
    },
  },
};
```

**HorizontalBarChartComponent:**

```typescript
chartData = computed(() => ({
  labels: this.data().map((d) => d.label),
  datasets: [
    {
      label: 'Responses',
      data: this.data().map((d) => d.count),
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      borderWidth: 1,
    },
  ],
}));

chartOptions = {
  indexAxis: 'y', // Horizontal bars
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
  plugins: {
    /* ... */
  },
};
```

### Existing Pattern Reference

**BarChartComponent (lines 1-209) serves as the template:**

- Standalone component with OnPush change detection
- Uses `input.required<>()` for title and data
- `showDataTable` signal for toggle state
- `chartData` computed signal transforms data for PrimeNG Chart
- `chartOptions` object configures Chart.js behavior
- `toggleDataTable()` method updates signal
- `getChartAriaLabel()` generates accessible description
- Template includes visual chart, hidden screen reader table, visible table toggle
- `.sr-only` CSS class for visually hidden but screen-reader accessible content

**All new components MUST follow this exact pattern for consistency.**

### Key Constraints

- **No StatisticsEngineService changes** - Existing data transformation methods work as-is
- **No backend API calls** - Charts render from computed signals with existing data
- **Performance** - Chart.js rendering is optimized for datasets up to 1000 points
- **Browser compatibility** - Chart.js supports all modern browsers (no IE11)
- **Mobile responsive** - Charts automatically resize in PrimeNG Chart wrapper

---

## Definition of Done

- ✅ **PolarChartComponent** created and working correctly
- ✅ **RadarChartComponent** created and working correctly
- ✅ **AreaChartComponent** created and working correctly
- ✅ **DoughnutChartComponent** created and working correctly
- ✅ **HorizontalBarChartComponent** created and working correctly
- ✅ All components follow standalone pattern with OnPush change detection
- ✅ All components maintain WCAG AA accessibility standards
- ✅ All components include "Show Data Table" toggle functionality
- ✅ All components handle empty data gracefully (show "No data available")
- ✅ Unit tests written and passing for all 5 components (10 spec files total)
- ✅ Components render correctly in browser with test data
- ✅ Screen reader testing confirms accessible labels and live regions
- ✅ Keyboard navigation works for all interactive elements
- ✅ Visual consistency verified across all chart types
- ✅ No console errors or warnings
- ✅ Code follows existing BarChartComponent pattern exactly
- ✅ JSDoc comments added for all public methods and inputs
- ✅ Code reviewed and approved
- ✅ Story demonstrated to product owner with all 5 chart types

---

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk:** Chart.js configuration errors causing rendering failures or incorrect data
visualization.

**Mitigation:**

1. Use BarChartComponent as reference template (proven working pattern)
2. Test each chart component independently with mock data before integration
3. Validate data input types with TypeScript strict mode
4. Add defensive checks for empty/null data arrays
5. Chart.js official documentation reviewed for each chart type
6. Error boundary in parent component catches rendering errors

**Rollback:**

- Remove new chart component imports from FormAnalyticsComponent
- Remove chart type options from selector (Story 17.1)
- New component files remain in codebase (inactive) for future use

**Rollback Complexity:** Simple (< 10 minutes, remove imports only)

### Compatibility Verification

- ✅ **No breaking changes to existing APIs** - No backend changes
- ✅ **Database changes** - None
- ✅ **UI changes follow existing patterns** - Exact copy of BarChartComponent pattern
- ✅ **Performance impact is negligible** - Chart.js rendering performance same as existing charts
- ✅ **Accessibility maintained** - WCAG AA standards followed for all new charts

---

## Implementation Checklist

### Phase 1: PolarChartComponent (1 hour)

- [ ] Create polar-chart.component.ts file
- [ ] Implement component structure following BarChartComponent pattern
- [ ] Configure Chart.js options for polar area chart
- [ ] Add data table toggle functionality
- [ ] Implement accessibility features (aria-labels, screen reader table)
- [ ] Write unit tests (polar-chart.component.spec.ts)
- [ ] Manual test with mock ChoiceDistribution data

### Phase 2: RadarChartComponent (1 hour)

- [ ] Create radar-chart.component.ts file
- [ ] Implement component structure
- [ ] Configure Chart.js options for radar chart
- [ ] Add data table toggle functionality
- [ ] Implement accessibility features
- [ ] Write unit tests (radar-chart.component.spec.ts)
- [ ] Manual test with mock ChoiceDistribution data

### Phase 3: AreaChartComponent (1 hour)

- [ ] Create area-chart.component.ts file
- [ ] Implement component structure
- [ ] Configure Chart.js options for filled area chart
- [ ] Add data table toggle functionality
- [ ] Implement accessibility features
- [ ] Write unit tests (area-chart.component.spec.ts)
- [ ] Manual test with mock TimeSeriesData

### Phase 4: DoughnutChartComponent (1 hour)

- [ ] Create doughnut-chart.component.ts file
- [ ] Implement component structure
- [ ] Configure Chart.js options for doughnut chart (with cutout)
- [ ] Add data table toggle functionality
- [ ] Implement accessibility features
- [ ] Write unit tests (doughnut-chart.component.spec.ts)
- [ ] Manual test with mock ChoiceDistribution data

### Phase 5: HorizontalBarChartComponent (1 hour)

- [ ] Create horizontal-bar-chart.component.ts file
- [ ] Implement component structure
- [ ] Configure Chart.js options for horizontal bars (indexAxis: 'y')
- [ ] Add data table toggle functionality
- [ ] Implement accessibility features
- [ ] Write unit tests (horizontal-bar-chart.component.spec.ts)
- [ ] Manual test with mock ChoiceDistribution data

### Phase 6: Integration Testing and Refinement (1 hour)

- [ ] Run all unit tests: `npm --workspace=apps/web run test -- --include="**/charts/*.spec.ts"`
- [ ] Visual regression testing in browser
- [ ] Test with various data sizes (empty, small, large datasets)
- [ ] Verify accessibility with screen reader (VoiceOver/NVDA)
- [ ] Test keyboard navigation for all interactive elements
- [ ] Verify responsive behavior on mobile devices
- [ ] Check console for errors/warnings
- [ ] Code review and refinement

---

**Story Status:** Ready for Development **Dependencies:** Story 17.1 (ChartPreferenceService)
**Blocked By:** None **Next Story:** Story 17.3 - Dynamic Chart Type Mapping and Integration
