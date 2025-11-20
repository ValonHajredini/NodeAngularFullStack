import { ToolRegistryRecord, ToolStatus, ToolManifest } from '@nodeangularfullstack/shared';

/**
 * Mock tool data for Epic 32.2 integration tests.
 * Uses correct ToolRegistryRecord structure from shared package.
 */

const mockManifest: ToolManifest = {
  routes: {
    primary: '/tools/forms',
    children: ['/tools/forms/create', '/tools/forms/:id/edit'],
  },
  endpoints: {
    base: '/api/forms',
    paths: ['/create', '/:id', '/:id/publish', '/:id/submit'],
  },
  database: {
    tables: ['forms', 'form_schemas', 'form_submissions'],
  },
  components: {
    main: 'FormBuilderComponent',
    supporting: ['FormCanvasComponent', 'FieldPaletteComponent'],
  },
  config: {
    maxFields: 50,
    allowFileUpload: true,
    theme: 'default',
  },
};

export const mockToolActive: ToolRegistryRecord = {
  id: 'uuid-form-builder-001',
  tool_id: 'form-builder',
  name: 'Form Builder',
  description: 'Visual form builder with drag-and-drop interface',
  version: '1.0.0',
  icon: 'pi-file-edit',
  route: '/tools/forms',
  api_base: '/api/forms',
  permissions: ['read', 'write', 'delete'],
  status: ToolStatus.ACTIVE,
  is_exported: false,
  manifest_json: mockManifest,
  created_at: new Date('2024-01-15T10:00:00Z'),
  updated_at: new Date('2024-10-25T15:30:00Z'),
};

export const mockToolInactive: ToolRegistryRecord = {
  id: 'uuid-analytics-pro-002',
  tool_id: 'analytics-pro',
  name: 'Analytics Pro',
  description: 'Advanced analytics and reporting tool',
  version: '2.0.0',
  icon: 'pi-chart-line',
  route: '/tools/analytics',
  api_base: '/api/analytics',
  permissions: ['read', 'admin'],
  status: ToolStatus.BETA, // Beta status instead of active
  is_exported: false,
  manifest_json: {
    routes: { primary: '/tools/analytics' },
    endpoints: { base: '/api/analytics', paths: [] },
  },
  created_at: new Date('2024-02-20T12:00:00Z'),
  updated_at: new Date('2024-10-20T09:00:00Z'),
};

export const mockToolsList: ToolRegistryRecord[] = [
  mockToolActive,
  {
    id: 'uuid-short-link-003',
    tool_id: 'short-link',
    name: 'Short Link Generator',
    description: 'Create short links with QR codes',
    version: '1.2.0',
    icon: 'pi-link',
    route: '/tools/short-links',
    api_base: '/api/short-links',
    permissions: ['read', 'write'],
    status: ToolStatus.ACTIVE,
    is_exported: false,
    manifest_json: {
      routes: { primary: '/tools/short-links' },
      endpoints: { base: '/api/short-links', paths: ['/create', '/:code'] },
      config: { maxLinks: 100 },
    },
    created_at: new Date('2024-03-10T08:00:00Z'),
    updated_at: new Date('2024-10-22T14:00:00Z'),
  },
  mockToolInactive,
];

/**
 * Helper to create mock tool with custom properties.
 */
export function createMockTool(overrides: Partial<ToolRegistryRecord>): ToolRegistryRecord {
  return {
    ...mockToolActive,
    ...overrides,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
  };
}
