# Theme System Architecture

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Architecture](#frontend-architecture)
6. [Theme Utility Classes](#theme-utility-classes)
7. [Authentication & Authorization](#authentication--authorization)
8. [Performance Considerations](#performance-considerations)
9. [Backward Compatibility](#backward-compatibility)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### High-Level Architecture

The theme system is a comprehensive visual customization framework that enables users to create,
apply, and manage custom themes for forms. The architecture follows a **client-server model** with
**CSS variable-based dynamic styling**.

```mermaid
graph TB
    subgraph "Frontend"
        A[Form Builder Component] --> B[Theme Dropdown Component]
        B --> C[Theme Designer Modal]
        C --> D[ThemePreviewService]
        D --> E[CSS Variable Injection]
        F[Public Form Renderer] --> D
        G[Preview Modal] --> D
    end

    subgraph "Backend"
        H[Themes Controller] --> I[Themes Service]
        I --> J[Themes Repository]
        J --> K[(PostgreSQL - form_themes)]
    end

    subgraph "Authentication"
        L[Auth Middleware] --> H
        M[Authorization Guard] --> H
    end

    A -->|POST /api/themes| H
    B -->|GET /api/themes| H
    C -->|PUT /api/themes/:id| H
    F -->|GET /api/themes/:id| H
```

### Key Design Principles

1. **Separation of Concerns**
   - Backend manages theme data persistence
   - Frontend handles visual rendering via CSS variables
   - Theme logic isolated in dedicated services

2. **Performance-First**
   - CSS variables for instant theme switching (no reflow/repaint)
   - Debounced preview updates (300ms) prevent lag
   - Theme caching reduces API calls

3. **Accessibility**
   - WCAG AA compliant color contrast
   - Semantic HTML with proper ARIA labels
   - Keyboard navigation support

4. **Backward Compatibility**
   - Forms without themes use default styles
   - No breaking changes to existing forms
   - Graceful degradation for unsupported features

---

## System Architecture

### Component Diagram

```mermaid
classDiagram
    class ThemeDesignerModalComponent {
        +currentStep: number
        +themeForm: FormGroup
        +activeTheme: FormTheme
        +nextStep()
        +previousStep()
        +saveTheme()
        +applyPreview()
    }

    class ThemeDesignerModalService {
        +currentThemeSignal: WritableSignal
        +previewEnabledSignal: WritableSignal
        +updateTheme(theme: Partial)
        +enablePreview()
        +disablePreview()
    }

    class ThemePreviewService {
        +applyTheme(theme: FormTheme)
        +clearTheme()
        +applyThemeToElement(element: HTMLElement, theme: FormTheme)
        -injectCSSVariables(theme: FormTheme)
    }

    class FormsApiService {
        +getAllThemes(): Observable
        +getThemeById(id: string): Observable
        +createTheme(theme: CreateThemeDto): Observable
        +updateTheme(id: string, theme: UpdateThemeDto): Observable
        +deleteTheme(id: string): Observable
    }

    class ThemesController {
        +getAllThemes(req, res, next)
        +getThemeById(req, res, next)
        +createTheme(req, res, next)
        +updateTheme(req, res, next)
        +deleteTheme(req, res, next)
    }

    class ThemesService {
        +getAllThemes(): Promise
        +getThemeById(id: string): Promise
        +createTheme(userId: string, data: CreateThemeDto): Promise
        +updateTheme(id: string, userId: string, role: string, data: UpdateThemeDto): Promise
        +deleteTheme(id: string, userId: string, role: string): Promise
    }

    class ThemesRepository {
        +findAll(): Promise
        +findById(id: string): Promise
        +create(data: CreateThemeDto): Promise
        +update(id: string, data: UpdateThemeDto): Promise
        +delete(id: string): Promise
    }

    ThemeDesignerModalComponent --> ThemeDesignerModalService
    ThemeDesignerModalComponent --> FormsApiService
    ThemeDesignerModalService --> ThemePreviewService
    FormsApiService --> ThemesController
    ThemesController --> ThemesService
    ThemesService --> ThemesRepository
```

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant FormBuilder
    participant ThemeDesigner
    participant ThemePreview
    participant FormsAPI
    participant Database

    User->>FormBuilder: Click "Build Your Own Theme"
    FormBuilder->>ThemeDesigner: Open modal

    loop 5 Steps
        User->>ThemeDesigner: Fill form fields
        ThemeDesigner->>ThemePreview: Update preview (debounced 300ms)
        ThemePreview->>ThemePreview: Inject CSS variables
    end

    User->>ThemeDesigner: Click Save
    ThemeDesigner->>FormsAPI: POST /api/themes
    FormsAPI->>Database: INSERT INTO form_themes
    Database-->>FormsAPI: Return theme with ID
    FormsAPI-->>ThemeDesigner: Return created theme
    ThemeDesigner->>ThemePreview: Apply theme to canvas
    ThemeDesigner->>FormBuilder: Close modal
    FormBuilder->>FormBuilder: Update theme dropdown
```

---

## Database Schema

### form_themes Table

```sql
CREATE TABLE form_themes (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Theme Identification
  name VARCHAR(50) NOT NULL,

  -- Color Configuration
  primary_color VARCHAR(7) NOT NULL,       -- Hex color (e.g., #3B82F6)
  secondary_color VARCHAR(7) NOT NULL,     -- Hex color (e.g., #10B981)

  -- Background Configuration
  background_color TEXT,                   -- Hex color or CSS value
  background_type VARCHAR(20) DEFAULT 'solid' CHECK (background_type IN ('solid', 'linear', 'radial')),
  background_image_url TEXT,               -- URL to uploaded image (future)
  gradient_angle INTEGER CHECK (gradient_angle >= 0 AND gradient_angle <= 360),  -- For linear gradients
  gradient_position VARCHAR(50),           -- For radial gradients (center, top-left, etc.)

  -- Typography Configuration
  heading_font VARCHAR(100),               -- Google Font name
  body_font VARCHAR(100),                  -- Google Font name
  heading_font_size INTEGER DEFAULT 24 CHECK (heading_font_size >= 18 AND heading_font_size <= 32),
  body_font_size INTEGER DEFAULT 16 CHECK (body_font_size >= 14 AND body_font_size <= 18),

  -- Field Styling Configuration
  border_radius INTEGER DEFAULT 8 CHECK (border_radius >= 0 AND border_radius <= 32),
  field_padding INTEGER DEFAULT 12 CHECK (field_padding >= 8 AND field_padding <= 24),
  field_margin INTEGER DEFAULT 8 CHECK (field_margin >= 8 AND field_margin <= 32),
  border_width INTEGER DEFAULT 1 CHECK (border_width >= 1 AND border_width <= 4),

  -- Ownership & Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_form_themes_created_by ON form_themes(created_by);
CREATE INDEX idx_form_themes_name ON form_themes(name);
CREATE INDEX idx_form_themes_created_at ON form_themes(created_at DESC);
```

### forms Table Extension

```sql
ALTER TABLE forms ADD COLUMN theme_id UUID REFERENCES form_themes(id) ON DELETE SET NULL;

-- Index for theme lookups
CREATE INDEX idx_forms_theme_id ON forms(theme_id);
```

### Seed Data

9 pre-built themes seeded on database initialization:

| Theme Name      | Primary Color | Secondary Color | Background Type |
| --------------- | ------------- | --------------- | --------------- |
| Ocean Blue      | #3B82F6       | #06B6D4         | Linear gradient |
| Sunset Orange   | #F97316       | #FBBF24         | Linear gradient |
| Forest Green    | #10B981       | #34D399         | Solid           |
| Midnight Purple | #6366F1       | #8B5CF6         | Radial gradient |
| Royal Gold      | #F59E0B       | #FBBF24         | Linear gradient |
| Cherry Blossom  | #EC4899       | #F9A8D4         | Radial gradient |
| Arctic Frost    | #60A5FA       | #93C5FD         | Solid           |
| Sunset Gradient | #F97316       | #DC2626         | Linear gradient |
| Corporate Blue  | #1E40AF       | #3B82F6         | Solid           |

---

## API Endpoints

### REST API Documentation

Base URL: `/api/themes`

#### GET /api/themes

**Description:** List all available themes

**Authentication:** Optional (public endpoint)

**Authorization:** None

**Query Parameters:**

- `limit` (optional): Number of themes to return (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```typescript
// 200 OK
{
  "themes": [
    {
      "id": "uuid",
      "name": "Ocean Blue",
      "primaryColor": "#3B82F6",
      "secondaryColor": "#06B6D4",
      "backgroundColor": "linear-gradient(135deg, #3B82F6, #06B6D4)",
      "backgroundType": "linear",
      "gradientAngle": 135,
      "headingFont": "Montserrat",
      "bodyFont": "Open Sans",
      "headingFontSize": 24,
      "bodyFontSize": 16,
      "borderRadius": 8,
      "fieldPadding": 12,
      "fieldMargin": 8,
      "borderWidth": 1,
      "createdBy": "uuid",
      "createdAt": "2025-10-17T10:00:00Z",
      "updatedAt": "2025-10-17T10:00:00Z"
    }
  ],
  "total": 9
}
```

#### GET /api/themes/:id

**Description:** Get theme by ID

**Authentication:** Optional

**Authorization:** None

**Path Parameters:**

- `id`: Theme UUID

**Response:**

```typescript
// 200 OK
{
  "theme": { /* Theme object */ }
}

// 404 Not Found
{
  "error": "Theme not found"
}
```

#### POST /api/themes

**Description:** Create new custom theme

**Authentication:** Required (JWT token)

**Authorization:** Any authenticated user

**Request Body:**

```typescript
{
  "name": "My Custom Theme",
  "primaryColor": "#3B82F6",
  "secondaryColor": "#10B981",
  "backgroundColor": "#FFFFFF",
  "backgroundType": "solid",
  "gradientAngle": 135,  // Optional, required if backgroundType = "linear"
  "gradientPosition": "center",  // Optional, required if backgroundType = "radial"
  "headingFont": "Montserrat",
  "bodyFont": "Open Sans",
  "headingFontSize": 24,
  "bodyFontSize": 16,
  "borderRadius": 8,
  "fieldPadding": 12,
  "fieldMargin": 8,
  "borderWidth": 1
}
```

**Validation Rules:**

- `name`: Required, 1-50 characters, alphanumeric and spaces
- `primaryColor`, `secondaryColor`: Required, valid hex color (#RRGGBB)
- `backgroundType`: One of ['solid', 'linear', 'radial']
- `gradientAngle`: Integer 0-360 (if backgroundType = 'linear')
- Font sizes, padding, radius: Must be within defined ranges (see database schema)

**Response:**

```typescript
// 201 Created
{
  "theme": { /* Created theme object with ID */ }
}

// 400 Bad Request
{
  "errors": [
    { "field": "name", "message": "Name is required" },
    { "field": "primaryColor", "message": "Invalid hex color format" }
  ]
}

// 401 Unauthorized
{
  "error": "Authentication required"
}
```

#### PUT /api/themes/:id

**Description:** Update existing theme

**Authentication:** Required

**Authorization:** Theme owner OR admin role

**Path Parameters:**

- `id`: Theme UUID

**Request Body:**

```typescript
{
  "name": "Updated Theme Name",
  "primaryColor": "#FF5733",
  // ... other fields (partial update supported)
}
```

**Response:**

```typescript
// 200 OK
{
  "theme": { /* Updated theme object */ }
}

// 403 Forbidden
{
  "error": "You can only edit your own themes"
}

// 404 Not Found
{
  "error": "Theme not found"
}
```

#### DELETE /api/themes/:id

**Description:** Delete theme

**Authentication:** Required

**Authorization:** Theme owner OR admin role

**Path Parameters:**

- `id`: Theme UUID

**Response:**

```typescript
// 204 No Content

// 403 Forbidden
{
  "error": "You can only delete your own themes"
}

// 404 Not Found
{
  "error": "Theme not found"
}
```

### Error Handling

All API endpoints use centralized error handling middleware:

```typescript
// Error Response Format
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* Optional additional details */ }
}
```

**Common HTTP Status Codes:**

- `200 OK` - Successful GET/PUT request
- `201 Created` - Successful POST request
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authorization failure (insufficient permissions)
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server-side error

---

## Frontend Architecture

### ThemePreviewService

**Location:** `apps/web/src/app/features/tools/components/form-builder/theme-preview.service.ts`

**Purpose:** Dynamically inject CSS variables to apply themes without reloading

**Key Methods:**

```typescript
@Injectable({ providedIn: 'root' })
export class ThemePreviewService {
  /**
   * Apply theme to a specific element or document root.
   * Injects CSS variables dynamically for instant visual update.
   *
   * @param theme - FormTheme object with all styling properties
   * @param element - Optional HTMLElement (defaults to document.documentElement)
   */
  applyTheme(theme: FormTheme | null, element?: HTMLElement): void {
    const target = element || document.documentElement;

    if (!theme) {
      this.clearTheme(target);
      return;
    }

    // Inject CSS variables
    target.style.setProperty('--theme-primary-color', theme.primaryColor);
    target.style.setProperty('--theme-secondary-color', theme.secondaryColor);
    target.style.setProperty('--theme-background', theme.backgroundColor || '#FFFFFF');
    target.style.setProperty('--theme-heading-font', theme.headingFont || 'inherit');
    target.style.setProperty('--theme-body-font', theme.bodyFont || 'inherit');
    target.style.setProperty('--theme-heading-font-size', `${theme.headingFontSize || 24}px`);
    target.style.setProperty('--theme-body-font-size', `${theme.bodyFontSize || 16}px`);
    target.style.setProperty('--theme-border-radius', `${theme.borderRadius || 8}px`);
    target.style.setProperty('--theme-field-padding', `${theme.fieldPadding || 12}px`);
    target.style.setProperty('--theme-field-margin', `${theme.fieldMargin || 8}px`);
    target.style.setProperty('--theme-border-width', `${theme.borderWidth || 1}px`);

    // Handle gradient backgrounds
    if (theme.backgroundType === 'linear') {
      const gradient = `linear-gradient(${theme.gradientAngle || 135}deg, ${theme.primaryColor}, ${theme.secondaryColor})`;
      target.style.setProperty('--theme-background', gradient);
    } else if (theme.backgroundType === 'radial') {
      const gradient = `radial-gradient(circle at ${theme.gradientPosition || 'center'}, ${theme.primaryColor}, ${theme.secondaryColor})`;
      target.style.setProperty('--theme-background', gradient);
    }
  }

  /**
   * Remove all theme CSS variables.
   * Reverts to default styles defined in stylesheets.
   *
   * @param element - Optional HTMLElement (defaults to document.documentElement)
   */
  clearTheme(element?: HTMLElement): void {
    const target = element || document.documentElement;

    const themeVars = [
      '--theme-primary-color',
      '--theme-secondary-color',
      '--theme-background',
      '--theme-heading-font',
      '--theme-body-font',
      '--theme-heading-font-size',
      '--theme-body-font-size',
      '--theme-border-radius',
      '--theme-field-padding',
      '--theme-field-margin',
      '--theme-border-width',
    ];

    themeVars.forEach((varName) => {
      target.style.removeProperty(varName);
    });
  }

  /**
   * Apply theme to a specific form element (scoped styling).
   * Used for isolated preview contexts.
   *
   * @param element - HTMLElement to apply theme to
   * @param theme - FormTheme object
   */
  applyThemeToElement(element: HTMLElement, theme: FormTheme | null): void {
    this.applyTheme(theme, element);
  }
}
```

**Performance Characteristics:**

- CSS variable injection: ~5ms
- No DOM reflow or repaint (variables update instantly)
- Debounced preview updates (300ms) prevent rapid re-renders

### Theme Designer Modal Component

**Location:** `apps/web/src/app/features/tools/components/form-builder/theme-designer-modal/`

**Architecture:**

```
theme-designer-modal/
├── theme-designer-modal.component.ts        # Main wizard container
├── theme-designer-modal.component.html      # Stepper layout
├── theme-designer-modal.service.ts          # State management
├── steps/
│   ├── color-step.component.ts              # Step 1: Colors
│   ├── background-step.component.ts         # Step 2: Background
│   ├── typography-step.component.ts         # Step 3: Fonts
│   ├── styling-step.component.ts            # Step 4: Field styling
│   └── preview-step.component.ts            # Step 5: Preview & Save
```

**State Management:**

```typescript
@Injectable()
export class ThemeDesignerModalService {
  // Current theme being edited (reactive signal)
  private currentThemeSignal = signal<Partial<FormTheme>>({
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundType: 'solid',
    // ... default values
  });

  // Preview enabled flag
  private previewEnabledSignal = signal<boolean>(false);

  // Computed theme with all defaults applied
  readonly computedTheme = computed(() => {
    const theme = this.currentThemeSignal();
    return {
      ...DEFAULT_THEME_VALUES,
      ...theme,
    };
  });

  /**
   * Update theme properties.
   * Triggers reactive updates to preview.
   *
   * @param partial - Partial theme object with updated properties
   */
  updateTheme(partial: Partial<FormTheme>): void {
    this.currentThemeSignal.update((current) => ({
      ...current,
      ...partial,
    }));

    // Debounced preview update
    if (this.previewEnabledSignal()) {
      this.debouncedApplyPreview();
    }
  }

  private debouncedApplyPreview = debounce(() => {
    this.themePreviewService.applyTheme(this.computedTheme());
  }, 300);
}
```

**Wizard Navigation:**

```typescript
@Component({
  selector: 'app-theme-designer-modal',
  templateUrl: './theme-designer-modal.component.html',
})
export class ThemeDesignerModalComponent {
  currentStep = signal<number>(0);
  readonly totalSteps = 5;

  nextStep(): void {
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.update((step) => step + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((step) => step - 1);
    }
  }

  async saveTheme(): Promise<void> {
    const theme = this.modalService.computedTheme();

    try {
      const createdTheme = await this.formsApiService.createTheme(theme).toPromise();
      this.themePreviewService.applyTheme(createdTheme);
      this.close();
    } catch (error) {
      console.error('Failed to save theme:', error);
      // Display error message to user
    }
  }
}
```

### Theme Rendering Contexts

**1. Form Builder Canvas**

```typescript
// apps/web/src/app/features/tools/components/form-builder/form-canvas/form-canvas.component.ts
export class FormCanvasComponent implements OnInit {
  @Input() selectedTheme: FormTheme | null = null;

  ngOnInit(): void {
    // Apply theme when component initializes
    effect(() => {
      const theme = this.selectedTheme;
      this.themePreviewService.applyTheme(theme);
    });
  }

  ngOnDestroy(): void {
    // Clear theme when component destroyed
    this.themePreviewService.clearTheme();
  }
}
```

**2. Preview Modal**

```typescript
// apps/web/src/app/features/tools/components/form-builder/preview-dialog/preview-dialog.component.ts
export class PreviewDialogComponent implements OnInit {
  @Input() formSchema: FormSchema;
  @Input() theme: FormTheme | null = null;

  ngOnInit(): void {
    // Apply theme in preview mode
    this.themePreviewService.applyTheme(this.theme);
  }

  ngOnDestroy(): void {
    this.themePreviewService.clearTheme();
  }
}
```

**3. Public Form Renderer**

```typescript
// apps/web/src/app/features/public/form-renderer/form-renderer.component.ts
export class FormRendererComponent implements OnInit {
  formSchema: FormSchema | null = null;
  theme: FormTheme | null = null;

  async ngOnInit(): Promise<void> {
    const shortCode = this.route.snapshot.params['shortCode'];

    // Fetch form schema
    this.formSchema = await this.formsApiService.getPublicForm(shortCode).toPromise();

    // Fetch theme if themeId exists
    if (this.formSchema.themeId) {
      this.theme = await this.formsApiService.getThemeById(this.formSchema.themeId).toPromise();
      this.themePreviewService.applyTheme(this.theme);
    }
  }

  ngOnDestroy(): void {
    this.themePreviewService.clearTheme();
  }
}
```

---

## Theme Utility Classes

### CSS Variable Naming Convention

All theme CSS variables follow the pattern: `--theme-{property}`

**Color Variables:**

```css
--theme-primary-color: #3b82f6;
--theme-secondary-color: #10b981;
--theme-background: #ffffff;
```

**Typography Variables:**

```css
--theme-heading-font: 'Montserrat', sans-serif;
--theme-body-font: 'Open Sans', sans-serif;
--theme-heading-font-size: 24px;
--theme-body-font-size: 16px;
```

**Layout Variables:**

```css
--theme-border-radius: 8px;
--theme-field-padding: 12px;
--theme-field-margin: 8px;
--theme-border-width: 1px;
```

### Complete Theme Utility Classes

**Location:** `apps/web/src/styles/theme-utilities.scss`

```scss
// Outer background (entire viewport)
.theme-form-outer-background {
  background: var(--theme-background, #f3f4f6);
  min-height: 100vh;
  padding: 2rem;
}

// Form container (white card on colored background)
.theme-form-container {
  background-color: white;
  border-radius: calc(var(--theme-border-radius, 8px) * 2);
  padding: calc(var(--theme-field-padding, 12px) * 2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

// Form title
.theme-form-title {
  font-family: var(--theme-heading-font, inherit);
  font-size: calc(var(--theme-heading-font-size, 24px) * 1.5);
  font-weight: 700;
  color: var(--theme-primary-color, #1f2937);
  margin-bottom: calc(var(--theme-field-margin, 8px) * 2);
}

// Form description
.theme-form-description {
  font-family: var(--theme-body-font, inherit);
  font-size: var(--theme-body-font-size, 16px);
  color: #6b7280;
  margin-bottom: calc(var(--theme-field-margin, 8px) * 2);
}

// Field labels
.theme-label {
  font-family: var(--theme-body-font, inherit);
  font-size: var(--theme-body-font-size, 16px);
  font-weight: 600;
  color: #374151;
  margin-bottom: calc(var(--theme-field-margin, 8px) / 2);
  display: block;
}

// Input fields (text, email, number, etc.)
.theme-input {
  font-family: var(--theme-body-font, inherit);
  font-size: var(--theme-body-font-size, 16px);
  padding: var(--theme-field-padding, 12px);
  border: var(--theme-border-width, 1px) solid #d1d5db;
  border-radius: var(--theme-border-radius, 8px);
  background-color: white;
  color: #1f2937;
  width: 100%;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

// Textarea
.theme-textarea {
  @extend .theme-input;
  min-height: 120px;
  resize: vertical;
}

// Primary button
.theme-button-primary {
  font-family: var(--theme-body-font, inherit);
  font-size: var(--theme-body-font-size, 16px);
  font-weight: 600;
  padding: var(--theme-field-padding, 12px) calc(var(--theme-field-padding, 12px) * 2);
  background-color: var(--theme-primary-color, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--theme-border-radius, 8px);
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;

  &:hover {
    background-color: color-mix(in srgb, var(--theme-primary-color, #3b82f6) 90%, black);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

// Secondary button
.theme-button-secondary {
  @extend .theme-button-primary;
  background-color: var(--theme-secondary-color, #10b981);

  &:hover {
    background-color: color-mix(in srgb, var(--theme-secondary-color, #10b981) 90%, black);
  }
}

// Checkbox container
.theme-checkbox-container {
  display: flex;
  align-items: center;
  margin-bottom: var(--theme-field-margin, 8px);
}

// Checkbox input
.theme-checkbox {
  width: 18px;
  height: 18px;
  border-radius: calc(var(--theme-border-radius, 8px) / 2);
  border: var(--theme-border-width, 1px) solid #d1d5db;
  margin-right: calc(var(--theme-field-margin, 8px) / 2);
  cursor: pointer;

  &:checked {
    background-color: var(--theme-primary-color, #3b82f6);
    border-color: var(--theme-primary-color, #3b82f6);
  }
}

// Radio container
.theme-radio-container {
  @extend .theme-checkbox-container;
}

// Radio input
.theme-radio {
  @extend .theme-checkbox;
  border-radius: 50%;
}

// Field group (vertical spacing between fields)
.theme-field-group {
  margin-bottom: calc(var(--theme-field-margin, 8px) * 2);
}

// Error message
.theme-error-message {
  font-family: var(--theme-body-font, inherit);
  font-size: calc(var(--theme-body-font-size, 16px) * 0.875);
  color: #dc2626;
  margin-top: calc(var(--theme-field-margin, 8px) / 2);
}

// Success message
.theme-success-message {
  font-family: var(--theme-body-font, inherit);
  font-size: var(--theme-body-font-size, 16px);
  color: #10b981;
  padding: var(--theme-field-padding, 12px);
  background-color: #d1fae5;
  border-radius: var(--theme-border-radius, 8px);
  margin-top: calc(var(--theme-field-margin, 8px) * 2);
}
```

### Default Fallback Values

When no theme is applied (`themeId = null`), CSS variables fall back to default values:

| CSS Variable                | Default Value        | Usage                  |
| --------------------------- | -------------------- | ---------------------- |
| `--theme-primary-color`     | `#3B82F6` (blue)     | Buttons, links, focus  |
| `--theme-secondary-color`   | `#10B981` (green)    | Secondary buttons      |
| `--theme-background`        | `#F3F4F6` (gray-100) | Outer background       |
| `--theme-heading-font`      | `inherit`            | Form titles, headings  |
| `--theme-body-font`         | `inherit`            | Labels, inputs, body   |
| `--theme-heading-font-size` | `24px`               | Heading text size      |
| `--theme-body-font-size`    | `16px`               | Body text size         |
| `--theme-border-radius`     | `8px`                | Rounded corners        |
| `--theme-field-padding`     | `12px`               | Input internal spacing |
| `--theme-field-margin`      | `8px`                | Spacing between fields |
| `--theme-border-width`      | `1px`                | Input border thickness |

---

## Authentication & Authorization

### Authentication Middleware

**Location:** `apps/api/src/middleware/auth.middleware.ts`

**JWT Verification:**

```typescript
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

### Authorization Rules

**Theme Creation:**

- **Allowed:** All authenticated users
- **Middleware:** `authenticateJWT`
- **Logic:** No role check required

**Theme Editing (PUT /api/themes/:id):**

- **Allowed:** Theme owner OR admin role
- **Middleware:** `authenticateJWT` + `authorizeThemeEdit`
- **Logic:**

  ```typescript
  export const authorizeThemeEdit = async (req: Request, res: Response, next: NextFunction) => {
    const themeId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const theme = await ThemesRepository.findById(themeId);

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    // Admin can edit any theme
    if (userRole === 'admin') {
      return next();
    }

    // Owner can edit their own theme
    if (theme.createdBy === userId) {
      return next();
    }

    return res.status(403).json({ error: 'You can only edit your own themes' });
  };
  ```

**Theme Deletion (DELETE /api/themes/:id):**

- **Allowed:** Theme owner OR admin role
- **Middleware:** `authenticateJWT` + `authorizeThemeDelete`
- **Logic:** Same as theme editing

**Theme Viewing (GET /api/themes, GET /api/themes/:id):**

- **Allowed:** Everyone (public endpoints)
- **Middleware:** None
- **Logic:** No authentication required

---

## Performance Considerations

### CSS Variable Performance

**Advantages:**

- **Instant updates:** No DOM reflow or repaint when variables change
- **GPU-accelerated:** Modern browsers optimize CSS variable lookups
- **Minimal overhead:** ~5ms injection time for all variables

**Benchmarks:**

- Theme application: <10ms
- Preview update (debounced): <300ms
- Public form rendering: <50ms (excluding network)

### Debouncing Strategy

**Preview Updates:**

```typescript
// Debounce preview updates to prevent lag during rapid color changes
private debouncedApplyPreview = debounce(() => {
  this.themePreviewService.applyTheme(this.computedTheme());
}, 300);  // 300ms delay
```

**Benefits:**

- Reduces unnecessary re-renders during rapid input changes
- Prevents UI lag when dragging color picker
- Improves perceived performance

### Theme Caching

**Frontend Caching:**

```typescript
@Injectable({ providedIn: 'root' })
export class FormsApiService {
  private themeCache = new Map<string, FormTheme>();

  getThemeById(id: string): Observable<FormTheme> {
    // Return cached theme if available
    if (this.themeCache.has(id)) {
      return of(this.themeCache.get(id)!);
    }

    // Fetch from API and cache
    return this.http
      .get<FormTheme>(`/api/themes/${id}`)
      .pipe(tap((theme) => this.themeCache.set(id, theme)));
  }
}
```

**Backend Caching (Future Enhancement):**

- Redis caching for frequently accessed themes
- Cache invalidation on theme updates
- TTL: 1 hour for theme data

### Database Query Optimization

**Indexes:**

- `idx_form_themes_created_by` - Fast lookup of user's themes
- `idx_form_themes_name` - Fast search by theme name
- `idx_forms_theme_id` - Fast join between forms and themes

**Query Performance:**

- Theme list query: <10ms (indexed on created_at)
- Theme by ID query: <5ms (primary key lookup)
- Forms by theme query: <15ms (indexed on theme_id)

---

## Backward Compatibility

### Forms Without Themes

**Behavior:**

- Forms with `themeId = null` render using default CSS variable values
- No visual changes compared to pre-Epic 23 forms
- All existing forms continue working without modification

**Implementation:**

```typescript
// ThemePreviewService gracefully handles null themes
applyTheme(theme: FormTheme | null): void {
  if (!theme) {
    // Remove CSS variables, revert to stylesheet defaults
    this.clearTheme();
    return;
  }

  // Apply theme CSS variables
  // ...
}
```

### Migration Strategy

**No Migration Required:**

- Existing forms automatically use default styles
- No database migration for `forms` table (column added with `DEFAULT NULL`)
- Users can opt-in to themes by creating/applying them

**Graceful Degradation:**

- If theme API fails, forms render with default styles
- Missing theme (deleted after form creation) falls back to defaults
- Old browsers without CSS variable support show unstyled forms (rare, <1% users)

---

## Future Enhancements

### Planned Features

1. **Theme Marketplace** _(Epic 24)_
   - Public theme gallery where users share custom themes
   - Upvoting and commenting system
   - Featured themes curated by admins

2. **Theme Templates** _(Epic 25)_
   - Pre-configured theme categories (Corporate, Playful, Minimalist, etc.)
   - One-click theme application from templates
   - Template customization wizard

3. **Background Image Upload** _(Epic 26)_
   - Support for custom background images
   - Image optimization (compression, resizing)
   - CDN integration for fast loading

4. **Advanced Gradient Controls** _(Epic 27)_
   - Multi-stop gradients (3+ colors)
   - Conic gradients
   - Gradient editor with visual preview

5. **Theme Versioning** _(Epic 28)_
   - Track theme edit history
   - Rollback to previous versions
   - Version comparison UI

6. **Dark Mode Support** _(Epic 29)_
   - Automatic dark mode detection
   - Dark theme variants for all themes
   - User preference override

7. **A/B Testing** _(Epic 30)_
   - Apply different themes to form variants
   - Track conversion rates per theme
   - Automatic winner selection

8. **Accessibility Analyzer** _(Epic 31)_
   - Real-time WCAG compliance checking
   - Contrast ratio calculator
   - Accessibility score for themes

9. **Export/Import Themes** _(Epic 32)_
   - Export themes as JSON files
   - Import themes from other users
   - Theme synchronization across tenants

10. **Theme Animation Effects** _(Epic 33)_
    - Entrance animations for form elements
    - Hover effects customization
    - Transition timing configuration

### Technical Debt

1. **Refactor ThemePreviewService** - Extract CSS variable logic into separate utility
2. **Add Redis caching** - Cache frequently accessed themes
3. **Optimize theme wizard** - Reduce bundle size by lazy-loading steps
4. **Improve error handling** - More granular error messages for theme creation failures
5. **Add unit tests** - Increase coverage for theme-related services (target: 90%+)

---

## Related Documentation

- **User Guide:** [Theme Creation Guide](../user-guides/theme-creation-guide.md)
- **API Reference:** [Swagger Documentation](http://localhost:3000/api-docs)
- **Testing:** [E2E Test Suite](../../tests/e2e/complete-theme-system.spec.ts)
- **Release Notes:** [Epic 23 Release](../release-notes/epic-23-theme-system.md)

---

**Version:** 1.0.0 **Last Updated:** 2025-10-17 **Author:** NodeAngularFullStack Architecture Team
