# Story 24.2: Extend Theme Types and Service State Management - Brownfield Addition

**Epic:** Epic 24 - Form Container Styling **Story Points:** 3 **Priority:** High **Estimated
Effort:** 3-4 hours

---

## User Story

As a **developer**, I want **the theme type definitions and service layer extended to support
container styling properties**, So that **the form container styling data can be properly stored,
retrieved, and managed with type safety across the frontend and backend**.

---

## Story Context

### Existing System Integration

- **Integrates with:**
  - `ThemeProperties` interface in `@nodeangularfullstack/shared` package
  - `ThemeDesignerModalService` in theme designer modal
  - `FormTheme` database model (JSONB `themeConfig` column)
- **Technology:**
  - TypeScript with strict mode
  - Angular Signals for reactive state
  - Shared TypeScript types package
  - JSONB database column (PostgreSQL)
- **Follows pattern:**
  - Existing theme service getter/setter methods with signals
  - Existing `ThemeProperties` interface structure
  - Additive JSONB schema changes (no migration needed)
- **Touch points:**
  - `packages/shared/src/types/theme.types.ts` (extend `ThemeProperties`)
  - `apps/web/src/app/features/tools/components/form-builder/theme-designer-modal/theme-designer-modal.service.ts`
    (add methods)
  - Shared package build pipeline (`npm run build:shared`)
  - TypeScript type checking across frontend and backend

---

## Acceptance Criteria

### Functional Requirements

1. **ThemeProperties Interface Extended:**
   - Add new optional properties to `ThemeProperties` interface in
     `packages/shared/src/types/theme.types.ts`:

     ```typescript
     // Container Background Properties
     containerBackgroundColor?: string; // hex color
     containerBackgroundImage?: string; // base64 or URL
     containerBackgroundSize?: 'cover' | 'contain' | 'auto' | string; // custom value
     containerBackgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right' | string;

     // Border Properties
     containerBorderEnabled?: boolean;
     containerBorderWidth?: number; // 0-10 pixels
     containerBorderColor?: string; // hex color
     containerBorderRadius?: number; // 0-50 pixels
     containerBorderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';

     // Box Shadow Properties
     containerShadowEnabled?: boolean;
     containerShadowPreset?: 'none' | 'subtle' | 'medium' | 'strong' | 'custom';
     containerShadowOffsetX?: number; // -20 to +20 pixels
     containerShadowOffsetY?: number; // -20 to +20 pixels
     containerShadowBlur?: number; // 0-50 pixels
     containerShadowSpread?: number; // -20 to +20 pixels
     containerShadowColor?: string; // rgba color with alpha

     // Layout & Alignment Properties
     containerHorizontalAlign?: 'left' | 'center' | 'right';
     containerVerticalAlign?: 'top' | 'center' | 'bottom';
     containerMaxWidth?: number; // 200-1400 pixels or special values
     containerMaxWidthUnit?: 'px' | '%' | 'vw';

     // Transparency & Effects Properties
     containerOpacity?: number; // 0-100 percentage
     containerBackdropBlurEnabled?: boolean;
     containerBackdropBlurIntensity?: number; // 0-20 pixels
     ```

2. **Default Values Defined:**
   - Create `DEFAULT_CONTAINER_STYLES` constant object with sensible defaults:
     ```typescript
     export const DEFAULT_CONTAINER_STYLES = {
       containerBackgroundColor: '#ffffff',
       containerBackgroundImage: undefined,
       containerBackgroundSize: 'cover',
       containerBackgroundPosition: 'center',
       containerBorderEnabled: true,
       containerBorderWidth: 1,
       containerBorderColor: '#e5e7eb',
       containerBorderRadius: 8,
       containerBorderStyle: 'solid',
       containerShadowEnabled: true,
       containerShadowPreset: 'subtle',
       containerShadowOffsetX: 0,
       containerShadowOffsetY: 2,
       containerShadowBlur: 8,
       containerShadowSpread: 0,
       containerShadowColor: 'rgba(0, 0, 0, 0.1)',
       containerHorizontalAlign: 'center',
       containerVerticalAlign: 'center',
       containerMaxWidth: 800,
       containerMaxWidthUnit: 'px',
       containerOpacity: 100,
       containerBackdropBlurEnabled: false,
       containerBackdropBlurIntensity: 0,
     };
     ```

3. **Service Signals Created:**
   - Add private signals in `ThemeDesignerModalService` for all container properties:
     ```typescript
     // Background signals
     private containerBackgroundColor = signal<string>(DEFAULT_CONTAINER_STYLES.containerBackgroundColor);
     private containerBackgroundImage = signal<string | undefined>(DEFAULT_CONTAINER_STYLES.containerBackgroundImage);
     // ... etc for all properties
     ```

