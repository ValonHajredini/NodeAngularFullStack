# Story 24.3: Apply Container Styling to Form Renderer and Preview - Brownfield Addition

**Epic:** Epic 24 - Form Container Styling **Story Points:** 5-6 **Priority:** High **Estimated
Effort:** 5-7 hours

---

## User Story

As a **form creator and form respondent**, I want **the container styling from the theme designer to
be applied to the form wrapper in both the preview and public rendering**, So that **my customized
container appearance (background, borders, shadows, alignment, transparency) is visible when editing
forms and when users fill out published forms**.

---

## Story Context

### Existing System Integration

- **Integrates with:**
  - `ThemePreviewService` (CSS variable generation and application)
  - `FormRendererComponent` (public form display)
  - Form Builder preview canvas (editor preview)
  - p-card component (PrimeNG card wrapper)
- **Technology:**
  - Angular 20+ with CSS custom properties
  - PrimeNG Card component
  - TypeScript with strict mode
  - Responsive CSS with media queries
- **Follows pattern:**
  - Existing `ThemePreviewService` CSS variable mapping (e.g., `--theme-form-primary-color`)
  - Existing form renderer theme application logic
  - Existing preview service `applyTheme()` method structure
- **Touch points:**
  - `apps/web/src/app/features/tools/components/theme-preview.service.ts` (extend CSS variable
    mapping)
  - `apps/web/src/app/features/public/form-renderer/form-renderer.component.ts` (apply container
    styles)
  - `apps/web/src/app/features/public/form-renderer/form-renderer.component.html` (p-card template)
  - `apps/web/src/app/features/public/form-renderer/form-renderer.component.scss` (container CSS)
  - `apps/web/src/app/features/tools/components/form-builder/form-builder.component.ts` (preview
    canvas)

---

## Acceptance Criteria

### Functional Requirements

1. **ThemePreviewService Extended:**
   - Add CSS custom property mappings for all 24 container styling properties in
     `generateCssVariables()` method
   - CSS variables follow naming convention: `--theme-form-container-*`
   - Example mappings:
     ```typescript
     '--theme-form-container-bg-color': themeConfig.containerBackgroundColor || '#ffffff',
     '--theme-form-container-bg-image': themeConfig.containerBackgroundImage ? `url(${themeConfig.containerBackgroundImage})` : 'none',
     '--theme-form-container-bg-size': themeConfig.containerBackgroundSize || 'cover',
     '--theme-form-container-border-width': `${themeConfig.containerBorderWidth || 1}px`,
     '--theme-form-container-border-color': themeConfig.containerBorderColor || '#e5e7eb',
     '--theme-form-container-border-radius': `${themeConfig.containerBorderRadius || 8}px`,
     '--theme-form-container-box-shadow': generateBoxShadowValue(themeConfig),
     '--theme-form-container-opacity': (themeConfig.containerOpacity || 100) / 100,
     // ... all 24 properties mapped
     ```

2. **Box Shadow Generation Helper:**
   - Add private helper method `generateContainerBoxShadow(config: ThemeProperties): string`
   - Handle shadow presets (subtle, medium, strong)
   - Handle custom shadow values (offsetX, offsetY, blur, spread, color)
   - Handle shadow disabled state (return 'none')
   - Example implementation:

     ```typescript
     private generateContainerBoxShadow(config: ThemeProperties): string {
       if (!config.containerShadowEnabled) return 'none';

       const preset = config.containerShadowPreset || 'subtle';
       if (preset === 'subtle') return '0 2px 8px rgba(0, 0, 0, 0.1)';
       if (preset === 'medium') return '0 4px 16px rgba(0, 0, 0, 0.15)';
       if (preset === 'strong') return '0 8px 24px rgba(0, 0, 0, 0.25)';

       // Custom shadow
       const x = config.containerShadowOffsetX || 0;
       const y = config.containerShadowOffsetY || 0;
       const blur = config.containerShadowBlur || 0;
       const spread = config.containerShadowSpread || 0;
       const color = config.containerShadowColor || 'rgba(0, 0, 0, 0.1)';
       return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
     }
     ```

3. **Border Generation Helper:**
   - Add private helper method `generateContainerBorder(config: ThemeProperties): string`
   - Handle border disabled state (return 'none')
   - Handle border width, style, and color
   - Example: `"1px solid #e5e7eb"` or `"none"`

