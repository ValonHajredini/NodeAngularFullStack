# Epic 30: Category-Personalized Template Analytics and Creation UX

**Version**: 1.0 **Status**: Draft **Created**: 2025-01-13 **Author**: Product Manager (John)

---

## Table of Contents

1. [Project Analysis and Context](#project-analysis-and-context)
2. [Requirements](#requirements)
3. [User Interface Enhancement Goals](#user-interface-enhancement-goals)
4. [Technical Constraints and Integration Requirements](#technical-constraints-and-integration-requirements)
5. [Epic and Story Structure](#epic-and-story-structure)
6. [Change Log](#change-log)

---

## Project Analysis and Context

### Scope Assessment

✅ **This feature qualifies for full PRD treatment** because:

- **Multiple coordinated stories needed**: Analytics visualizations for 6 categories +
  category-specific creation wizards + backend aggregation APIs
- **Impacts multiple layers**: Frontend analytics components, backend executor services, admin UI,
  shared types
- **Architectural planning required**: Need to design category-detection patterns, chart component
  architecture, wizard workflow system
- **Significant UI complexity**: 6 different analytics visualizations + dynamic wizard system

### Analysis Source

**Source**: IDE-based fresh analysis combined with existing comprehensive project documentation

**Available Documentation**:

- ✅ Epic 29 PRD (`docs/prd/epic-29-form-templates-system.md`) - Complete template system
  specification
- ✅ Story 29.14 (`docs/stories/29/29.14.poll-template-vote-aggregation.md`) - Poll template
  implementation
- ✅ Tech Stack Documentation (`docs/architecture/tech-stack.md`)
- ✅ Source Tree/Architecture (`docs/architecture/source-tree.md`)
- ✅ Coding Standards (Angular 20+ standalone components, Express.js clean architecture)
- ✅ Epic List with 29+ completed epics (`docs/prd/epic-list.md`)

### Current Project State

**Form Builder Platform Overview**: This is a comprehensive **visual form builder** with an advanced
**template system** (Epic 29 recently completed/in-progress).

**Current Template System Capabilities (Epic 29)**:

- **Template Categories**: 6 categories (E-commerce, Services, Data Collection, Events, Quiz, Polls)
- **Template Selection**: Modal UI for browsing and previewing templates
- **Template Application**: Pre-populates form builder with template configuration
- **Business Logic**: Category-specific executors (PollExecutor, QuizExecutor, InventoryExecutor,
  AppointmentExecutor, OrderExecutor)
- **Admin Management**: Template CRUD interface with JSON schema editor
- **Database**: `form_templates` table with JSONB schema storage

**Current Analytics Capabilities**:

- **Generic Analytics**: `FormAnalyticsComponent` displays submission data with Chart.js
- **Chart Types**: Bar, line, pie charts for field responses
- **Data Table**: Submission list with export to CSV
- **No Category Awareness**: All forms show same generic visualizations regardless of template type

**Gap Identified**:

1. **Analytics Mismatch**: Poll submissions show generic bar charts instead of vote percentages;
   quiz submissions don't display score distributions
2. **Template Creation Friction**: Admins edit raw JSON without category-specific guidance, leading
   to configuration errors
3. **Missed UX Opportunity**: Template-specific data (votes, scores, inventory) not surfaced
   meaningfully in analytics

### Enhancement Scope Definition

**Enhancement Type**: ☑ **New Feature Addition** + **Major Feature Modification**

**Enhancement Description**: Extend the template system (Epic 29) by adding **category-aware
analytics visualizations** that display data appropriately for each template type (e.g., vote
percentages for polls, score distributions for quizzes, sales metrics for products), and implement a
**category-guided template creation wizard** that provides step-by-step configuration panels
tailored to each category instead of raw JSON editing.

**Impact Assessment**: ☑ **Moderate Impact** (some existing code changes)

- **Frontend (`apps/form-builder-ui`)**: New analytics chart components, modified
  `FormAnalyticsComponent` with category detection, new wizard components in admin interface
- **Backend (`apps/forms-api`)**: New analytics aggregation methods in template executor services,
  new API endpoints for category-specific data
- **Minimal Impact on**: Existing form submission flow, blank form analytics (backward compatible),
  template storage schema

### Goals and Background Context

**Goals**:

- Display analytics data in formats that match the mental model of each template category (vote
  percentages, quiz scores, product sales)
- Reduce template creation errors by 60% through guided workflows instead of raw JSON editing
- Improve user engagement with template-based forms by showing relevant metrics (e.g., "Your poll
  has 243 votes" vs. "Your form has 243 submissions")
- Provide category-specific insights (e.g., "Most popular quiz score: 80%", "Top-selling product:
  Blue Sneakers")
- Enable admins to create production-ready templates in 5 minutes vs. 20+ minutes with JSON editor

**Background Context**:

The template system (Epic 29) successfully implemented 6 template categories with specialized
business logic. However, the analytics dashboard still treats all forms identically—a poll with 1000
votes shows the same generic submission table as a contact form. This creates a **disconnected
experience** where users can't see the specific metrics their template type promises (vote counts,
quiz scores, inventory levels).

Similarly, the admin template creation experience requires editing complex JSON schemas manually,
which has led to:

- Configuration errors (missing business logic config, invalid field types)
- Long creation times (20+ minutes for complex templates)
- Trial-and-error debugging (create template → test → fix JSON → repeat)

By adding **category-aware analytics** and **guided template creation**, we complete the template
system's UX vision: templates should feel purpose-built for their domain, not just pre-configured
generic forms.

---

## Requirements

### Functional Requirements

**FR1: Category Detection in Analytics Dashboard** The analytics dashboard SHALL automatically
detect the template category from `formSchema.metadata.templateCategory` and route to the
appropriate category-specific visualization component, falling back to generic analytics for blank
forms or missing category metadata.

**FR2: Poll Template Analytics - Vote Distribution Visualization** For forms created from Poll
templates, the analytics dashboard SHALL display a horizontal bar chart showing each poll option
with vote count and percentage of total votes, replacing the generic submission table.

**FR3: Quiz Template Analytics - Score Distribution and Pass Rate** For forms created from Quiz
templates, the analytics dashboard SHALL display:

- Score distribution histogram (x-axis: score ranges 0-20%, 20-40%, etc.; y-axis: student count)
- Pass/fail pie chart based on `passingScore` threshold from business logic config
- Average score metric card

**FR4: Product Template Analytics - Sales and Revenue Metrics** For forms created from Product
templates (E-commerce category), the analytics dashboard SHALL display:

- Sales volume bar chart by SKU/variant
- Revenue line chart over time
- Top-selling products list with quantities and revenue
- Low stock alerts based on inventory thresholds

**FR5: Appointment Template Analytics - Booking Heatmap** For forms created from Appointment
templates (Services category), the analytics dashboard SHALL display:

- Booking heatmap (y-axis: time slots, x-axis: days, color intensity: booking count)
- Cancellation rate metric card
- Most popular time slots list

**FR6: Restaurant Menu Template Analytics - Item Popularity** For forms created from Restaurant Menu
templates, the analytics dashboard SHALL display:

- Item popularity bar chart (sorted by order frequency)
- Average order value metric card
- Revenue breakdown by menu category (appetizers, mains, desserts)

**FR7: Category-Specific Data Aggregation API** The backend SHALL provide a
`GET /api/analytics/:formId/category-metrics` endpoint that returns aggregated data specific to the
template category (vote counts for polls, score distributions for quizzes, sales data for products,
etc.), leveraging existing template executor services.

**FR8: Template Creation Wizard - Category Selection Step** The admin template creation flow SHALL
begin with a category selection step displaying all 6 categories with icons, descriptions, and
example use cases, replacing the immediate JSON editor view.

**FR9: Template Creation Wizard - Category-Specific Configuration Panels** Based on the selected
category, the wizard SHALL display 3-5 tailored configuration steps:

- **Poll**: Question text, poll options (2-10), voting rules, results display settings
- **Quiz**: Question setup, correct answers, scoring configuration, passing threshold
- **Product**: Product details, variant configuration, inventory settings, pricing rules
- **Appointment**: Service types, time slot configuration, booking limits, calendar integration
- **Restaurant Menu**: Menu sections, item configuration, pricing, order settings
- **Data Collection**: Field selection, validation rules, layout preferences (generic workflow)

**FR10: Template Creation Wizard - Field Type Suggestions** Each category configuration panel SHALL
provide "quick add" buttons for recommended field types (e.g., "Add Product Variant Gallery" for
E-commerce, "Add Quiz Question" for Quiz category), which insert pre-configured field definitions
into the schema.

**FR11: Template Creation Wizard - Inline Validation and Help** The wizard SHALL display real-time
validation feedback with category-specific error messages (e.g., "Polls require at least 2 options"
vs. "Quizzes must define correct answers for scoring") and contextual help tooltips explaining each
configuration option.

**FR12: Template Creation Wizard - Live Preview** The wizard SHALL include a live preview panel
showing how the template will render as a form, updating in real-time as admins configure fields and
settings, using the existing `FormRendererComponent` in preview mode.

**FR13: Template Creation Wizard - JSON Export/Import** The wizard SHALL include an "Advanced Mode"
toggle that reveals the underlying JSON schema for power users, allowing direct editing while
maintaining wizard-based validation, and SHALL support importing existing JSON schemas to
pre-populate wizard fields.

**FR14: Template Creation Wizard - Business Logic Configuration** Category-specific wizard steps
SHALL include dedicated panels for business logic configuration:

- **Poll**: Duplicate vote prevention method (session/IP/user), results visibility timing
- **Quiz**: Scoring algorithm, answer randomization, time limits
- **Product**: Inventory tracking setup, stock alert thresholds, variant pricing rules
- **Appointment**: Conflict detection settings, buffer times, cancellation policies

**FR15: Analytics Dashboard - Category Badge Display** The analytics page header SHALL display a
category badge (e.g., "Poll Template", "Quiz Template") with the category icon when viewing
template-based forms, helping users identify the template type at a glance.

**FR16: Analytics Dashboard - Category-Specific Export Formats** The CSV export functionality SHALL
include category-specific columns:

- **Poll**: Option selected, vote timestamp, voter session ID
- **Quiz**: Score, correct answers count, passed (true/false), time taken
- **Product**: SKU ordered, quantity, total price, variant selection
- **Appointment**: Date, time slot, booking status, customer contact

**FR17: Backward Compatibility - Generic Analytics Fallback** Forms created without templates (blank
forms) or forms with missing/invalid category metadata SHALL display the existing generic analytics
interface unchanged, ensuring no regression in functionality.

**FR18: Template Editor - Modification Mode** When editing an existing template via the admin
interface, the wizard SHALL load with all configuration panels pre-populated from the existing
`template_schema` and `business_logic_config` JSONB columns, allowing admins to modify templates
using the same guided workflow.

### Non-Functional Requirements

**NFR1: Analytics Load Performance** Category-specific analytics dashboards SHALL load and render
charts within 800ms (p95) for forms with up to 10,000 submissions, utilizing server-side aggregation
and client-side caching to prevent performance degradation.

**NFR2: Wizard UI Responsiveness** Template creation wizard panels SHALL render within 200ms when
switching between category configuration steps, ensuring smooth user experience during template
creation.

**NFR3: Analytics Data Aggregation Efficiency** Category-specific aggregation queries (vote counts,
score distributions, sales metrics) SHALL execute within 300ms (p95) using PostgreSQL window
functions and indexed JSONB queries on `form_submissions.data` column.

**NFR4: Chart Rendering Performance** Chart.js visualizations for category-specific analytics SHALL
render within 500ms for datasets up to 1000 data points, utilizing canvas rendering optimizations
and data decimation for large datasets.

**NFR5: Wizard Accessibility Compliance** Template creation wizard components SHALL meet WCAG 2.1 AA
standards with full keyboard navigation (Tab, Enter, Escape), screen reader support, and focus
management across wizard steps.

**NFR6: Analytics Component Modularity** Category-specific analytics components SHALL be implemented
as standalone Angular components with minimal coupling to `FormAnalyticsComponent`, allowing
independent testing and future category additions without modifying existing code.

**NFR7: Code Maintainability - Strategy Pattern for Analytics** Category-specific analytics logic
SHALL follow the strategy pattern with an `IAnalyticsStrategy` interface, mirroring the existing
template executor pattern (`IExportStrategy` from Epic 33), enabling new categories to be added with
~100 lines of code per category.

**NFR8: Wizard State Persistence** Template creation wizard SHALL persist draft state to browser
localStorage every 5 seconds, allowing admins to resume incomplete template creation after browser
refresh or accidental navigation away.

**NFR9: Analytics Scalability** Category-specific analytics SHALL support forms with up to 100,000
submissions by implementing pagination (1000 submissions per page) and on-demand aggregation
(compute metrics only when analytics page is accessed, not on every submission).

**NFR10: Wizard Validation Coverage** Category-specific wizard validation rules SHALL achieve 100%
coverage of business logic requirements (e.g., poll option count, quiz correct answer presence,
product SKU uniqueness), preventing invalid template creation that would fail at runtime.

### Compatibility Requirements

**CR1: Existing Analytics Component Compatibility** The `FormAnalyticsComponent` MUST continue to
render generic analytics for blank forms (forms without `formSchema.metadata.templateCategory`)
without code changes, ensuring zero regression for existing non-template form analytics.

**CR2: Template Executor Service API Stability** Existing template executor methods
(`PollExecutor.execute()`, `QuizExecutor.execute()`, etc.) MUST remain unchanged; new aggregation
methods (e.g., `PollExecutor.getVoteDistribution()`) SHALL be additive only, preserving Epic 29
submission logic.

**CR3: Form Schema Compatibility** Category metadata SHALL be stored in an optional
`formSchema.metadata.templateCategory` field (JSONB column), ensuring forms created before this epic
(without category metadata) remain fully functional with automatic fallback to generic analytics.

**CR4: Template Database Schema Stability** The existing `form_templates` table schema MUST remain
unchanged; no new columns or migrations required. Category information already exists in
`template_schema` JSONB and `category` VARCHAR column from Epic 29.

**CR5: Admin Template Management Integration** The new wizard-based template creation SHALL coexist
with the existing JSON editor from Epic 29, accessible via an "Advanced Mode" toggle, ensuring power
users can still edit raw JSON if needed without workflow disruption.

**CR6: Chart.js Integration Compatibility** Category-specific charts SHALL use the existing Chart.js
library (already integrated in `FormAnalyticsComponent` from Epic 10, 17) without introducing new
charting dependencies, maintaining consistent theming and tooltip behavior.

**CR7: Backend API Versioning** The new `GET /api/analytics/:formId/category-metrics` endpoint SHALL
be added to existing routes without modifying or removing current analytics endpoints
(`GET /api/forms/:id/analytics`), ensuring API backward compatibility.

**CR8: PrimeNG Component Consistency** Template creation wizard SHALL use existing PrimeNG
components (`p-steps`, `p-accordion`, `p-dialog`, `p-inputText`) already present in the project,
following the same styling patterns as `ThemeDesignerModalComponent` (Epic 23-24) and
`ExportProgressModalComponent` (Epic 32).

---

## User Interface Enhancement Goals

### Integration with Existing UI

**Design System Consistency:**

The category-personalized components will leverage the existing PrimeNG 17+ components and Tailwind
CSS utility classes to maintain seamless visual integration:

**Category-Specific Analytics Components:**

- **Container**: Built within existing `FormAnalyticsComponent`
  (`apps/form-builder-ui/src/app/features/dashboard/form-analytics/form-analytics.component.ts`)
- **Chart Wrapper**: Uses existing Chart.js integration from Epic 10/17 with PrimeNG `p-card`
  containers
- **Category Badge**: PrimeNG `p-tag` component with category-specific colors (consistent with
  template category cards from Epic 29)
- **Data Table**: Extends existing PrimeNG `p-table` component with category-specific columns
- **Export Button**: Maintains existing `p-button` styling from analytics toolbar

**Template Creation Wizard Components:**

- **Wizard Container**: PrimeNG `p-steps` component (same pattern as checkout flows in e-commerce
  demos)
- **Step Panels**: PrimeNG `p-accordion` for collapsible configuration sections (follows
  `RowLayoutSidebarComponent` pattern from Epic 14)
- **Form Controls**: Existing form components (`p-inputText`, `p-dropdown`, `p-inputNumber`,
  `p-checkbox`) with reactive forms
- **Preview Panel**: Reuses `FormRendererComponent` in preview mode (same approach as Story 14.3 and
  `TemplatePreviewModalComponent` from Epic 29)
- **Advanced Mode Toggle**: PrimeNG `p-inputSwitch` for JSON editor visibility
- **Monaco Editor**: Existing integration from `TemplateEditorComponent` (Epic 29)

**Component Hierarchy Integration:**

```
FormAnalyticsComponent (existing - apps/form-builder-ui/)
├─> CategoryBadgeComponent (new - displays template category)
├─> [IF templateCategory exists]
│   ├─> PollAnalyticsComponent (new - vote distribution chart)
│   ├─> QuizAnalyticsComponent (new - score histogram + pass/fail pie)
│   ├─> ProductAnalyticsComponent (new - sales/revenue charts)
│   ├─> AppointmentAnalyticsComponent (new - booking heatmap)
│   ├─> RestaurantAnalyticsComponent (new - item popularity chart)
│   └─> DataCollectionAnalyticsComponent (fallback - generic charts)
└─> [ELSE] GenericAnalyticsView (existing - unchanged)

TemplateEditorComponent (existing - apps/web/features/admin/components/template-editor/)
├─> CategorySelectionStep (new - wizard step 1)
├─> TemplateWizardComponent (new - replaces immediate JSON editor)
│   ├─> PollWizardPanel (new - poll-specific config)
│   ├─> QuizWizardPanel (new - quiz-specific config)
│   ├─> ProductWizardPanel (new - product-specific config)
│   ├─> AppointmentWizardPanel (new - appointment-specific config)
│   ├─> RestaurantWizardPanel (new - menu-specific config)
│   └─> DataCollectionWizardPanel (new - generic form config)
├─> LivePreviewPanel (new - wraps FormRendererComponent)
└─> [IF advancedMode] MonacoEditorPanel (existing - JSON editor)
```

**Signal-Based State Management:**

The category-aware components will integrate with existing service signals:

```typescript
// FormAnalyticsComponent (modified)
export class FormAnalyticsComponent {
  private analyticsService = inject(FormAnalyticsService);

  // Existing signals (unchanged)
  formSchema = signal<FormSchema | null>(null);
  submissions = signal<FormSubmission[]>([]);

  // NEW: Category detection signals
  templateCategory = computed(() => this.formSchema()?.metadata?.templateCategory || null);

  analyticsStrategy = computed(() => this.getStrategyForCategory(this.templateCategory()));

  categoryMetrics = toSignal(
    toObservable(this.formId).pipe(switchMap((id) => this.analyticsService.getCategoryMetrics(id)))
  );
}

// TemplateWizardService (new)
export class TemplateWizardService {
  // Wizard state signals
  selectedCategory = signal<TemplateCategory | null>(null);
  currentStep = signal<number>(0);
  wizardConfig = signal<Partial<FormTemplate>>({});

  // Computed preview schema
  previewSchema = computed(() => this.buildSchemaFromWizardConfig(this.wizardConfig()));

  // Validation state
  currentStepValid = computed(() => this.validateStep(this.currentStep(), this.wizardConfig()));
}
```

**Styling Approach:**

- **Theme Variables**: Components respect the active PrimeNG theme (same as Epic 20-25 theme system)
- **Color Palette**: Category badges use semantic colors:
  - Poll: `--blue-500` (democratic/voting blue)
  - Quiz: `--purple-500` (education purple)
  - Product: `--green-500` (commerce green)
  - Appointment: `--orange-500` (calendar orange)
  - Restaurant: `--red-500` (food service red)
  - Data Collection: `--cyan-500` (data/forms cyan)
- **Responsive Breakpoints**: Mobile-first design using Tailwind breakpoints (`sm:`, `md:`, `lg:`)
  consistent with form renderer
- **Icon System**: PrimeIcons library (e.g., `pi-chart-bar`, `pi-percentage`, `pi-trophy` for quiz
  scores, `pi-shopping-cart` for products)

### Modified/New Screens and Views

**Form Builder UI (`apps/form-builder-ui`):**

#### **1. MODIFIED: Form Analytics Page** (`src/app/features/dashboard/form-analytics/form-analytics.component.ts`)

**Current State**: Generic analytics with bar/line/pie charts for all forms

**Modifications**:

- **Add category badge** to page header (displays "Poll Template", "Quiz Template", etc. with icon)
- **Add category detection logic** in component initialization
- **Add conditional rendering** for category-specific chart components
- **No changes to**: Export to CSV button, data table pagination, date range filters (remain
  functional)

#### **2. NEW: Poll Analytics Component** (`src/app/features/dashboard/form-analytics/poll-analytics/`)

**Purpose**: Display poll vote distribution with horizontal bar chart and percentages

**Layout**:

- **Header**: "Vote Distribution" title + total votes metric card
- **Chart**: Horizontal bar chart (Chart.js) showing vote counts and percentages
- **Insights Panel**: "Most popular option", "Voting trend" (increasing/stable/decreasing)
- **Data Table**: Voter details (timestamp, IP/session, option selected) with privacy controls

#### **3. NEW: Quiz Analytics Component** (`src/app/features/dashboard/form-analytics/quiz-analytics/`)

**Purpose**: Display quiz score distribution and pass/fail rates

**Layout**:

- **Metric Cards Row**: Average score, Pass rate, Total submissions
- **Score Distribution Chart**: Histogram with color-coded score ranges
- **Pass/Fail Pie Chart**: Two-slice pie showing pass vs. fail ratio
- **Leaderboard Table**: Top 10 scores with anonymized names (if enabled)

#### **4. NEW: Product Analytics Component** (`src/app/features/dashboard/form-analytics/product-analytics/`)

**Purpose**: Display sales volume, revenue, and inventory metrics

**Layout**:

- **Metric Cards Row**: Total revenue, Total units sold, Average order value, Low stock alerts
- **Sales by SKU Chart**: Vertical bar chart showing quantity sold per SKU/variant
- **Revenue Over Time**: Line chart with date/revenue axes
- **Top Products Table**: SKU, units sold, revenue, current stock level

#### **5. NEW: Appointment Analytics Component** (`src/app/features/dashboard/form-analytics/appointment-analytics/`)

**Purpose**: Display booking heatmap and time slot popularity

**Layout**:

- **Metric Cards Row**: Total bookings, Cancellation rate, Average booking lead time
- **Booking Heatmap**: 2D grid chart (time slots × days)
- **Popular Time Slots**: Horizontal bar chart of most-booked slots
- **Booking Calendar**: Month view showing booked vs. available slots

#### **6. NEW: Restaurant Menu Analytics Component** (`src/app/features/dashboard/form-analytics/restaurant-analytics/`)

**Purpose**: Display item popularity and order value metrics

**Layout**:

- **Metric Cards Row**: Total orders, Average order value, Most popular item
- **Item Popularity Chart**: Horizontal bar chart showing order count per menu item
- **Revenue by Category**: Pie chart (Appetizers, Mains, Desserts, Beverages)
- **Order Timeline**: Line chart showing orders over time

---

**Admin Dashboard (`apps/web`):**

#### **7. MODIFIED: Template Editor Component** (`src/app/features/admin/components/template-editor/template-editor.component.ts`)

**Current State**: Opens with Monaco JSON editor immediately

**Modifications**:

- **Add "Creation Mode" selector** at top (Guided Wizard / Advanced Mode)
- **Add wizard container** with PrimeNG `p-steps`
- **Preserve JSON editor** in "Advanced Mode" toggle
- **Add live preview panel** (50% width split on desktop)

#### **8. NEW: Template Wizard - Category Selection Step**

**Purpose**: First step of wizard - choose template category

**Layout**:

- **Category Grid**: 2 columns desktop, 1 column mobile
- **Category Cards** with icon, name, description, use cases, and "Select" button

#### **9-13. NEW: Category-Specific Wizard Panels**

- Poll Wizard Panel (4 steps: Question Setup, Options, Voting Rules, Results Display)
- Quiz Wizard Panel (5 steps: Quiz Setup, Questions, Scoring Rules, Behavior, Review)
- Product Wizard Panel (4 steps: Details, Variants, Inventory, Order Settings)
- Appointment Wizard Panel (4 steps: Service Setup, Schedule, Booking Rules, Confirmation)
- Restaurant Wizard Panel (4 steps: Restaurant Details, Categories, Menu Items, Order Settings)

#### **14. NEW: Live Preview Panel**

**Purpose**: Show real-time preview of template as admin configures it

**Layout**:

- **Panel Container**: 50% width on desktop (right side), collapsible on mobile
- **Preview Header**: "Live Preview" title + device toggle (Desktop/Mobile)
- **Form Renderer**: Embeds `FormRendererComponent` with auto-update on config change

### UI Consistency Requirements

**Visual Consistency:**

- Color Palette: Use existing PrimeNG theme color variables
- Typography: Project's existing font stack and Tailwind typography scale
- Spacing: Tailwind spacing utilities consistent with existing components
- Shadows and Borders: Tailwind utilities matching elevation system

**Interaction Consistency:**

- Modal Behavior: Same open/close patterns as existing dialogs
- Loading States: PrimeNG `p-skeleton` or `p-progressSpinner`
- Error Handling: Existing toast notification service (`MessageService`)
- Button Styles: PrimeNG button variants

**Responsive Design:**

- Analytics Charts: Switch to vertical layouts on mobile
- Template Wizard: Steps indicator collapses, preview moves below form
- Touch Targets: 44x44px minimum (WCAG AA)

**Accessibility Consistency:**

- Keyboard Navigation: Full support with visible focus indicators
- Screen Reader Support: `aria-label` descriptions and live regions
- Focus Management: Proper focus movement in modals and wizards
- Color Contrast: WCAG AA contrast ratios

**Animation Consistency:**

- Modal Transitions: PrimeNG default timing (150ms ease-in-out)
- Chart Rendering: Chart.js animations (300ms default)
- Wizard Step Transitions: Fade transition (200ms)
- Hover Effects: Subtle scale/shadow transforms

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

| **Category**                | **Technology**                          | **Version** | **Constraint for Epic 30**                                                                              |
| --------------------------- | --------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| **Frontend Framework**      | Angular                                 | 20+         | Category components MUST use standalone components with signals (no NgModules)                          |
| **UI Components**           | PrimeNG                                 | 17+         | Category components MUST use PrimeNG dialog, card, steps, accordion, table (no new component libraries) |
| **State Management**        | Angular Signals (standalone)            | 18+         | Category state MUST integrate into existing signal-based services                                       |
| **Charting Library**        | Chart.js                                | 4.4+        | Category charts MUST use existing Chart.js integration (no new charting libraries)                      |
| **Backend Framework**       | Express.js                              | 4.19+       | Analytics API MUST follow clean architecture (controller → service → repository)                        |
| **Database**                | PostgreSQL                              | 15+         | Category metadata MUST use existing JSONB columns, no new tables required                               |
| **ORM/Query Builder**       | Knex.js                                 | 3.1+        | Analytics queries MUST use Knex.js query builder                                                        |
| **API Style**               | REST + OpenAPI/Swagger                  | 3.0         | Analytics endpoints MUST be documented with JSDoc → Swagger                                             |
| **Authentication**          | JWT + Passport.js                       | Latest      | Template wizard endpoints MUST require JWT auth + admin role                                            |
| **CSS Framework**           | Tailwind CSS                            | 3.4+        | Category components MUST use utility-first Tailwind classes                                             |
| **TypeScript**              | TypeScript                              | 5.5+        | Category types MUST be defined in `@nodeangularfullstack/shared` package                                |
| **Testing - Backend**       | Jest                                    | 29+         | Analytics aggregation MUST achieve 90%+ unit test coverage                                              |
| **Testing - Frontend**      | Jasmine + Karma                         | Latest      | Category components MUST have component tests (75%+ coverage)                                           |
| **Testing - E2E**           | Playwright                              | 1.40+       | Category workflows MUST have E2E tests                                                                  |
| **Shared Types Package**    | @nodeangularfullstack/shared (monorepo) | Custom      | Category interfaces MUST be exported from shared package                                                |
| **Code Editor Integration** | Monaco Editor                           | 0.45+       | Wizard "Advanced Mode" MUST reuse existing Monaco integration                                           |

### Integration Approach

**Database Integration Strategy:**

**No New Tables Required:**

- Category metadata already exists in Epic 29's `form_templates.category` column
- Form category detection uses `form_schemas.schema` JSONB → `metadata.templateCategory` field
- Analytics aggregation uses `form_submissions.data` JSONB column (existing)

**JSONB Schema Extensions:**

```sql
-- form_schemas.schema JSONB structure (EXTENDED)
{
  "name": "Customer Satisfaction Poll",
  "fields": [...],
  "metadata": {
    "templateId": "uuid-here",           -- Epic 29 (existing)
    "templateCategory": "polls",         -- Epic 30 (NEW)
    "businessLogicType": "poll"          -- Epic 29 (existing)
  }
}
```

**API Integration Strategy:**

**New Backend Endpoints:**

- `GET /api/analytics/:formId/category-metrics` - Get category-specific metrics
- Strategy pattern with `IAnalyticsStrategy` interface
- Category-specific strategies: `PollAnalyticsStrategy`, `QuizAnalyticsStrategy`, etc.

**Frontend Integration Strategy:**

- `CategoryAnalyticsService` HTTP service
- Signal-based state management in `FormAnalyticsComponent`
- Dynamic component loading based on category

**Testing Integration Strategy:**

- Backend unit tests (90%+ coverage)
- Frontend component tests (75%+ coverage)
- E2E tests covering full workflows

### Code Organization and Standards

**Backend File Structure:**

```
apps/forms-api/src/
├─ controllers/category-analytics.controller.ts
├─ services/analytics-strategies/
│  ├─ analytics-strategy.interface.ts
│  ├─ poll-analytics.strategy.ts
│  ├─ quiz-analytics.strategy.ts
│  ├─ product-analytics.strategy.ts
│  ├─ appointment-analytics.strategy.ts
│  ├─ restaurant-analytics.strategy.ts
│  └─ generic-analytics.strategy.ts
├─ repositories/form-submissions.repository.ts (modified)
└─ routes/analytics.routes.ts
```

**Frontend File Structure:**

```
apps/form-builder-ui/src/app/features/dashboard/form-analytics/
├─ form-analytics.component.ts (modified)
├─ category-badge/
├─ poll-analytics/
├─ quiz-analytics/
├─ product-analytics/
├─ appointment-analytics/
└─ restaurant-analytics/

apps/web/src/app/features/admin/components/
├─ template-editor/ (modified)
└─ template-wizard/
   ├─ template-wizard.component.ts
   ├─ category-selection/
   ├─ poll-wizard/
   ├─ quiz-wizard/
   ├─ product-wizard/
   ├─ appointment-wizard/
   ├─ restaurant-wizard/
   └─ live-preview/
```

**Naming Conventions:**

- Backend: `kebab-case.layer.ts`
- Frontend: `kebab-case.component.ts`
- Shared Types: `PascalCase`
- API Endpoints: `/api/resource` (lowercase, plural)

### Deployment and Operations

**Build Process:**

```bash
npm run build:shared
npm --workspace=apps/forms-api run build
npm --workspace=apps/form-builder-ui run build
npm --workspace=apps/web run build
```

**Deployment Strategy:**

- Phase 1: Backend deployment (analytics API)
- Phase 2: Frontend deployment (analytics components)
- Phase 3: Frontend deployment (template wizard)
- Zero downtime deployment with graceful degradation

**Monitoring:**

- Structured logging with Winston
- Sentry error tracking
- Performance metrics (category analytics duration, wizard completions)

**Configuration:**

- No new environment variables required
- Optional feature flags: `ENABLE_CATEGORY_ANALYTICS`, `ENABLE_TEMPLATE_WIZARD`

### Risk Assessment and Mitigation

**Technical Risks:**

1. Category detection fails for existing forms → Graceful fallback to generic analytics
2. Analytics queries timeout for large datasets → Pagination + database indexes
3. Chart.js rendering degrades on mobile → Lazy rendering + canvas optimization

**Integration Risks:**

1. Wizard validation conflicts with existing JSON validator → Single validation source
2. Signal updates cause render loops → Avoid side effects in computed signals
3. Category components break generic analytics → Feature flag + regression tests

**Deployment Risks:**

1. Database migration locks table → Use `CREATE INDEX CONCURRENTLY`
2. Frontend bundle size increases → Lazy loading + code splitting

**Mitigation Strategies:**

- Comprehensive testing (90%+ backend, 75%+ frontend, E2E coverage)
- Gradual rollout (backend first, then frontend)
- Feature flags for instant rollback
- Monitoring alerts (Sentry + Datadog)

---

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: **Single Comprehensive Epic (Epic 30)**

**Rationale**: This enhancement should be structured as one epic with 12 stories because:

1. **Cohesive Feature Set**: Category-aware analytics and template wizard are interconnected
2. **Shared Technical Foundation**: Both depend on category detection and strategy pattern
3. **Sequential Dependencies**: Wizard depends on analytics infrastructure
4. **Backward Compatibility Boundary**: Single epic provides clear rollback boundary
5. **User Value Delivery**: Both features deliver together for complete UX

---

## **Epic 30: Category-Personalized Template Analytics and Creation UX**

**Epic Goal**: Enhance the template system (Epic 29) by providing category-specific analytics
visualizations that match the mental model of each template type and implementing a category-guided
template creation wizard that reduces configuration errors by 60%.

**Integration Requirements**:

- Category detection MUST use optional `formSchema.metadata.templateCategory` field
- Analytics MUST fall back to generic analytics when category is null
- Wizard MUST generate schemas conforming to Epic 29's `FormSchema` interface
- All Epic 29 executors MUST remain unchanged (additive methods only)

---

### **Story 30.1: Shared Types and Category Detection Infrastructure**

**As a** full-stack developer, **I want** shared TypeScript interfaces for category analytics and
wizard configuration, **so that** type safety is maintained across frontend and backend.

**Acceptance Criteria:**

1. `CategoryMetrics` discriminated union created with types for all 6 categories
2. `TemplateWizardConfig` interface created with category-specific configs
3. `CategoryDetectionUtil` utility class created
4. All types exported from shared package
5. `npm run build:shared` completes without errors
6. Backend and frontend can import types successfully

**Integration Verification:**

- Epic 29 shared types remain unchanged
- No breaking changes to shared package build
- Existing template types remain functional

---

### **Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure**

**As a** backend developer, **I want** a strategy pattern for category-specific analytics, **so
that** new categories can be added without modifying existing code.

**Acceptance Criteria:**

1. `IAnalyticsStrategy` interface created
2. `AnalyticsStrategyRegistry` service created
3. `GenericAnalyticsStrategy` implemented as fallback
4. Base aggregation methods added to repository
5. Unit tests for registry and generic strategy
6. Code coverage ≥90%

**Integration Verification:**

- Existing repository methods unchanged
- Existing analytics endpoints remain functional
- Generic strategy produces identical output to current analytics

---

### **Story 30.3: Poll and Quiz Analytics Strategies (Backend)**

**As a** backend developer, **I want** analytics strategies for Poll and Quiz templates, **so that**
vote distributions and score distributions can be computed.

**Acceptance Criteria:**

1. `PollAnalyticsStrategy` implements vote aggregation with percentages
2. `QuizAnalyticsStrategy` implements score distribution histogram
3. Queries use PostgreSQL JSONB operators efficiently (<300ms)
4. Edge cases handled (zero votes, missing scores)
5. Unit tests for both strategies
6. Integration tests with test data

**Integration Verification:**

- Epic 29 executors unchanged
- Existing poll/quiz data compatible
- Generic analytics still work

---

### **Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)**

**As a** backend developer, **I want** analytics strategies for Product, Appointment, and Restaurant
templates, **so that** sales metrics, booking heatmaps, and item popularity can be computed.

**Acceptance Criteria:**

1. `ProductAnalyticsStrategy` computes sales/revenue metrics
2. `AppointmentAnalyticsStrategy` generates booking heatmap
3. `RestaurantAnalyticsStrategy` computes item popularity
4. Performance optimization (transactions, indexes, JSONB aggregation)
5. Unit tests for all three strategies
6. Integration tests with test data

**Integration Verification:**

- Epic 29 executors unchanged
- Inventory/booking tables unaffected
- Performance acceptable

---

### **Story 30.5: Category Analytics API Endpoint and Controller**

**As a** backend developer, **I want** a REST API endpoint for category-specific analytics, **so
that** frontend can fetch aggregated metrics.

**Acceptance Criteria:**

1. `CategoryAnalyticsController` created
2. `GET /api/analytics/:formId/category-metrics` endpoint implemented
3. Authentication and validation middleware
4. JSDoc for Swagger documentation
5. Routes registered
6. Error handling with `ApiError`
7. Integration tests (all categories + auth)

**Integration Verification:**

- Existing analytics endpoints unchanged
- Authentication middleware works correctly
- Swagger docs generate successfully

---

### **Story 30.6: Frontend Category Detection and Analytics Service**

**As a** frontend developer, **I want** a service to fetch category metrics and detect template
categories, **so that** analytics components can load correct data.

**Acceptance Criteria:**

1. `CategoryAnalyticsService` created with HTTP methods
2. `FormAnalyticsComponent` modified with category signals
3. Loading and error states implemented
4. Unit tests for service
5. Component tests for signals

**Integration Verification:**

- Generic analytics remain functional
- Existing signals unchanged
- Error states render correctly

---

### **Story 30.7: Poll and Quiz Analytics Components (Frontend)**

**As a** form creator, **I want** to see poll vote distributions and quiz score histograms, **so
that** I can understand patterns and performance.

**Acceptance Criteria:**

1. `PollAnalyticsComponent` created with horizontal bar chart
2. `QuizAnalyticsComponent` created with histogram + pie chart
3. Empty states handled
4. Responsive design
5. Accessibility compliance
6. Component tests
7. Integration in `FormAnalyticsComponent` template

**Integration Verification:**

- Chart.js integration works
- PrimeNG theming applies
- Generic analytics still render

---

### **Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)**

**As a** form creator, **I want** to see product sales, appointment heatmaps, and restaurant
popularity, **so that** I can track business metrics.

**Acceptance Criteria:**

1. `ProductAnalyticsComponent` created with sales charts
2. `AppointmentAnalyticsComponent` created with heatmap
3. `RestaurantAnalyticsComponent` created with item popularity
4. `CategoryBadgeComponent` created (shared)
5. CSV export enhanced with category columns
6. Component tests
7. Responsive design

**Integration Verification:**

- Existing CSV export works
- Chart.js heatmap plugin compatible
- PrimeNG styling consistent

---

### **Story 30.9: Template Wizard Service and Infrastructure**

**As a** frontend developer, **I want** a service to manage wizard state with signals, **so that**
wizard components can share configuration.

**Acceptance Criteria:**

1. `TemplateWizardService` created with state signals
2. Computed signals for validation and preview
3. Service methods (setCategory, nextStep, updateConfig, saveTemplate)
4. LocalStorage persistence
5. Validation methods per category
6. Schema builder methods
7. Unit tests

**Integration Verification:**

- Generated schemas conform to Epic 29 `FormSchema`
- Schemas pass Epic 29 validation
- Preview renders correctly

---

### **Story 30.10: Template Wizard Category Selection and Base Components**

**As an** admin, **I want** a wizard to select template category with guided steps, **so that** I
can create templates faster.

**Acceptance Criteria:**

1. `TemplateWizardComponent` created with dialog
2. Wizard uses PrimeNG `p-steps`
3. `CategorySelectionComponent` created
4. `LivePreviewPanelComponent` created
5. Navigation logic implemented
6. Draft restoration
7. Advanced Mode toggle
8. Component tests

**Integration Verification:**

- Existing JSON editor accessible
- Generated schemas pass validation
- Dialog doesn't conflict with others

---

### **Story 30.11: Category-Specific Wizard Panels (Poll, Quiz, Product)**

**As an** admin, **I want** step-by-step panels for Poll, Quiz, and Product templates, **so that** I
can configure settings without editing JSON.

**Acceptance Criteria:**

1. `PollWizardPanelComponent` created (4 steps)
2. `QuizWizardPanelComponent` created (5 steps)
3. `ProductWizardPanelComponent` created (4 steps)
4. Inline validation with error messages
5. Contextual help tooltips
6. Component tests
7. Config signal updates

**Integration Verification:**

- Generated schemas match Epic 29 format
- Preview renders correctly
- Saved templates load in form builder

---

### **Story 30.12: E2E Testing, Documentation, and Rollout**

**As a** QA engineer and developer, **I want** comprehensive E2E tests and documentation, **so
that** the feature is reliable and maintainable.

**Acceptance Criteria:**

1. E2E test suite for category analytics (4 tests)
2. E2E tests for template wizard (4 tests)
3. Backend unit test coverage ≥90%
4. Frontend component test coverage ≥75%
5. API documentation updated
6. User guides created
7. Performance benchmarks verified
8. Rollout plan documented

**Integration Verification:**

- All Epic 29 tests pass
- All Epic 10/17 analytics tests pass
- No regression in other epics

---

## **Epic Summary**

**Total Stories**: 12 stories

**Story Dependencies**:

- Stories 30.1-30.2 (Foundation) → Sequential
- Story 30.1 (Types) → Blocks all stories
- Stories 30.3-30.5 (Backend) → Sequential
- Stories 30.6-30.8 (Frontend Analytics) → Depend on 30.5
- Story 30.9 (Wizard Service) → Blocks 30.10-30.11
- Stories 30.10-30.11 (Wizard UI) → Depend on 30.9
- Story 30.12 (Testing) → Final integration

**Estimated Complexity**: Similar to Epic 19 (Step Forms) or Epic 23-25 (Theme System)

**Risk Mitigation Sequence**:

1. Shared types first (contracts)
2. Backend infrastructure (independently testable)
3. Frontend analytics incrementally
4. Wizard infrastructure then panels
5. Comprehensive testing last

---

## Change Log

| Change           | Date       | Version | Description                                                                                                                    | Author          |
| ---------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| Initial Creation | 2025-01-13 | 1.0     | Epic 30 PRD created with 12 stories covering category-personalized analytics and template creation wizard for 6 template types | John (PM Agent) |