4. **Getter Methods Implemented:**
   - Add public getter methods for all container properties:
     ```typescript
     getContainerBackgroundColor(): string {
       return this.containerBackgroundColor();
     }
     getContainerBackgroundImage(): string | undefined {
       return this.containerBackgroundImage();
     }
     // ... etc for all 24 properties
     ```

5. **Setter Methods Implemented:**
   - Add public setter methods for all container properties:
     ```typescript
     setContainerBackgroundColor(value: string): void {
       this.containerBackgroundColor.set(value);
       this.notifyThemeChange();
     }
     setContainerBackgroundImage(value: string | undefined): void {
       this.containerBackgroundImage.set(value);
       this.notifyThemeChange();
     }
     // ... etc for all 24 properties
     ```

6. **Theme Import/Export Updated:**
   - Update `importTheme()` method to include container properties
   - Update `exportTheme()` method to include container properties
   - Update `resetToDefaults()` method to reset container properties to defaults
   - Update `getCurrentThemeConfig()` method to include container properties in returned object

7. **Validation Methods Added:**
   - Add validation for container property values:
     ```typescript
     private validateContainerBorderWidth(value: number): number {
       return Math.max(0, Math.min(10, value));
     }
     private validateContainerOpacity(value: number): number {
       return Math.max(0, Math.min(100, value));
     }
     // ... validation for other properties
     ```

### Integration Requirements

8. **Shared Package Build:**
   - Shared package builds successfully: `npm --workspace=packages/shared run build`
   - TypeScript types exported correctly from shared package
   - Frontend can import extended `ThemeProperties` type
   - Backend can import extended `ThemeProperties` type (no usage yet, but available)

9. **Service Integration:**
   - All 24 getter methods callable from Story 1 UI component
   - All 24 setter methods update signal state correctly
   - `notifyThemeChange()` triggers for all setter methods (existing change detection works)
   - Signals are reactive and trigger component updates

10. **Backward Compatibility:**
    - Existing themes without container properties load correctly (undefined values handled)
    - Default values applied when importing themes without container properties
    - Existing theme designer steps (1-5) continue to function unchanged
    - No breaking changes to existing `FormTheme` API responses

### Quality Requirements

11. **Type Safety:**
    - All new properties have explicit TypeScript types
    - No `any` types used
    - Enums or union types used for restricted value sets
    - Optional properties use `?:` syntax correctly

12. **Documentation:**
    - JSDoc comments added for all new interface properties
    - JSDoc comments added for all getter/setter methods
    - Default values documented in constant definition
    - Validation rules documented in validation methods

13. **Testing:**
    - Unit tests added to `theme-designer-modal.service.spec.ts`:
      - Test getter methods return correct signal values
      - Test setter methods update signal values
      - Test validation methods enforce constraints
      - Test `importTheme()` handles container properties
      - Test `exportTheme()` includes container properties
      - Test `resetToDefaults()` resets container properties
      - Test backward compatibility (importing theme without container props)

---

## Technical Notes

### Implementation Approach

**Type Definition Extension:**

Location: `packages/shared/src/types/theme.types.ts`

```typescript
export interface ThemeProperties {
  // ... existing properties (primaryColor, backgroundColor, etc.)

  /** Container background color (hex format, e.g., #ffffff) */
  containerBackgroundColor?: string;
  /** Container background image (base64 or URL) */
  containerBackgroundImage?: string;
  /** Container background size (cover, contain, auto, or custom CSS value) */
  containerBackgroundSize?: 'cover' | 'contain' | 'auto' | string;
  /** Container background position (center, top, bottom, left, right, or custom CSS value) */
  containerBackgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right' | string;

  // ... (all 24 properties with JSDoc comments)
}
```

**Service Extension:**

Location:
`apps/web/src/app/features/tools/components/form-builder/theme-designer-modal/theme-designer-modal.service.ts`

