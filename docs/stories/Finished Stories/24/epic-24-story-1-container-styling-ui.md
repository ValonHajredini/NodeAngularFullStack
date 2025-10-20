# Story 24.1: Add Container Styling Step UI Component - Brownfield Addition

**Epic:** Epic 24 - Form Container Styling **Story Points:** 5 **Priority:** High **Estimated
Effort:** 4-5 hours

---

## User Story

As a **form creator**, I want **a dedicated step in the theme designer to customize the form
container's visual appearance**, So that **I can control the background, borders, shadows,
alignment, and transparency of my form's wrapper element to match my brand and design
requirements**.

---

## Story Context

### Existing System Integration

- **Integrates with:** Theme Designer Modal (`ThemeDesignerModalComponent`)
- **Technology:** Angular 20+ standalone component, PrimeNG 17+ UI components, Angular Signals
- **Follows pattern:** Existing step components (`ColorStepComponent`, `BackgroundStepComponent`,
  `StylingStepComponent`, `PreviewElementsStepComponent`)
- **Touch points:**
  - Theme designer modal stepper (add new step at index 5)
  - `ThemeDesignerModalService` for state management (signals)
  - Existing step component CSS patterns and layouts
  - PrimeNG Dialog, ColorPicker, Slider, InputNumber, Select components

---

## Acceptance Criteria

### Functional Requirements

1. **New Step Component Created:**
   - Component named `ContainerStylingStepComponent` created in
     `apps/web/src/app/features/tools/components/form-builder/theme-designer-modal/steps/`
   - Component is standalone with `ChangeDetectionStrategy.OnPush`
   - Component imports: CommonModule, FormsModule, PrimeNG modules (ColorPickerModule, SliderModule,
     InputNumberModule, SelectModule, etc.)

2. **Background Controls:**
   - Color picker for solid background color (hex format, with preview box showing hex code)
   - Image upload button with file input (accepts image/\* formats)
   - Image preview thumbnail (if image uploaded)
   - Background size dropdown (cover, contain, auto, custom)
   - Background position dropdown (center, top, bottom, left, right, custom)
   - "Remove Image" button (visible only when image uploaded)

3. **Border Controls:**
   - Toggle/checkbox to enable/disable border
   - Border width slider (0-10px) with numeric value badge
   - Border color picker (hex format)
   - Border radius slider (0-50px) with numeric value badge
   - Border style dropdown (solid, dashed, dotted, double, groove, ridge, inset, outset)
   - All border controls disabled when border toggle is off

4. **Box Shadow Controls:**
   - Toggle/checkbox to enable/disable box shadow
   - Shadow preset dropdown (None, Subtle, Medium, Strong, Custom)
   - Custom shadow controls (visible when "Custom" selected):
     - Horizontal offset slider (-20px to +20px)
     - Vertical offset slider (-20px to +20px)
     - Blur radius slider (0-50px)
     - Spread radius slider (-20px to +20px)
   - Shadow color picker with alpha/opacity support
   - All shadow controls disabled when shadow toggle is off

5. **Container Layout Controls:**
   - Horizontal alignment radio buttons (Left, Center, Right)
   - Vertical alignment radio buttons (Top, Center, Bottom)
   - Max-width input number (200px - 1400px)
   - Max-width presets dropdown (Mobile: 400px, Tablet: 768px, Desktop: 1200px, Full Width: 100%,
     Custom)

6. **Transparency & Effects Controls:**
   - Container opacity slider (0-100%) with percentage badge
   - Backdrop blur toggle/checkbox
   - Backdrop blur intensity slider (0-20px) - disabled when backdrop blur off
   - Visual warning for browsers that don't support backdrop blur

7. **Real-Time Preview:**
   - Live preview box at bottom of step showing container styling applied to a sample form
   - Preview updates immediately as user adjusts controls
   - Preview shows p-card element with heading, text, and button to simulate real form

8. **UI Layout & Organization:**
   - Controls organized in collapsible/expandable sections:
     - Background (expanded by default)
     - Borders (collapsed by default)
     - Box Shadow (collapsed by default)
     - Layout & Alignment (collapsed by default)
     - Transparency & Effects (collapsed by default)
   - 2-column grid layout for controls (following existing step patterns)
   - Responsive: stacks to 1 column on mobile (max-width: 767px)
   - Section headers with icons (pi-palette, pi-stop, pi-box, pi-arrows-alt, pi-circle)

### Integration Requirements

9. **Theme Service Integration:**
   - Component injects `ThemeDesignerModalService`
   - All controls use getter/setter pattern to read/write theme state via service signals
   - Changes trigger signal updates in theme service (Story 2 will implement these methods)

10. **Modal Stepper Integration:**
    - Step added to `ThemeDesignerModalComponent` template at step index 5
    - Step title: "Container Styling"
    - Step icon: "pi pi-box"
    - Navigation works correctly (Next, Previous, Save buttons)

11. **Existing Steps Unchanged:**
    - Steps 0-4 continue to function identically
    - No changes to step indices 0-4
    - No changes to existing step components

### Quality Requirements

12. **Accessibility:**
    - All form controls have proper labels with `for` attributes
    - Color pickers include aria-labels
    - Sliders show current value in accessible format
    - Toggles/checkboxes have visible labels
    - Keyboard navigation works for all controls

