# System / Role

You are a senior full‑stack engineer. Produce production‑ready Angular code and a minimal backend
using **Express.js** to build a drag‑and‑drop **Form Builder** and **Form Renderer**. Use **Angular
(v17+), Reactive Forms, Angular CDK DragDrop**, and TypeScript. Favor clean architecture, strict
typing, and accessibility.

# Objective

Build a 2‑page tool:

1. **Form Builder**
   - Canvas (center), Left sidebar (palette), Right sidebar (properties).
   - User drags components from palette onto canvas.
   - The form’s schema is stored as JSON and saved to a database.
   - Selecting a component shows editable properties in the right sidebar (label, name, validators,
     etc.).
   - Reorder fields via drag‑and‑drop.
   - Save drafts and publish final.

2. **Form Renderer**
   - Receives a form JSON (from DB via URL token).
   - Builds an Angular **Reactive Form** dynamically from the JSON.
   - Renders inputs exactly as defined.
   - Captures user input and writes it back into a `values` object inside the JSON without mutating
     the schema portion.
   - Supports submit, validation messages, optional file uploads, and conditional visibility.

# Tech & Libraries

- Angular 17+ with standalone components (Signals allowed).
- `@angular/forms` (Reactive), `@angular/cdk/drag-drop`.
- Styling: Tailwind or SCSS (pick one and be consistent).
- State: lightweight service or signals; avoid heavy state unless needed.
- **Backend: Express.js** with minimal REST routes, tokenized render URLs, and expiry enforcement.

# Functional Requirements

## Form Builder

- **Left Palette**: components such as text, email, number, select, textarea, file, checkbox, radio,
  date, datetime, toggle, section/divider.
- **Canvas**: drop to add; drag to reorder. Show an empty‑state hint when no fields exist.
- **Right Properties** for the selected field:
  - Base: type (convert where safe), label, name (unique), placeholder, help text.
  - Validation: required, min/max, minLength, maxLength, pattern, email/number constraints, accept
    (file types), max files/size.
  - Options (for select/radio): add/edit/reorder items; value/label pairs; allow multi‑select.
  - Behavior: disabled, readonly, default value, conditional visibility rules (`showIf`).
- **Form Settings**: title, description, column count, gutter, submission settings, **render URL**,
  **expiry date/time**.
- **Persistence**: Save drafts and publish. Publishing creates/refreshes a signed token and render
  URL.
- **Validation in Builder**: prevent duplicate `name`s; warn about invalid patterns or missing
  labels; block publish if critical errors exist.

## Form Renderer

- Input via secure tokenized URL. Reject if unpublished or expired.
- Build `FormGroup` dynamically: map schema to controls and validators.
- Handle conditional visibility reactively; when hidden, clear the value.
- UX: inline error messages, disable submit while invalid/submitting, handle file uploads via
  `FormData` (store metadata, not blobs).
- On submit, send only `{ formId, values, meta }` to the backend. Redirect or display success based
  on configuration.

# Backend (Express.js) Requirements

- Provide REST endpoints (no code needed here) such as: create/update form drafts, publish forms
  (issue/refresh signed tokens and render URLs), fetch form by token for rendering, and receive
  submissions.
- Enforce `expiresAt`, validate tokens, rate‑limit public render and submission routes, and
  re‑validate constraints server‑side on submission.
- Sanitize all user‑provided labels/help text and guard against injection. Protect submission
  endpoints against CSRF as appropriate.

# Security & Links

- Signed, unguessable tokens for render URLs.
- Enforce expiry (`expiresAt`) and publication status at fetch time.
- Basic rate‑limiting for both render fetch and submission.
- Do not persist uploaded file blobs within the schema; store references/metadata as needed.

# Accessibility & i18n

- Proper label associations and `aria-describedby` for help/error text.
- Keyboard alternatives for drag‑drop (e.g., up/down reordering).
- Clear, localized validation messages; support RTL where applicable.

# App Structure & Deliverables

- Angular routes:
  - `/builder/:id?` → Form Builder page.
  - `/r/:token` → Form Renderer page.
- Reusable components: palette, canvas, field properties, dynamic field renderer.
- Services:
  - Form schema loading/saving.
  - Publishing to generate tokens and render URLs.
  - Fetching by token for renderer.
- Acceptance criteria:
  - Builder can add/select/edit/delete/reorder fields.
  - Duplicate names are prevented at save/publish time.
  - Published forms render identically to the builder preview.
  - Conditional visibility works and clears hidden values.
  - Expired or invalid tokens show an error page.
  - All inputs have labels and validation messages.
- Nice‑to‑have: undo/redo, grouped sections, import/export JSON, themes, autosave.

# Constraints

- Keep the implementation minimal yet robust. Prefer clarity over cleverness.
- Strict typing and strong validation in both builder and renderer.
- No interface/type dumps in the output of this prompt; focus on the working app and Express.js
  routes/logic.
