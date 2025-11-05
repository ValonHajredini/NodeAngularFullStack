# Short Link Reusable Components

This directory contains reusable components extracted from the main short-link component.

## Component Architecture

```
components/
├── url-input/                    # URL input with validation
├── custom-name-input/            # Custom name input with availability check
├── qr-code-display/              # QR code display with download
├── short-link-result/            # Result card for created short link
├── link-item-card/               # Single link item display
├── recent-links-list/            # List of recent links
├── index.ts                      # Barrel export
└── README.md                     # This file
```

## Components

### 1. UrlInputComponent (`url-input/url-input.component.ts`)

**Purpose**: Reusable URL input field with built-in validation.

**Features**:

- Implements ControlValueAccessor for reactive forms integration
- URL validation (http/https protocol required)
- Maximum length validation
- Required field support
- Touch state tracking

**Inputs**:

- `label`: string (default: 'URL')
- `placeholder`: string (default: 'https://example.com')
- `required`: boolean (default: false)
- `inputId`: string (default: 'url-input')

**Usage**:

```typescript
<app-url-input
  formControlName="originalUrl"
  label="URL to Shorten"
  [required]="true"
  placeholder="https://example.com/very/long/url"
/>
```

---

### 2. CustomNameInputComponent (`custom-name-input/custom-name-input.component.ts`)

**Purpose**: Custom name input with real-time availability checking.

**Features**:

- Implements ControlValueAccessor
- Real-time availability check with debounce (500ms)
- Visual feedback (spinner, checkmark, x-mark)
- Live preview of generated URL
- Pattern validation (alphanumeric + hyphens only)
- Length validation (3-30 characters)

**Inputs**:

- `label`: string (default: 'Custom Link Name (Optional)')
- `placeholder`: string (default: 'my-custom-link')
- `helperText`: string
- `inputId`: string (default: 'custom-name-input')
- `baseUrl`: string (for preview generation)

**Outputs**:

- `checkAvailability`: EventEmitter<string> - Emits when availability check needed

**Methods**:

- `setAvailability(available: boolean, error?: string)`: Called by parent to update availability state

**Usage**:

```typescript
<app-custom-name-input
  formControlName="customName"
  [baseUrl]="baseUrl"
  (checkAvailability)="handleCheckAvailability($event)"
  #customNameInput
/>

// In component:
handleCheckAvailability(customName: string): void {
  this.service.checkAvailability(customName).subscribe(result => {
    this.customNameInput.setAvailability(result.available, result.error);
  });
}
```

---

### 3. QrCodeDisplayComponent (`qr-code-display/qr-code-display.component.ts`)

**Purpose**: Display QR code with download functionality.

**Features**:

- Displays QR code image
- Download button with tooltip
- Conditional rendering (only shows if QR code exists)
- Customizable styling

**Inputs**:

- `qrCodeDataUrl`: string | null
- `label`: string (default: 'QR Code:')
- `altText`: string (default: 'QR Code')
- `helperText`: string (default: 'Scan to open link')
- `downloadTooltip`: string (default: 'Download QR Code')
- `imageClass`: string (default: 'w-48 h-48 border border-gray-200 rounded')

**Outputs**:

- `download`: EventEmitter<void> - Emitted when download button clicked

**Usage**:

```typescript
<app-qr-code-display
  [qrCodeDataUrl]="qrCodeDataUrl()"
  (download)="downloadQRCode()"
/>
```

---

### 4. ShortLinkResultComponent (`short-link-result/short-link-result.component.ts`)

**Purpose**: Display created short link with QR code and metadata.

**Features**:

- Shows short URL in copyable format
- Displays original URL
- Shows expiration date if applicable
- Integrates QR code display
- Copy to clipboard functionality

**Inputs**:

- `shortLink`: ShortLink | null
- `generatedShortUrl`: string
- `qrCodeDataUrl`: string | null
- `title`: string (default: 'Short Link Created')

**Outputs**:

- `copy`: EventEmitter<void> - Copy short URL
- `downloadQR`: EventEmitter<void> - Download QR code

**Usage**:

