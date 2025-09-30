# Epic 9: SVG Drawing Canvas Tool - Brownfield Enhancement

## Epic Goal

Build a full-featured SVG drawing canvas within the existing tools feature that enables users to
draw geometric shapes (lines, polygons) with intelligent snap guides for perfect horizontal/vertical
alignment, real-time angle indicators, and SVG export functionality with multiple polygon support.

---

## Epic Description

### Existing System Context

- **Current relevant functionality**: Tools feature with scaffolded svg-drawing component containing
  basic structure (component, service, template) following established Angular patterns
- **Technology stack**: Angular 20+ standalone components, PrimeNG 17+ UI library, TypeScript strict
  mode, Signals for state management, Tailwind CSS
- **Integration points**:
  - Tool container component wraps all tool implementations
  - Shared component patterns (CardModule, ButtonModule, MessageModule)
  - Service layer for business logic
  - Existing tools follow consistent structure (map, calendar, todo-app, mark, short-link)

### Enhancement Details

**What's being added/changed:**

- Full-page canvas drawing surface with HTML5 Canvas or SVG element
- Drawing capabilities: freehand lines and geometric polygons
- Smart guides showing perfect horizontal/vertical alignment during drawing
- Real-time angle indicator displaying line angles while drawing
- Reusable sub-components in dedicated `components/` subdirectory:
  - Canvas renderer component
  - Drawing toolbar component
  - Shape properties panel
  - Guide overlay component
- SVG export functionality producing clean multi-polygon SVG files
- Tool state management using Angular Signals
- Persistent drawing state (optional localStorage integration)

**How it integrates:**

- Extends existing svg-drawing component scaffold
- Follows established tool component patterns
- Maintains PrimeNG + Tailwind styling consistency
- Uses existing service layer architecture
- Integrates with tool routing and navigation

**Success criteria:**

- Full-width/height responsive canvas with smooth drawing experience
- Horizontal/vertical snap guides activate within 5° threshold
- Angle indicator displays in real-time with 1° precision
- SVG export generates valid, clean multi-polygon SVG files
- All reusable components isolated in subdirectory structure
- No regression in existing tools functionality
- Performance remains smooth with 50+ drawn shapes

---

## Stories

### Story 1: Canvas Drawing Surface & Line Drawing with Smart Guides

**Objective**: Implement full-viewport responsive canvas component with line drawing functionality
and intelligent snap guides.

**Implementation Details**:

- Create full-viewport responsive canvas component
- Implement line drawing with mouse/touch event handling
- Add horizontal/vertical snap guides (visual indicators when within 5° of 0°/90°/180°/270°)
- Display real-time angle indicator during line drawing
- Create reusable canvas renderer component in `components/` subdirectory
- Implement basic drawing state management with Angular Signals

**Acceptance Criteria**:

- Canvas fills viewport and responds to window resize
- Lines can be drawn smoothly with mouse drag
- Snap guides appear when line angle is within 5° of horizontal/vertical
- Angle indicator shows current line angle with 1° precision
- Drawing state persists during component lifecycle

---

### Story 2: Polygon Drawing, Shape Management & Reusable Components

**Objective**: Add polygon drawing capabilities, shape management, and build reusable UI components
for the drawing tool.

**Implementation Details**:

- Implement polygon drawing tool (click to add vertices, double-click/ESC to close)
- Create shape selection and editing capabilities
- Build reusable toolbar component with tool selection (line/polygon/select/delete)
- Build shape properties panel component
- Add undo/redo functionality using command pattern
- Implement shape styling options (stroke color, width, fill)

**Acceptance Criteria**:

- Users can draw polygons by clicking vertices
- Shapes can be selected and edited after creation
- Toolbar provides clear tool selection interface
- Undo/redo works for all drawing operations
- Shape properties can be modified (color, stroke width, fill)
- All UI components are properly isolated in subdirectory

---

### Story 3: SVG Export & Polish

**Objective**: Implement SVG export functionality and polish the user experience with additional
features.

**Implementation Details**:

- Implement SVG export functionality generating clean multi-polygon SVG
- Add export options panel (filename, dimensions, optimization level)
- Create guide overlay component with configurable snap settings
- Add keyboard shortcuts (ESC, Delete, Ctrl+Z/Y, Ctrl+S for export)
- Implement localStorage persistence for drawing state
- Polish UI/UX with loading states, tooltips, and help panel

**Acceptance Criteria**:

- SVG export generates valid, browser-renderable files
- Export options allow customization of output
- Keyboard shortcuts work as documented
- Drawing state persists across browser sessions
- Help panel documents all features and shortcuts
- UI polish matches existing tools standards

---

## Compatibility Requirements

- [x] Existing APIs remain unchanged (no backend changes required)
- [x] Database schema changes are backward compatible (no DB changes needed)
- [x] UI changes follow existing patterns (PrimeNG + Tailwind, standalone components)
- [x] Performance impact is minimal (canvas operations are client-side only)
- [x] Tool routing and navigation remain compatible with existing tools structure

---

## Risk Mitigation

**Primary Risk**: Canvas performance degradation with complex drawings containing many shapes (50+
polygons)

**Mitigation**:

- Implement shape culling/viewport optimization
- Use requestAnimationFrame for smooth rendering
- Lazy-load guide calculations only during active drawing
- Throttle mouse move events (16ms/60fps max)
- Add performance monitoring and shape count warnings

**Rollback Plan**:

- Feature flag in component template allows instant disable
- No database migrations to reverse
- Component isolation ensures no impact on other tools
- Can revert to scaffolded component in single commit

---

## Definition of Done

- [ ] All stories completed with acceptance criteria met
- [ ] Existing tools functionality verified through E2E tests
- [ ] Integration with tool container working correctly
- [ ] Component documentation updated (JSDoc comments)
- [ ] No regression in existing features (verified via test suite)
- [ ] Canvas rendering performs smoothly with 50+ shapes
- [ ] SVG export generates valid, browser-renderable files
- [ ] Keyboard shortcuts documented in help panel
- [ ] Responsive design works on desktop viewports (1024px+)

---

## Technical Architecture

### Component Structure

```
apps/web/src/app/features/tools/components/svg-drawing/
├── svg-drawing.component.ts          # Main component
├── svg-drawing.service.ts            # Business logic service
├── svg-drawing.component.spec.ts     # Unit tests
└── components/                       # Reusable sub-components
    ├── canvas-renderer/
    │   ├── canvas-renderer.component.ts
    │   └── canvas-renderer.component.spec.ts
    ├── drawing-toolbar/
    │   ├── drawing-toolbar.component.ts
    │   └── drawing-toolbar.component.spec.ts
    ├── shape-properties/
    │   ├── shape-properties.component.ts
    │   └── shape-properties.component.spec.ts
    └── guide-overlay/
        ├── guide-overlay.component.ts
        └── guide-overlay.component.spec.ts
```

### State Management

```typescript
// Drawing state using Angular Signals
interface DrawingState {
  shapes: Shape[];
  selectedShapeId: string | null;
  currentTool: 'line' | 'polygon' | 'select';
  isDrawing: boolean;
  snapEnabled: boolean;
  snapThreshold: number;
}
```

### Key Technologies

- **HTML5 Canvas API** or **SVG** for rendering
- **Angular Signals** for reactive state management
- **Command Pattern** for undo/redo functionality
- **localStorage API** for persistence
- **PrimeNG** UI components (Button, Toolbar, ColorPicker, etc.)
- **Tailwind CSS** for styling

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running **Angular 20+ with standalone components,
  PrimeNG 17+, TypeScript strict mode, and Signals state management**
- Integration points:
  - Tool container component (`tool-container.component.ts`)
  - Existing tool service pattern (`svg-drawing.service.ts`)
  - PrimeNG CardModule, ButtonModule, MessageModule
  - Tailwind CSS styling system
- Existing patterns to follow:
  - Component + Service architecture with dependency injection
  - Signals for reactive state management
  - OnPush change detection strategy
  - Standalone component imports
  - Tools routing configuration
- Critical compatibility requirements:
  - Must maintain existing tool component interface
  - No breaking changes to tool routing
  - Follow established PrimeNG + Tailwind styling
  - Maintain performance standards of existing tools
- Each story must include verification that existing functionality remains intact (E2E test
  coverage)

The epic should maintain system integrity while delivering **a professional SVG drawing canvas with
intelligent guides, real-time feedback, and clean SVG export capabilities**."

---

## Related Documentation

- [Epic 7: Tools Feature System](epic-7-tools-feature-system.md)
- [Epic 8: Enhanced Admin Tool Registration](epic-8-enhanced-admin-tool-registration.md)
- Angular Documentation: [Signals](https://angular.dev/guide/signals)
- Canvas API:
  [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)

---

_Epic Status: Planning_ _Created: 2025-09-30_ _Last Updated: 2025-09-30_