13. **Visual Consistency:**
    - Follows existing step component styling (padding, margins, typography)
    - Uses same color scheme as other steps (#6366f1 for accents, #1f2937 for text)
    - Icons use PrimeNG icon system (pi-\*)
    - Field hints use same font size and color as other steps

14. **Component Testing:**
    - Component spec file created: `container-styling-step.component.spec.ts`
    - Unit tests cover:
      - Component initialization
      - Control state changes
      - Service method calls
      - Toggle enable/disable behavior
      - Preset selection updates

---

## Technical Notes

### Implementation Approach

**Component Structure:**

```typescript
@Component({
  selector: 'app-container-styling-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ColorPickerModule,
    SliderModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    RadioButtonModule,
    FileUploadModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
  styles: [`...`],
})
export class ContainerStylingStepComponent {
  protected readonly modalService = inject(ThemeDesignerModalService);

  // Getter/setter pattern for all container properties
  get containerBackgroundColor(): string {
    return this.modalService.getContainerBackgroundColor();
  }
  set containerBackgroundColor(value: string) {
    this.modalService.setContainerBackgroundColor(value);
  }

  // ... similar for all other properties
}
```

**Template Organization:**

```html
<div class="container-styling-step">
  <div class="step-header">
    <h3 class="step-title">Container Styling</h3>
    <p class="step-description">Customize the form container's appearance</p>
  </div>

  <!-- Background Section -->
  <div class="section-group">
    <div class="section-header" (click)="toggleSection('background')">
      <i class="pi pi-palette"></i>
      <h4>Background</h4>
      <i
        class="pi"
        [class.pi-chevron-down]="!sections.background"
        [class.pi-chevron-up]="sections.background"
      ></i>
    </div>
    @if (sections.background) {
    <div class="section-content">
      <!-- Background controls here -->
    </div>
    }
  </div>

  <!-- Similar sections for Borders, Box Shadow, Layout, Transparency -->

  <!-- Live Preview -->
  <div class="container-preview">
    <h4 class="preview-title">Container Preview</h4>
    <div class="preview-wrapper">
      <div
        class="preview-container"
        [style.background-color]="containerBackgroundColor"
        [style.background-image]="containerBackgroundImage"
        [style.border]="borderEnabled ? getBorderStyle() : 'none'"
        [style.border-radius.px]="borderRadius"
        [style.box-shadow]="shadowEnabled ? getShadowStyle() : 'none'"
        [style.opacity]="containerOpacity / 100"
        [style.backdrop-filter]="backdropBlurEnabled ? getBackdropBlur() : 'none'"
      >
        <h3>Sample Form Title</h3>
        <p>This preview shows how your form container will appear.</p>
        <button>Submit</button>
      </div>
    </div>
  </div>
</div>
```

### Existing Pattern Reference

Follow these patterns from existing steps:

1. **ColorStepComponent** - Color picker + preview box pattern
2. **BackgroundStepComponent** - Image upload, radio button groups, conditional controls
3. **StylingStepComponent** - Slider with value badge, 2-column layout, section grouping
4. **PreviewElementsStepComponent** - Field hints, color preview boxes with hex codes

### Key Constraints

- Component must work with placeholder getter/setter methods until Story 2 is complete
- Use TypeScript `!` non-null assertion for service methods that don't exist yet (Story 2)
- Image upload should reuse existing image handling logic from BackgroundStepComponent
- All state changes should be synchronous (no async operations in this story)
- Preview box should use inline styles (no CSS classes for dynamic values)

---

## Definition of Done

- [x] `ContainerStylingStepComponent` created in correct directory
- [x] Component follows Angular 20 standalone component pattern
- [x] All 5 control sections implemented (Background, Borders, Shadow, Layout, Transparency)
- [x] All controls use PrimeNG components (no native HTML form elements)
- [x] 2-column responsive grid layout implemented
- [x] Section collapse/expand functionality works
- [x] Live preview box shows container styling in real-time
- [x] Component integrated into `ThemeDesignerModalComponent` at step index 5
- [x] Navigation between steps works correctly (Next, Previous, Save)
- [x] Component spec file created with basic unit tests
- [x] Tests pass:
      `npm --workspace=apps/web run test -- --include="**/container-styling-step.component.spec.ts"`
- [x] TypeScript compilation succeeds with no errors
- [x] Linting passes:
      `npm --workspace=apps/web run lint -- src/app/features/tools/components/form-builder/theme-designer-modal/steps/container-styling-step.component.ts`
- [x] Component renders correctly in browser without console errors
- [x] Accessibility verified: keyboard navigation, ARIA labels, screen reader support
- [x] Visual consistency confirmed with existing steps (colors, spacing, typography)
- [x] Code review completed and approved
- [x] No regressions in existing theme designer steps (manual testing)

---

## Validation Notes

**Before Starting Development:**

1. Verify `ThemeDesignerModalService` exists and is injectable
2. Confirm PrimeNG 17+ modules are available in project
3. Review existing step components to understand patterns
4. Verify stepper component supports 6 steps (currently has 5)

**During Development:**

1. Test each control section individually before integrating
2. Verify preview updates in real-time as controls change
3. Test responsive layout at multiple viewport widths
4. Verify section collapse/expand animations work smoothly

**Post-Development:**

1. Manual testing: Create new theme, navigate to Step 6, adjust all controls
2. Verify no console errors during control interactions
3. Test keyboard navigation through all form controls
4. Verify theme designer can still save (even with placeholder service methods)

---

**Story Created:** 2025-10-19 **Story ID:** 24.1 **Dependencies:** None (first story in epic)
**Blocks:** Story 24.2 (Type definitions), Story 24.3 (Rendering)
