# Epic 17: Dynamic Chart Type Selection for Analytics - Brownfield Enhancement

## Epic Goal

Enable users to dynamically select and change chart types for each field in the form analytics
dashboard, providing flexible data visualization options including bar, line, pie, polar, radar,
area, and doughnut charts. This enhancement empowers users to choose the most effective
visualization method for their specific data analysis needs.

## Epic Description

### Existing System Context

**Current Relevant Functionality:**

- Form analytics page displays visual charts dashboard with submission data
- Chart types are hard-coded based on field type (numeric → stat card, choice → bar, timeseries →
  line, toggle → pie)
- Users can show/hide fields but cannot change visualization types
- Charts maintain WCAG AA accessibility standards with data table alternatives
- Preferences saved to localStorage per form

**Technology Stack:**

- Angular 20+ with standalone components and signals
- PrimeNG Chart (Chart.js wrapper) for rendering
- TypeScript with computed properties and reactive signals
- StatisticsEngineService for data transformation
- localStorage API for client-side preference persistence

**Integration Points:**

- `FormAnalyticsComponent` template (lines 230-272) - Visual Analytics section
- `fieldStatistics` computed signal (lines 386-458) - Data-to-chart mapping logic
- Chart components: `BarChartComponent`, `LineChartComponent`, `PieChartComponent`,
  `StatCardComponent`
- `StatisticsEngineService` - Data transformation methods

### Enhancement Details

**What's Being Added/Changed:**

1. **Chart Type Selector UI** - Dropdown/button group on each field card allowing users to select
   from available chart types
2. **Chart Preference Storage** - localStorage-based system to persist user's chart type selections
   per field per form
3. **New Chart Components** - Five additional chart types: Polar, Radar, Area, Doughnut, Horizontal
   Bar
4. **Dynamic Chart Type Mapping** - Refactored `fieldStatistics` logic to support user-selected
   chart types instead of hard-coded mapping
5. **Accessibility Compliance** - All new charts include WCAG AA compliant data table alternatives
   and screen reader support

**How It Integrates:**

- Chart selector added to each field card in Visual Analytics section
  (form-analytics.component.ts:230-272)
- New `ChartPreferenceService` manages localStorage operations for chart type preferences
- `fieldStatistics` computed signal extended with user preference lookup before rendering
- New chart components follow existing pattern (standalone, OnPush, WCAG AA compliant)
- StatisticsEngineService methods reused for data transformation (no changes needed)

**Success Criteria:**

- ✅ Users can select any chart type for any field with analyzable data
- ✅ Chart type preferences persist across browser sessions and page refreshes
- ✅ Default chart types match existing behavior (backward compatible)
- ✅ All chart types render correctly with proper data transformation
- ✅ All charts maintain WCAG AA accessibility standards
- ✅ No regression in existing analytics functionality
- ✅ Chart selector is intuitive and follows existing UI patterns

## Stories

### Story 17.1: Chart Type Selector UI and Preference Storage

**Description:** Implement chart type selector UI component and localStorage-based preference
storage system for persisting user's chart type selections per field per form.

**Key Deliverables:**

- Chart type selector dropdown/button group component
- `ChartPreferenceService` for managing preferences
- Integration into FormAnalyticsComponent field cards
- localStorage persistence with form-scoped keys

**Estimated Effort:** 4 hours

**Acceptance Criteria:**

- Chart selector appears on each field card with available chart types
- Selecting chart type immediately updates the visualization
- Preferences persist across page refreshes and browser sessions
- Fallback to default chart type when no preference exists
- UI follows existing PrimeNG design patterns

---

### Story 17.2: New Chart Components (Polar, Radar, Area, Doughnut, Horizontal Bar)

**Description:** Build five new chart components following existing patterns with WCAG AA
accessibility compliance and data table alternatives.

**Key Deliverables:**

- `PolarChartComponent` - Circular radar-style chart
- `RadarChartComponent` - Multi-axis spider chart
- `AreaChartComponent` - Filled line chart
- `DoughnutChartComponent` - Hollow pie chart
- `HorizontalBarChartComponent` - Horizontal bar chart

**Estimated Effort:** 6 hours

**Acceptance Criteria:**

- All components standalone with OnPush change detection
- WCAG AA compliant with data table alternatives
- Screen reader accessible aria-labels and live regions
- "Show Data Table" toggle functionality
- Proper TypeScript typing for input data
- Unit tests covering core functionality
- Visual consistency with existing chart components

---

### Story 17.3: Dynamic Chart Type Mapping and Integration

**Description:** Refactor `fieldStatistics` computed signal to support dynamic chart type mapping
based on user preferences, integrating all new chart components into the analytics dashboard.