4. **Backdrop Blur Generation Helper:**
   - Add private helper method `generateContainerBackdropBlur(config: ThemeProperties): string`
   - Handle backdrop blur disabled state (return 'none')
   - Handle blur intensity
   - Example: `"blur(10px)"` or `"none"`
   - Add browser compatibility check (Safari, Chrome, Firefox support varies)

5. **FormRendererComponent Template Updated:**
   - Apply CSS custom properties to p-card wrapper element
   - Add CSS class `form-container-styled` to p-card for scoped styling
   - Template structure:
     ```html
     <div
       class="form-renderer-container"
       [style.justify-content]="getHorizontalAlignment()"
       [style.align-items]="getVerticalAlignment()"
     >
       <p-card class="form-container-styled" [style.--container-max-width]="getContainerMaxWidth()">
         <!-- Existing form content -->
       </p-card>
     </div>
     ```

6. **FormRendererComponent SCSS Updated:**
   - Add `.form-container-styled` CSS class that applies CSS custom properties
   - Use CSS variables for all container styling:
     ```scss
     .form-container-styled {
       background-color: var(--theme-form-container-bg-color, #ffffff);
       background-image: var(--theme-form-container-bg-image, none);
       background-size: var(--theme-form-container-bg-size, cover);
       background-position: var(--theme-form-container-bg-position, center);
       border: var(--theme-form-container-border, 1px solid #e5e7eb);
       border-radius: var(--theme-form-container-border-radius, 8px);
       box-shadow: var(--theme-form-container-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
       opacity: var(--theme-form-container-opacity, 1);
       backdrop-filter: var(--theme-form-container-backdrop-blur, none);
       max-width: var(--container-max-width, 800px);
       margin: 0 auto;
       transition: all 0.3s ease;
     }
     ```

7. **Alignment Helper Methods:**
   - Add `getHorizontalAlignment()` method in `FormRendererComponent`:
     ```typescript
     private getHorizontalAlignment(): string {
       const align = this.formSchema?.theme?.themeConfig?.desktop?.containerHorizontalAlign || 'center';
       if (align === 'left') return 'flex-start';
       if (align === 'right') return 'flex-end';
       return 'center';
     }
     ```
   - Add `getVerticalAlignment()` method (similar logic)
   - Add `getContainerMaxWidth()` method to handle px, %, vw units

8. **Form Builder Preview Canvas Updated:**
   - Apply same CSS variables to form builder preview canvas
   - Ensure real-time preview updates as theme designer controls change
   - Preview canvas uses same `.form-container-styled` CSS class
   - Verify container styling shows in both "Edit Mode" and "Preview Mode"

### Integration Requirements

9. **CSS Variable Application:**
   - CSS variables update in real-time as theme designer controls change
   - `applyTheme()` method in `ThemePreviewService` correctly injects CSS variables into DOM
   - CSS variables scoped to form renderer and preview canvas only (no global pollution)

10. **Responsive Behavior:**
    - Container styling works correctly at all viewport widths
    - Media queries handle mobile viewports (max-width: 767px):
      - Container max-width adjusts for mobile screens
      - Backdrop blur disabled on unsupported browsers (graceful degradation)
      - Box shadows reduced on mobile for performance
    - Alignment works correctly on both desktop and mobile

11. **Cross-Browser Compatibility:**
    - Container styling works in Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
    - Backdrop blur gracefully degrades in unsupported browsers (feature detection)
    - Box shadows render correctly in all browsers
    - Border styles render correctly in all browsers
    - Background images load and display correctly

12. **Existing Functionality Unchanged:**
    - Form field styling (borders, padding, colors) remains unchanged
    - Typography styling remains unchanged
    - Color scheme remains unchanged
    - Background styling (form background) remains unchanged
    - Preview elements styling remains unchanged

### Quality Requirements

13. **Performance:**
    - CSS variable updates complete in < 100ms (no janky animations)
    - Background image loading doesn't block form rendering (lazy load)
    - Complex box shadows don't cause frame drops (GPU acceleration if needed)
    - Backdrop blur tested on low-end devices (performance warning if needed)
    - Theme application doesn't cause re-rendering of unrelated components

14. **Accessibility:**
    - Container opacity doesn't reduce text readability below WCAG AA standards (minimum 4.5:1
      contrast)
    - Background images don't obscure text (validation or warning in theme designer)
    - Focus indicators remain visible with all container styling combinations
    - Keyboard navigation not affected by container styling
    - Screen readers can access form content with all container styles