```typescript
<app-short-link-result
  [shortLink]="createdShortLink()"
  [generatedShortUrl]="generatedShortUrl()"
  [qrCodeDataUrl]="qrCodeDataUrl()"
  (copy)="copyShortUrl()"
  (downloadQR)="downloadQRCode()"
/>
```

---

### 5. LinkItemCardComponent (`link-item-card/link-item-card.component.ts`)

**Purpose**: Display a single short link in card format.

**Features**:

- Shows short URL with copy button
- Displays original URL (truncated with tooltip)
- Shows metadata (creation date, click count)
- Expiration status badge
- Hover effects

**Inputs**:

- `link`: ShortLink (required)
- `shortUrl`: string
- `maxUrlLength`: number (default: 80)

**Outputs**:

- `copy`: EventEmitter<void> - Copy link

**Computed Properties**:

- `expirationStatus`: 'Active' | 'Expires Soon' | 'Expired'
- `expirationSeverity`: 'success' | 'warning' | 'danger'

**Usage**:

```typescript
<app-link-item-card
  [link]="link"
  [shortUrl]="generateShortUrl(link.code)"
  (copy)="copyLink(link.code)"
/>
```

---

### 6. RecentLinksListComponent (`recent-links-list/recent-links-list.component.ts`)

**Purpose**: Display list of recent short links with refresh capability.

**Features**:

- Card container with header
- List of link items
- Empty state with call-to-action
- Refresh functionality
- Uses LinkItemCardComponent for each item

**Inputs**:

- `links`: ShortLink[]
- `title`: string (default: 'Recent Short Links')
- `emptyTitle`: string (default: 'No Recent Short Links')
- `emptyMessage`: string
- `refreshTooltip`: string (default: 'Refresh list')
- `refreshButtonLabel`: string (default: 'Refresh')
- `urlGenerator`: ((code: string) => string) | null - Function to generate URLs

**Outputs**:

- `refresh`: EventEmitter<void> - Refresh list
- `copyLink`: EventEmitter<string> - Copy link by code

**Usage**:

```typescript
<app-recent-links-list
  [links]="recentLinks()"
  [urlGenerator]="generateShortUrl.bind(this)"
  (refresh)="refreshLinks()"
  (copyLink)="copyShortUrlByCode($event)"
/>
```

---

## Component Hierarchy

```
ShortLinkComponent (Main)
├── UrlInputComponent
├── CustomNameInputComponent
├── ShortLinkResultComponent
│   └── QrCodeDisplayComponent
└── RecentLinksListComponent
    └── LinkItemCardComponent (multiple)
```

## Benefits of This Architecture

1. **Reusability**: Each component can be used independently in other features
2. **Maintainability**: Changes to UI or logic are isolated to specific components
3. **Testability**: Each component can be tested in isolation
4. **Readability**: Main component template is much cleaner and easier to understand
5. **Separation of Concerns**: Each component handles a specific UI concern
6. **Type Safety**: Full TypeScript support with proper typing

## Migration Guide

To use the refactored version:

1. **Import the refactored component**:

   ```typescript
   import { ShortLinkRefactoredComponent } from './short-link-refactored.component';
   ```

2. **Or use individual components**:

   ```typescript
   import {
     UrlInputComponent,
     CustomNameInputComponent,
     QrCodeDisplayComponent,
     ShortLinkResultComponent,
     LinkItemCardComponent,
     RecentLinksListComponent,
   } from './components';
   ```

3. **Update routes** (if applicable):
   ```typescript
   {
     path: 'short-link',
     component: ShortLinkRefactoredComponent
   }
   ```

## Testing

Each component should have corresponding spec files:

```
components/
├── url-input/
│   ├── url-input.component.ts
│   └── url-input.component.spec.ts
├── custom-name-input/
│   ├── custom-name-input.component.ts
│   └── custom-name-input.component.spec.ts
└── ...
```

## Future Enhancements

- Add unit tests for all components
- Add E2E tests for component interactions
- Consider adding Storybook stories for visual testing
- Add accessibility (a11y) improvements
- Add internationalization (i18n) support
