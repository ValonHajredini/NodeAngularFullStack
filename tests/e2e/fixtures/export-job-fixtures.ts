import { ExportJob, ExportStep } from '../../../apps/web/src/app/features/tools/services/export-job.service';

/**
 * Mock export job data for Epic 32.2 integration tests.
 */

export const mockExportSteps: ExportStep[] = [
  {
    name: 'Pre-flight Checks',
    status: 'completed',
    message: 'Validation complete',
    startedAt: '2024-10-25T10:00:00Z',
    completedAt: '2024-10-25T10:00:05Z',
  },
  {
    name: 'Backend Generation',
    status: 'in_progress',
    message: 'Generating Express.js controllers...',
    startedAt: '2024-10-25T10:00:05Z',
  },
  {
    name: 'Frontend Generation',
    status: 'pending',
  },
  {
    name: 'Database Migration',
    status: 'pending',
  },
  {
    name: 'Infrastructure Setup',
    status: 'pending',
  },
  {
    name: 'Health Checks',
    status: 'pending',
  },
];

export const mockExportJobPending: ExportJob = {
  jobId: 'job-123-pending',
  toolId: 'form-builder',
  status: 'pending',
  stepsCompleted: 0,
  stepsTotal: 6,
  currentStep: 'Initializing...',
  steps: mockExportSteps.map(s => ({ ...s, status: 'pending' })),
  progress: 0,
  createdAt: '2024-10-25T10:00:00Z',
  updatedAt: '2024-10-25T10:00:00Z',
};

export const mockExportJobInProgress: ExportJob = {
  jobId: 'job-456-in-progress',
  toolId: 'form-builder',
  status: 'in_progress',
  stepsCompleted: 2,
  stepsTotal: 6,
  currentStep: 'Frontend Generation',
  steps: mockExportSteps,
  progress: 33,
  createdAt: '2024-10-25T10:00:00Z',
  updatedAt: '2024-10-25T10:01:30Z',
};

export const mockExportJobCompleted: ExportJob = {
  jobId: 'job-789-completed',
  toolId: 'form-builder',
  status: 'completed',
  stepsCompleted: 6,
  stepsTotal: 6,
  currentStep: 'Health Checks',
  steps: mockExportSteps.map(s => ({ ...s, status: 'completed', completedAt: '2024-10-25T10:05:00Z' })),
  progress: 100,
  createdAt: '2024-10-25T10:00:00Z',
  updatedAt: '2024-10-25T10:05:00Z',
  completedAt: '2024-10-25T10:05:00Z',
  exportPackageUrl: 'https://example.com/exports/form-builder-export.zip',
};

export const mockExportJobFailed: ExportJob = {
  jobId: 'job-999-failed',
  toolId: 'form-builder',
  status: 'failed',
  stepsCompleted: 3,
  stepsTotal: 6,
  currentStep: 'Database Migration',
  steps: [
    ...mockExportSteps.slice(0, 3).map(s => ({ ...s, status: 'completed' as const })),
    { ...mockExportSteps[3], status: 'failed' as const, message: 'Migration script error' },
    ...mockExportSteps.slice(4).map(s => ({ ...s, status: 'pending' as const })),
  ],
  progress: 50,
  createdAt: '2024-10-25T10:00:00Z',
  updatedAt: '2024-10-25T10:03:00Z',
  errorMessage: 'Database migration failed: Table already exists',
};

/**
 * Simulates progressive export job updates for polling tests.
 */
export const mockExportJobProgressSequence: ExportJob[] = [
  { ...mockExportJobPending, progress: 0, stepsCompleted: 0 },
  { ...mockExportJobInProgress, progress: 17, stepsCompleted: 1, currentStep: 'Pre-flight Checks' },
  { ...mockExportJobInProgress, progress: 33, stepsCompleted: 2, currentStep: 'Backend Generation' },
  { ...mockExportJobInProgress, progress: 50, stepsCompleted: 3, currentStep: 'Frontend Generation' },
  { ...mockExportJobInProgress, progress: 67, stepsCompleted: 4, currentStep: 'Database Migration' },
  { ...mockExportJobInProgress, progress: 83, stepsCompleted: 5, currentStep: 'Infrastructure Setup' },
  { ...mockExportJobCompleted, progress: 100, stepsCompleted: 6, currentStep: 'Health Checks' },
];