15. **Visual Quality:**
    - No visual glitches during theme transitions
    - Border radius applies smoothly to all corners
    - Box shadows render without artifacts
    - Background images don't distort or pixelate
    - Transparency effects render smoothly

16. **Testing:**
    - Unit tests added to `theme-preview.service.spec.ts`:
      - Test CSS variable generation for all container properties
      - Test box shadow generation helper (presets and custom)
      - Test border generation helper
      - Test backdrop blur generation helper
    - Integration tests added to `form-renderer.component.spec.ts`:
      - Test container styling applied to p-card
      - Test alignment helper methods
      - Test max-width calculation
    - E2E tests added (Playwright):
      - Create theme with container styling in designer
      - Verify styling appears in form builder preview
      - Publish form and verify styling on public form
      - Test responsive behavior on mobile viewport

---

## Technical Notes

### Implementation Approach

**ThemePreviewService Extension:**

Location: `apps/web/src/app/features/tools/components/theme-preview.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ThemePreviewService {
  // ... existing methods

  private generateCssVariables(themeConfig: ThemeProperties): Record<string, string> {
    return {
      // ... existing CSS variables

      // Container Background
      '--theme-form-container-bg-color': themeConfig.containerBackgroundColor || '#ffffff',
      '--theme-form-container-bg-image': themeConfig.containerBackgroundImage
        ? `url(${themeConfig.containerBackgroundImage})`
        : 'none',
      '--theme-form-container-bg-size': themeConfig.containerBackgroundSize || 'cover',
      '--theme-form-container-bg-position': themeConfig.containerBackgroundPosition || 'center',

      // Container Border
      '--theme-form-container-border': this.generateContainerBorder(themeConfig),
      '--theme-form-container-border-radius': `${themeConfig.containerBorderRadius || 8}px`,

      // Container Box Shadow
      '--theme-form-container-box-shadow': this.generateContainerBoxShadow(themeConfig),

      // Container Layout
      '--theme-form-container-h-align': themeConfig.containerHorizontalAlign || 'center',
      '--theme-form-container-v-align': themeConfig.containerVerticalAlign || 'center',
      '--theme-form-container-max-width': `${themeConfig.containerMaxWidth || 800}${themeConfig.containerMaxWidthUnit || 'px'}`,

      // Container Effects
      '--theme-form-container-opacity': String((themeConfig.containerOpacity || 100) / 100),
      '--theme-form-container-backdrop-blur': this.generateContainerBackdropBlur(themeConfig),
    };
  }

  private generateContainerBoxShadow(config: ThemeProperties): string {
    // Implementation as described in AC #2
  }

  private generateContainerBorder(config: ThemeProperties): string {
    // Implementation as described in AC #3
  }

  private generateContainerBackdropBlur(config: ThemeProperties): string {
    // Implementation as described in AC #4
  }
}
```

**FormRendererComponent Updates:**

Location: `apps/web/src/app/features/public/form-renderer/form-renderer.component.html`

```html
<div class="form-renderer-wrapper">
  <div
    class="form-renderer-container"
    [style.justify-content]="getHorizontalAlignment()"
    [style.align-items]="getVerticalAlignment()"
  >
    <p-card
      class="form-container form-container-styled"
      [style.--container-max-width]="getContainerMaxWidth()"
    >
      <ng-template pTemplate="header">
        <h2 class="form-title">{{ formSchema.title }}</h2>
        <p class="form-description">{{ formSchema.description }}</p>
      </ng-template>

      <!-- Existing form content -->
    </p-card>
  </div>
</div>
```

Location: `apps/web/src/app/features/public/form-renderer/form-renderer.component.scss`

