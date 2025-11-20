# Epic 29: Template Field Validation Framework

**Status**: 🟡 **READY FOR DEVELOPMENT** **Created**: 2025-11-19 **Target Completion**: 2-3
development days **Priority**: P0 (Critical - Blocks template quality and analytics reliability)

---

## Epic Overview

### Problem Statement

Currently, the form builder allows users to create templates without validating that required
category-specific fields are present. This leads to:

1. **Analytics failures**: Templates missing required fields (e.g., `poll_option` for polls) cause
   analytics to display `missingFields` errors at runtime
2. **Poor user experience**: Users discover validation issues only after creating forms, requiring
   rework
3. **Inconsistent templates**: No enforcement of field name or type standards across categories
4. **Trial-and-error workflow**: Users must guess which fields are required for each category

### Solution

Implement a comprehensive **Template Field Validation Framework** that:

1. **Validates field names AND types** at template creation time (before database insert)
2. **Provides actionable error messages** with auto-fix suggestions (e.g., "Change poll_option from
   TEXT to SELECT")
3. **Replaces old templates** with 18 validated examples (3 per category)
4. **Enforces strict validation** (rejects invalid templates with HTTP 400 errors)
5. **Improves UX** with real-time validation feedback and category-specific field hints

### Success Criteria

- ✅ All new templates pass validation before creation
- ✅ Analytics never show `missingFields` errors for new templates
- ✅ Users receive clear guidance on required fields per category
- ✅ 18 validated template examples available for all 6 categories
- ✅ Zero breaking changes to existing template creation workflow
- ✅ Validation performance < 50ms (negligible impact on UX)

---

## Epic Scope

### In Scope

- ✅ Backend validation engine (`CategoryFieldValidator` class)
- ✅ Template service integration (strict validation enforcement)
- ✅ 18 validated template examples (3 per category)
- ✅ Database migration to remove old non-validated templates
- ✅ Frontend validation UI with auto-fix suggestions (optional)
- ✅ Comprehensive unit and integration tests
- ✅ Documentation (template catalog, API error responses)

### Out of Scope

- ❌ Validation for user-created custom fields (only category-required fields validated)
- ❌ Backward compatibility with existing invalid templates (old templates removed)
- ❌ Migration script to auto-fix existing invalid templates
- ❌ Admin UI for configuring validation rules (rules are hardcoded per category)

---

## Stories Breakdown

### **Story 29.1: Backend Validation Engine** (P0, 3-4 hours)

**Owner**: Backend Developer **File**: `29.1-backend-validation-engine.md`

**Deliverables**:

- `CategoryFieldValidator` class with validation rules for 6 categories
- Field name + type validation for each category
- Actionable error messages with auto-fix suggestions
- 24+ unit tests (100% branch coverage)

**Acceptance Criteria**:

- ✅ POLLS: Validates `poll_option` (SELECT or RADIO)
- ✅ QUIZ: Validates `question_*` fields with `metadata.correctAnswer`
- ✅ ECOMMERCE: Validates `product_id`, `quantity`, `price`
- ✅ SERVICES: Validates `date`, `time_slot`
- ✅ DATA_COLLECTION: Validates `menu_item`, `quantity`
- ✅ EVENTS: Validates `attendee_name`, `rsvp_status`

---

### **Story 29.2: Template Service Integration** (P0, 2-3 hours)

**Owner**: Backend Developer **File**: `29.2-template-service-integration.md` **Depends On**: Story
29.1

**Deliverables**:

- Integrate `CategoryFieldValidator` into `templates.service.ts`
- Strict validation enforcement in `createTemplate()` and `updateTemplate()`
- Structured error responses with `validationErrors` array
- 24+ integration tests

**Acceptance Criteria**:

- ✅ Templates rejected with HTTP 400 if validation fails
- ✅ Error response includes all validation errors and auto-fix suggestions
- ✅ Validation occurs before database insert/update
- ✅ Zero breaking changes to existing API endpoints

---

### **Story 29.3: Validated Template Examples & Migration** (P1, 2-3 hours)

**Owner**: Backend Developer **File**: `29.3-validated-template-examples-migration.md` **Depends
On**: Stories 29.1, 29.2

**Deliverables**:

- 18 validated template examples (3 per category)
- Seed script (`seed-templates.js`) with all templates
- Database migration to remove old templates
- Template catalog documentation

**Template Categories**:

- **POLLS**: Opinion Poll, Customer Feedback Poll, Yes/No Vote
- **QUIZ**: Trivia Quiz, Knowledge Assessment, Certification Test
- **ECOMMERCE**: Product Order, Multi-Product Catalog, Variant Selection
- **SERVICES**: Appointment Booking, Service Request, Time Slot Reservation
- **DATA_COLLECTION**: Restaurant Order, Meal Preferences, Catering Request
- **EVENTS**: Event RSVP, Ticket Purchase, Guest Registration

**Acceptance Criteria**:

- ✅ All 18 templates pass CategoryFieldValidator validation
- ✅ Seed script runs without errors
- ✅ Old non-validated templates removed
- ✅ Manual test: Each template creates a working form
- ✅ Manual test: Analytics display correctly for each category

---

### **Story 29.4: Frontend Validation & UX** (P2 - Optional, 3-4 hours)

**Owner**: Frontend Developer **File**: `29.4-frontend-validation-ux.md` **Depends On**: Stories
29.1, 29.2, 29.3

**Deliverables**:

- `ValidationRequirementsComponent` with category-specific hints
- `TemplateValidationService` for client-side validation
- Auto-fix suggestion UI with click handlers
- 25+ unit + integration tests

**Acceptance Criteria**:

- ✅ Real-time validation as user adds/modifies fields
- ✅ Category-specific required fields displayed in UI
- ✅ Auto-fix suggestions clickable and functional
- ✅ Backend validation errors display in user-friendly format
- ✅ Accessibility compliant (WCAG AA)
- ✅ Responsive (mobile + desktop)

---

## Technical Architecture

### Backend Components

```
apps/forms-api/
├── src/
│   ├── utils/
│   │   ├── category-field-validator.ts        # Story 29.1 (NEW)
│   │   └── category-field-validator.test.ts   # Story 29.1 (NEW)
│   ├── services/
│   │   └── templates.service.ts               # Story 29.2 (MODIFIED)
│   └── tests/
│       └── integration/
│           └── template-validation.test.ts    # Story 29.2 (NEW)
├── seed-templates.js                          # Story 29.3 (NEW)
└── migrations/
    └── YYYYMMDDHHMMSS-remove-old-templates.js # Story 29.3 (NEW)
```

### Frontend Components (Optional - Story 29.4)

```
apps/form-builder-ui/
└── src/app/features/dashboard/template-editor/
    ├── validation-requirements/
    │   ├── validation-requirements.component.ts      # NEW
    │   ├── validation-requirements.component.html    # NEW
    │   └── validation-requirements.component.spec.ts # NEW
    └── services/
        ├── template-validation.service.ts            # NEW
        └── template-validation.service.spec.ts       # NEW
```

---

## Validation Rules Summary

| Category            | Required Fields                            | Field Types             | Analytics Strategy                |
| ------------------- | ------------------------------------------ | ----------------------- | --------------------------------- |
| **POLLS**           | `poll_option`                              | SELECT, RADIO           | poll-analytics.strategy.ts        |
| **QUIZ**            | `question_*` with `metadata.correctAnswer` | SELECT, RADIO, CHECKBOX | quiz-analytics.strategy.ts        |
| **ECOMMERCE**       | `product_id`, `quantity`, `price`          | SELECT, NUMBER, NUMBER  | product-analytics.strategy.ts     |
| **SERVICES**        | `date`, `time_slot`                        | DATE, TIME_SLOT/SELECT  | appointment-analytics.strategy.ts |
| **DATA_COLLECTION** | `menu_item`, `quantity`                    | SELECT, NUMBER          | restaurant-analytics.strategy.ts  |
| **EVENTS**          | `attendee_name`, `rsvp_status`             | TEXT, RADIO/SELECT      | Generic event analytics           |

---

## Timeline & Dependencies

```mermaid
graph LR
    A[29.1: Validation Engine<br/>3-4h] --> B[29.2: Service Integration<br/>2-3h]
    B --> C[29.3: Template Examples<br/>2-3h]
    B --> D[29.4: Frontend UX<br/>3-4h Optional]
    C --> D
```

**Critical Path**: 29.1 → 29.2 → 29.3 (7-10 hours total) **Optional Enhancement**: 29.4 (+3-4 hours)

**Parallel Work Opportunities**:

- Story 29.3 (template definitions) can be drafted during Stories 29.1-29.2 development
- Story 29.4 (frontend) can start as soon as Story 29.2 is complete

---

## Testing Strategy

### Unit Tests (Stories 29.1, 29.4)

- **CategoryFieldValidator**: 24+ tests (all categories, valid/invalid scenarios, edge cases)
- **TemplateValidationService** (frontend): 15+ tests (validation logic, error messages)
- **ValidationRequirementsComponent**: 10+ tests (UI rendering, user interactions)
- **Target Coverage**: ≥ 90% code coverage for all new files

### Integration Tests (Stories 29.2, 29.3)

- **Template Creation Rejection**: 18+ tests (6 categories × 3 scenarios each)
- **Template Update Rejection**: 6+ tests (field removal, type change, valid update)
- **Seed Script Execution**: Verify all 18 templates created successfully
- **Analytics Verification**: Ensure no `missingFields` errors for new templates

### Manual Testing (Story 29.3)

- Apply each of 18 templates to create a new form
- Verify analytics display correctly for each category
- Test auto-fix suggestions in frontend UI (Story 29.4)
- Accessibility testing with screen readers (Story 29.4)

---

## Risk Assessment & Mitigation

| Risk                                                    | Severity | Probability | Mitigation                                                                             |
| ------------------------------------------------------- | -------- | ----------- | -------------------------------------------------------------------------------------- |
| Validation rules too strict, block legitimate templates | High     | Medium      | Validation rules match analytics requirements exactly; comprehensive testing           |
| Frontend/backend validation diverges over time          | Medium   | Medium      | Share validation rule definitions; integration tests verify consistency                |
| Seed script fails due to validation errors              | Medium   | Low         | Validate template definitions locally before committing; error handling in seed script |
| Performance impact on template creation                 | Low      | Low         | Performance budget enforced (< 50ms); benchmarking tests                               |
| Old templates break after migration                     | Medium   | Low         | Only remove seed templates (not user-created); migration is reversible                 |

---

## Rollback Plan

If critical issues are discovered after deployment:

1. **Disable Validation** (Emergency):
   - Comment out `CategoryFieldValidator` calls in `templates.service.ts`
   - Deploy hotfix to restore original validation logic
   - Estimated rollback time: < 30 minutes

2. **Restore Old Templates** (If needed):
   - Run migration rollback script
   - Re-seed old templates from backup SQL
   - Estimated restore time: < 15 minutes

3. **Hide Frontend Validation** (Story 29.4 only):
   - Hide `ValidationRequirementsComponent` via feature flag
   - Backend validation continues working
   - Estimated time: < 10 minutes

---

## Success Metrics

### Quantitative Metrics

- ✅ **Zero `missingFields` errors** in analytics for templates created after Epic 29 deployment
- ✅ **18 validated templates** seeded successfully (100% success rate)
- ✅ **< 50ms validation overhead** per template creation (performance budget)
- ✅ **≥ 90% code coverage** for all new validation code
- ✅ **Zero breaking changes** to existing template creation API

### Qualitative Metrics

- ✅ Users report clearer understanding of required fields per category (user feedback)
- ✅ Reduced trial-and-error in template creation (fewer template re-edits)
- ✅ Improved template quality across all categories (manual review)
- ✅ Auto-fix suggestions helpful and accurate (user satisfaction)

---

## Documentation Deliverables

- ✅ **Story Documents**: 4 detailed user stories with acceptance criteria (COMPLETE)
- ✅ **Template Catalog**: Documentation of all 18 validated templates (Story 29.3)
- ✅ **API Error Responses**: Examples of validation error formats (Story 29.2)
- ✅ **Validation Rules Reference**: Table of required fields per category (This document)
- ✅ **Developer Guide**: How to add new category validation rules (Optional)

---

## Post-Epic Enhancements (Future)

These are potential follow-up epics/stories after Epic 29 is complete:

1. **Admin UI for Validation Rules**: Allow admins to configure validation rules via UI (instead of
   hardcoded)
2. **Custom Field Validation**: Extend validation to user-defined custom fields
3. **Template Import/Export**: Import validated templates from external sources
4. **Validation Rule Versioning**: Support multiple validation rule versions for backward
   compatibility
5. **Auto-Fix Engine**: Automatically fix common validation issues instead of just suggesting
6. **Template Quality Score**: Assign quality scores to templates based on field completeness

---

## Related Epics

- **Epic 20-23**: Theme Designer and Application (template theming)
- **Epic 30**: Category-Personalized Templates and Analytics (template categories)
- **Epic 29**: Template Field Validation Framework (THIS EPIC)

---

## Change Log

| Date       | Change                                | Author          |
| ---------- | ------------------------------------- | --------------- |
| 2025-11-19 | Epic created with 4 stories           | John (PM Agent) |
| 2025-11-19 | Added validation rules summary table  | John (PM Agent) |
| 2025-11-19 | Added 18 template definitions catalog | John (PM Agent) |

---

**Epic Owner**: Product Manager (John) **Technical Lead**: Backend Developer **Stakeholders**: Form
Builder Users, Analytics Team, QA Team **Status**: Ready for Development 🚀