**Key Deliverables:**

- Refactored `fieldStatistics` with preference lookup
- Chart type compatibility matrix (which charts work with which data types)
- Template updates to render selected chart component
- Validation to prevent incompatible chart/data type combinations

**Estimated Effort:** 4 hours

**Acceptance Criteria:**

- `fieldStatistics` checks preference service before defaulting to hard-coded type
- Chart type selector only shows compatible chart types for each field's data type
- All chart types render correctly in Visual Analytics section
- Default behavior matches existing chart assignments (backward compatible)
- No performance degradation with dynamic chart rendering
- Existing functionality regression tested and verified

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged** - No backend changes required, all work is frontend-only
- ✅ **Database schema unchanged** - Preferences stored in localStorage, not database
- ✅ **UI changes follow existing patterns** - Uses PrimeNG components and existing design system
- ✅ **Performance impact is minimal** - Chart rendering performance unchanged, preference lookups
  are O(1)
- ✅ **Backward compatible** - Forms without preferences fall back to existing default chart types
- ✅ **Accessibility maintained** - All new charts maintain WCAG AA standards

## Risk Mitigation

**Primary Risk:** Chart rendering errors or data transformation issues with new chart types causing
analytics page to break.

**Mitigation:**

1. Comprehensive unit tests for each new chart component
2. Data validation layer in chart components to handle malformed data gracefully
3. Fallback to default chart type if selected chart fails to render
4. Error boundary in FormAnalyticsComponent to catch and handle rendering errors
5. Feature flag in development to enable/disable new chart types during testing

**Rollback Plan:**

1. Remove chart selector UI (revert FormAnalyticsComponent template changes)
2. Remove ChartPreferenceService imports and usage
3. Restore hard-coded chart type mapping in `fieldStatistics` computed signal
4. Keep new chart components (inactive) for future use
5. Clear localStorage preferences with migration script if needed

**Timeline for Rollback:** < 30 minutes (simple template/logic revert)

## Definition of Done

- ✅ All 3 stories completed with acceptance criteria met
- ✅ Chart type selector integrated into analytics dashboard
- ✅ Five new chart components built and tested
- ✅ Dynamic chart type mapping functional
- ✅ All charts maintain WCAG AA accessibility standards
- ✅ Unit tests passing for new components and services
- ✅ Existing analytics functionality verified through regression testing
- ✅ No console errors or warnings in browser console
- ✅ localStorage preference persistence working correctly
- ✅ Documentation updated (inline JSDoc comments)
- ✅ Code reviewed and merged to `main` branch

## Validation Checklist

### Scope Validation

- ✅ Epic can be completed in 3 stories maximum (Story 1: 4h, Story 2: 6h, Story 3: 4h = 14 hours
  total)
- ✅ No architectural documentation required (follows existing patterns)
- ✅ Enhancement follows existing patterns (standalone components, PrimeNG, Chart.js)
- ✅ Integration complexity is manageable (frontend-only, no API changes)

### Risk Assessment

- ✅ Risk to existing system is low (no backend changes, additive frontend feature)
- ✅ Rollback plan is feasible (< 30 minutes, simple revert)
- ✅ Testing approach covers existing functionality (regression tests)
- ✅ Team has sufficient knowledge of integration points (existing chart components as reference)

### Completeness Check

- ✅ Epic goal is clear and achievable
- ✅ Stories are properly scoped (4h, 6h, 4h)
- ✅ Success criteria are measurable
- ✅ Dependencies identified (none - all frontend)

---

## Story Manager Handoff

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing Angular 20+ form analytics system using PrimeNG Chart
  (Chart.js wrapper)
- Integration points:
  - `FormAnalyticsComponent` template (Visual Analytics section, lines 230-272)
  - `fieldStatistics` computed signal (data-to-chart mapping, lines 386-458)
  - Existing chart components: BarChart, LineChart, PieChart, StatCard
  - `StatisticsEngineService` (data transformation, no changes needed)
- Existing patterns to follow:
  - Standalone components with OnPush change detection
  - WCAG AA accessibility with data table alternatives and aria-labels
  - PrimeNG UI components and design system
  - localStorage for client-side preference persistence
  - TypeScript signals and computed properties
- Critical compatibility requirements:
  - No backend API changes
  - Backward compatible chart type defaults
  - Maintain WCAG AA accessibility standards
  - No performance degradation
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering flexible data visualization options for
form analytics users."

---

**Epic Status:** Ready for Story Development **Epic Number:** 17 **Epic Priority:** Medium **Target
Sprint:** TBD **Dependencies:** None **Blocked By:** None