```typescript
@Injectable()
export class ThemeDesignerModalService {
  // ... existing signals

  // Container Background Signals
  private containerBackgroundColor = signal<string>(
    DEFAULT_CONTAINER_STYLES.containerBackgroundColor
  );
  private containerBackgroundImage = signal<string | undefined>(undefined);
  // ... all 24 signals

  // ... existing methods

  // Container Background Getters
  getContainerBackgroundColor(): string {
    return this.containerBackgroundColor();
  }
  getContainerBackgroundImage(): string | undefined {
    return this.containerBackgroundImage();
  }

  // Container Background Setters
  setContainerBackgroundColor(value: string): void {
    this.containerBackgroundColor.set(value);
    this.notifyThemeChange();
  }
  setContainerBackgroundImage(value: string | undefined): void {
    this.containerBackgroundImage.set(value);
    this.notifyThemeChange();
  }

  // ... all 24 getters/setters

  // Updated Methods
  getCurrentThemeConfig(): ResponsiveThemeConfig {
    return {
      desktop: {
        // ... existing properties
        containerBackgroundColor: this.containerBackgroundColor(),
        containerBackgroundImage: this.containerBackgroundImage(),
        // ... all 24 container properties
      },
    };
  }

  importTheme(theme: FormTheme): void {
    const config = theme.themeConfig.desktop;
    // ... existing property imports
    if (config.containerBackgroundColor !== undefined) {
      this.containerBackgroundColor.set(config.containerBackgroundColor);
    }
    // ... all 24 container property imports (with undefined checks)
  }

  resetToDefaults(): void {
    // ... existing resets
    this.containerBackgroundColor.set(DEFAULT_CONTAINER_STYLES.containerBackgroundColor);
    this.containerBackgroundImage.set(DEFAULT_CONTAINER_STYLES.containerBackgroundImage);
    // ... all 24 container property resets
  }
}
```

### Existing Pattern Reference

Follow these patterns from existing service methods:

1. **Signal creation:** `private primaryColor = signal<string>('#6366f1');`
2. **Getter pattern:** `getPrimaryColor(): string { return this.primaryColor(); }`
3. **Setter pattern:**
   `setPrimaryColor(value: string): void { this.primaryColor.set(value); this.notifyThemeChange(); }`
4. **Import pattern:** Check for undefined before setting:
   `if (config.primaryColor) { this.primaryColor.set(config.primaryColor); }`
5. **Export pattern:** Include in returned object: `primaryColor: this.primaryColor(),`

### Key Constraints

- All properties must be **optional** (`?:`) to maintain backward compatibility
- All setter methods must call `notifyThemeChange()` to trigger reactivity
- Validation should be permissive (don't throw errors, clamp values instead)
- Default values should match existing form design patterns (subtle, professional)
- No database migration required (JSONB column already supports new properties)

---

## Definition of Done

- [x] `ThemeProperties` interface extended with all 24 container properties in
      `packages/shared/src/types/theme.types.ts`
- [x] JSDoc comments added for all new properties
- [x] `DEFAULT_CONTAINER_STYLES` constant created and exported
- [x] All 24 private signals created in `ThemeDesignerModalService`
- [x] All 24 getter methods implemented
- [x] All 24 setter methods implemented (with `notifyThemeChange()` calls)
- [x] Validation methods added for numeric properties
- [x] `getCurrentThemeConfig()` method updated to include container properties
- [x] `importTheme()` method updated to handle container properties (with undefined checks)
- [x] `exportTheme()` method updated to include container properties
- [x] `resetToDefaults()` method updated to reset container properties
- [x] Shared package builds successfully: `npm --workspace=packages/shared run build`
- [x] Frontend TypeScript compilation succeeds: `npm --workspace=apps/web run typecheck`
- [x] Backend TypeScript compilation succeeds: `npm --workspace=apps/api run typecheck`
- [x] Unit tests added to `theme-designer-modal.service.spec.ts` with ≥80% coverage for new methods
- [x] Tests pass:
      `npm --workspace=apps/web run test -- --include="**/theme-designer-modal.service.spec.ts"`
- [x] Linting passes for shared package: `npm --workspace=packages/shared run lint`
- [x] Linting passes for service file:
      `npm --workspace=apps/web run lint -- src/app/features/tools/components/form-builder/theme-designer-modal/theme-designer-modal.service.ts`
- [x] Story 1 UI component can successfully call all getter methods (manual integration test)
- [x] Story 1 UI component can successfully call all setter methods and see reactive updates
- [x] Code review completed and approved
- [x] No breaking changes to existing theme functionality verified

---

## Validation Notes

**Before Starting Development:**

1. Review existing `ThemeProperties` interface structure
2. Review existing getter/setter patterns in `ThemeDesignerModalService`
3. Verify shared package build pipeline works
4. Check that Story 1 is complete (UI component exists)

**During Development:**

1. Build shared package after each type change to verify exports
2. Test each getter/setter pair individually in browser console
3. Verify signal reactivity by observing component updates
4. Test `importTheme()` with both old and new theme structures

**Post-Development:**

1. Integration test: Story 1 UI component should now work fully (no TypeScript errors on service
   method calls)
2. Verify default values appear in UI when creating new theme
3. Verify importing existing theme (without container props) doesn't crash
4. Verify exporting theme includes container properties in JSON

---

**Story Created:** 2025-10-19 **Story ID:** 24.2 **Dependencies:** Story 24.1 (UI component should
exist before testing integration) **Blocks:** Story 24.3 (Rendering requires type definitions)
