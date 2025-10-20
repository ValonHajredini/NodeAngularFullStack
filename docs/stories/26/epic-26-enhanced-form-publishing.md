# Epic 26: Enhanced Form Publishing System - Brownfield Enhancement

**Epic Goal:** Transform the basic form publishing workflow into a comprehensive publishing system
with token management, QR code generation, iframe embedding, and improved expiration handling to
provide users with multiple sharing options and better token control.

**Epic Status:** Draft  
**Epic Owner:** Product Manager  
**Developer:** TBD  
**QA Engineer:** TBD

## Epic Description

### Existing System Context:

- **Current relevant functionality:** Basic publish dialog with 30-day expiration date picker,
  token-based form publishing, existing QR code infrastructure via short-links service
- **Technology stack:** Angular 20+ frontend, Express.js backend, PostgreSQL database, DigitalOcean
  storage integration, JWT token management
- **Integration points:**
  - `PublishDialogComponent` handles form publishing workflow
  - `forms.service.ts` manages form publication with token generation
  - `short-links.service.ts` provides QR code generation and storage capabilities
  - `FormsController.publishForm()` API endpoint handles publishing

### Enhancement Details:

**What's being added/changed:**

1. **No-expiration default option** with toggle for custom expiration dates
2. **Smart token reuse system** that prompts users to reuse existing valid tokens or generate new
   ones
3. **Integrated QR code generation** for form URLs with DigitalOcean storage and display in
   publishing modal
4. **Iframe code generator** for easy embedding in external websites
5. **Enhanced forms list view** showing QR codes for all published forms

**How it integrates:**

- Extends existing `PublishDialogComponent` with new UI sections and improved workflow
- Leverages existing `short-links.service.ts` QR code capabilities for seamless integration
- Integrates with current `forms.service.ts` token management system
- Enhances `forms-list.component.ts` to display QR codes for quick access
- Maintains backward compatibility with all existing publishing workflows

**Success criteria:**

- Users can publish forms with no expiration by default (one-click publishing)
- Token reuse confirmation dialog prevents unnecessary token regeneration
- QR codes are automatically generated and stored for every published form
- Users can copy iframe embed code for external website integration
- Forms list displays QR codes for quick access and sharing
- Performance remains optimal with no degradation in publishing workflow

## Stories

### Story 26.1: No-Expiration Default and Enhanced Publishing Modal

**Goal:** Modify the publishing modal to default to "no expiration" with option to set custom
expiration dates, improving the user experience for permanent form sharing.

**Tasks:**

- Update `PublishDialogComponent` to default to no-expiration mode
- Add toggle/checkbox for "Set custom expiration"
- Modify form validation to support optional expiration dates
- Update backend API to handle null/undefined expiration dates
- Ensure backward compatibility with existing expiration logic

### Story 26.2: Smart Token Management System

**Goal:** Implement intelligent token reuse that detects existing valid tokens and prompts users to
choose between reusing or generating new tokens, preventing unnecessary token proliferation.

**Tasks:**

- Detect existing valid tokens for forms before publishing
- Create confirmation dialog component for token reuse decision
- Implement token status checking in publishing workflow
- Add "Use existing token" vs "Generate new token" options
- Update forms service to handle token reuse logic

### Story 26.3: Integrated QR Code Generation and Display

**Goal:** Integrate QR code generation into the publishing workflow, automatically creating QR codes
for form URLs and displaying them in the publishing modal with DigitalOcean storage.

**Tasks:**

- Integrate short-links service QR generation into publishing workflow
- Add QR code display section to publish dialog
- Implement automatic QR code generation after successful publish
- Add QR code download functionality to publish modal
- Store QR code URLs in form metadata for future access

### Story 26.4: Iframe Embed Code Generator

**Goal:** Add iframe code generation functionality to allow users to easily embed forms in external
websites with customizable dimensions and styling options.

**Tasks:**

- Create iframe code generator utility
- Add iframe preview section to publish dialog
- Implement customizable iframe dimensions (width/height)
- Add iframe styling options (border, responsive)
- Provide copy-to-clipboard functionality for iframe code

### Story 26.5: Enhanced Forms List with QR Code Display

**Goal:** Enhance the forms list view to display QR codes for published forms, enabling quick access
to sharing options and improving form management workflow.

**Tasks:**

- Update forms list component to display QR codes
- Add QR code thumbnails to form cards
- Implement QR code modal for larger view and download
- Add QR code regeneration option for published forms
- Optimize performance with lazy loading for QR code images

## Compatibility Requirements

- [x] Existing form publishing API endpoints remain unchanged (backward compatible)
- [x] Current token validation and authentication flow preserved
- [x] Database schema changes are additive only (no breaking changes)
- [x] Existing published forms continue to work without modifications
- [x] Current short-link and QR code systems remain fully functional
- [x] Publishing workflow maintains current performance characteristics

## Risk Mitigation

**Primary Risk:** Breaking existing form publishing workflow during modal enhancements
**Mitigation:** Implement changes incrementally with feature flags and comprehensive testing of
existing publishing flow **Rollback Plan:** Database migrations are reversible, frontend changes can
be reverted via git, and API changes maintain backward compatibility

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria met
- [ ] No-expiration publishing works correctly with proper token generation
- [ ] Token reuse system prevents duplicate tokens and provides clear user choices
- [ ] QR codes generate and store properly for all published forms
- [ ] Iframe embed code works correctly in external websites
- [ ] Forms list displays QR codes without performance impact
- [ ] Existing functionality verified through regression testing
- [ ] All integration points working correctly
- [ ] No performance degradation in form publishing workflow
- [ ] End-to-end testing covers all publishing scenarios
- [ ] Documentation updated for new publishing features

## Technical Notes

### Dependencies

- Leverages existing QR code infrastructure from short-links service
- Uses current token management system from forms service
- Integrates with DigitalOcean storage for QR code persistence
- Maintains compatibility with existing publish dialog architecture

### Performance Considerations

- QR code generation should be asynchronous to avoid blocking publishing
- Forms list QR code display should use lazy loading
- Token reuse checks should be optimized for minimal latency
- Iframe code generation should be client-side for instant feedback

### Security Considerations

- Token reuse logic must validate token ownership
- QR codes should only be accessible to form owners
- Iframe code should include appropriate security headers
- All existing form access controls must be preserved

---

**Created:** $(date)  
**Last Updated:** $(date)  
**Epic Status:** Draft → Ready for Review → In Progress → Done