```scss
.form-renderer-wrapper {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.form-renderer-container {
  display: flex;
  width: 100%;
  min-height: calc(100vh - 4rem);
}

.form-container-styled {
  // Apply CSS custom properties
  background-color: var(--theme-form-container-bg-color, #ffffff);
  background-image: var(--theme-form-container-bg-image, none);
  background-size: var(--theme-form-container-bg-size, cover);
  background-position: var(--theme-form-container-bg-position, center);
  background-repeat: no-repeat;

  border: var(--theme-form-container-border, 1px solid #e5e7eb);
  border-radius: var(--theme-form-container-border-radius, 8px);

  box-shadow: var(--theme-form-container-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));

  opacity: var(--theme-form-container-opacity, 1);
  backdrop-filter: var(--theme-form-container-backdrop-blur, none);
  -webkit-backdrop-filter: var(--theme-form-container-backdrop-blur, none); // Safari support

  max-width: var(--container-max-width, 800px);
  width: 100%;
  margin: 0 auto;

  transition: all 0.3s ease;
}

// Responsive adjustments
@media (max-width: 767px) {
  .form-renderer-wrapper {
    padding: 1rem 0.5rem;
  }

  .form-container-styled {
    max-width: 100% !important;
    margin: 0 0.5rem;
  }
}

// Browser compatibility fallbacks
@supports not (backdrop-filter: blur(10px)) {
  .form-container-styled {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}
```

### Existing Pattern Reference

Follow these patterns from existing theme application:

1. **CSS Variable Generation:** `'--theme-form-primary-color': themeConfig.primaryColor`
2. **Helper Methods:** Private methods for complex CSS value generation
3. **Browser Compatibility:** Use `@supports` queries for modern CSS features
4. **Responsive Design:** Use media queries for mobile adaptations
5. **Transition Effects:** Use CSS transitions for smooth theme changes

### Key Constraints

- CSS variables must have fallback values (second parameter in `var()`)
- All CSS property values must be valid CSS syntax (quotes, units, etc.)
- Performance: Avoid expensive CSS operations (complex gradients, multiple shadows)
- Browser support: Test in Chrome, Firefox, Safari, Edge (no IE11 support needed)
- Backward compatibility: Forms without container styling must render with defaults

---

## Definition of Done

- [x] `ThemePreviewService.generateCssVariables()` extended with all 24 container CSS variables
- [x] `generateContainerBoxShadow()` helper method implemented and tested
- [x] `generateContainerBorder()` helper method implemented and tested
- [x] `generateContainerBackdropBlur()` helper method implemented and tested
- [x] `FormRendererComponent` template updated to apply container styling to p-card
- [x] `FormRendererComponent` SCSS updated with `.form-container-styled` class
- [x] `getHorizontalAlignment()`, `getVerticalAlignment()`, `getContainerMaxWidth()` helper methods
      implemented
- [x] Form builder preview canvas applies container styling
- [x] Real-time preview updates verified in theme designer modal
- [x] Unit tests added to `theme-preview.service.spec.ts` with ≥80% coverage
- [x] Unit tests added to `form-renderer.component.spec.ts` for alignment helpers
- [x] E2E tests added: `npm run test:e2e -- --grep="Container Styling"`
- [x] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)
- [x] Responsive testing completed (desktop, tablet, mobile viewports)
- [x] Performance benchmarks met (CSS updates < 100ms, no frame drops)
- [x] Accessibility testing completed (WCAG AA contrast ratios maintained)
- [x] TypeScript compilation succeeds: `npm --workspace=apps/web run typecheck`
- [x] Linting passes for all modified files
- [x] No console errors or warnings in browser
- [x] No regression in existing theme functionality (Steps 1-5 verified)
- [x] Published form displays container styling correctly
- [x] Code review completed and approved
- [x] Deployed to staging environment and verified end-to-end

---

## Validation Notes

**Before Starting Development:**

1. Verify Stories 24.1 and 24.2 are complete
2. Verify theme designer can save themes with container properties
3. Review existing `ThemePreviewService` CSS variable generation
4. Review existing `FormRendererComponent` structure

**During Development:**

1. Test CSS variable generation with browser dev tools (Inspect → Computed styles)
2. Test each container property individually before testing combinations
3. Verify backdrop blur with feature detection in multiple browsers
4. Test performance with complex combinations (image + shadow + blur)

**Post-Development:**

1. End-to-end manual test:
   - Open theme designer
   - Navigate to Container Styling step
   - Adjust all controls
   - Verify preview updates in real-time
   - Save theme
   - Apply theme to form
   - Preview form in builder
   - Publish form
   - Open public form link
   - Verify all container styles match designer
2. Regression test: Verify existing themes (without container props) still render correctly
3. Responsive test: Resize browser from desktop → tablet → mobile, verify layout adapts
4. Browser test: Open public form in Chrome, Firefox, Safari, Edge - verify identical rendering

---

**Story Created:** 2025-10-19 **Story ID:** 24.3 **Dependencies:** Story 24.1 (UI), Story 24.2
(Types & Service) **Blocks:** None (final story in epic)
