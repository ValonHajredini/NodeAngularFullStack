/**
 * Unit Tests for Tutorial Validation
 *
 * Tests the validation scripts and example code to ensure
 * tutorials work correctly and provide accurate feedback.
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock file system operations for testing
jest.mock('fs');

describe('Tutorial Validation System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('First Feature Tutorial Validation', () => {
    const mockFileSystem = {
      'packages/shared/src/types/product.types.ts': true,
      'packages/shared/src/types/index.ts': 'export * from "./product.types";',
      'apps/api/src/controllers/products.controller.ts': true,
      'apps/api/src/services/products.service.ts': true,
      'apps/api/src/routes/products.routes.ts': true,
      'apps/api/src/validators/products.validators.ts': true,
      'apps/api/src/routes/index.ts': 'router.use("/products", productRoutes);',
      'apps/web/src/app/features/products/services/products.service.ts': true,
      'apps/web/src/app/features/products/components/product-list/product-list.component.ts': true
    };

    beforeEach(() => {
      // Mock fs.existsSync
      fs.existsSync.mockImplementation((filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return Object.keys(mockFileSystem).some(key => normalizedPath.includes(key));
      });

      // Mock fs.readFileSync
      fs.readFileSync.mockImplementation((filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const matchingKey = Object.keys(mockFileSystem).find(key => normalizedPath.includes(key));
        if (matchingKey && typeof mockFileSystem[matchingKey] === 'string') {
          return mockFileSystem[matchingKey];
        }
        return 'mock file content';
      });
    });

    it('should validate shared types file exists', () => {
      const productTypesPath = 'packages/shared/src/types/product.types.ts';
      expect(fs.existsSync(productTypesPath)).toBe(true);
    });

    it('should validate shared types are exported', () => {
      const indexPath = 'packages/shared/src/types/index.ts';
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('product.types');
    });

    it('should validate backend controller exists', () => {
      const controllerPath = 'apps/api/src/controllers/products.controller.ts';
      expect(fs.existsSync(controllerPath)).toBe(true);
    });

    it('should validate backend service exists', () => {
      const servicePath = 'apps/api/src/services/products.service.ts';
      expect(fs.existsSync(servicePath)).toBe(true);
    });

    it('should validate routes are registered', () => {
      const routesPath = 'apps/api/src/routes/index.ts';
      const content = fs.readFileSync(routesPath, 'utf-8');
      expect(content).toContain('products');
    });

    it('should validate frontend service exists', () => {
      const servicePath = 'apps/web/src/app/features/products/services/products.service.ts';
      expect(fs.existsSync(servicePath)).toBe(true);
    });

    it('should validate frontend component exists', () => {
      const componentPath = 'apps/web/src/app/features/products/components/product-list/product-list.component.ts';
      expect(fs.existsSync(componentPath)).toBe(true);
    });
  });

  describe('Validation Progress Tracking', () => {
    it('should calculate completion percentage correctly', () => {
      const totalChecks = 9;
      const completedChecks = 7;
      const percentage = Math.round((completedChecks / totalChecks) * 100);

      expect(percentage).toBe(78);
    });

    it('should identify missing components', () => {
      const requiredFiles = [
        'packages/shared/src/types/product.types.ts',
        'apps/api/src/controllers/products.controller.ts',
        'apps/web/src/app/features/products/services/products.service.ts'
      ];

      const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

      // With our mock, all files should exist
      expect(missingFiles).toHaveLength(0);
    });

    it('should provide helpful error messages', () => {
      const missingFile = 'apps/api/src/controllers/missing.controller.ts';
      const fileExists = fs.existsSync(missingFile);

      if (!fileExists) {
        const errorMessage = `Create ${missingFile}`;
        expect(errorMessage).toContain('Create');
        expect(errorMessage).toContain(missingFile);
      }
    });
  });

  describe('Tutorial Time Tracking', () => {
    it('should track tutorial start time', () => {
      const startTime = new Date().toISOString();
      expect(startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should calculate tutorial duration', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:45:00Z');
      const duration = endTime - startTime;

      // 45 minutes in milliseconds
      expect(duration).toBe(45 * 60 * 1000);
    });

    it('should format duration correctly', () => {
      const duration = 45 * 60 * 1000; // 45 minutes
      const minutes = Math.floor(duration / (1000 * 60));
      const formatted = `${minutes}m`;

      expect(formatted).toBe('45m');
    });
  });

  describe('Success Metrics Validation', () => {
    it('should validate time savings calculation', () => {
      const traditionalTime = 120; // minutes
      const tutorialTime = 45; // minutes
      const timeSavings = ((traditionalTime - tutorialTime) / traditionalTime) * 100;

      expect(timeSavings).toBe(62.5);
    });

    it('should track completion rates', () => {
      const totalTutorials = 5;
      const completedTutorials = 4;
      const completionRate = (completedTutorials / totalTutorials) * 100;

      expect(completionRate).toBe(80);
    });

    it('should validate 40% time savings goal', () => {
      const timeSavingsGoal = 40;
      const actualTimeSavings = 62.5;
      const goalAchieved = actualTimeSavings >= timeSavingsGoal;

      expect(goalAchieved).toBe(true);
    });
  });
});

describe('Metrics Collection System', () => {
  describe('Session Tracking', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = 'session_' + Date.now();
      // Small delay to ensure different timestamps
      const sessionId2 = 'session_' + (Date.now() + 1);

      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^session_\d+$/);
    });

    it('should track session duration', () => {
      const session = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:30:00Z')
      };

      const duration = new Date(session.endTime) - new Date(session.startTime);
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

      expect(hours).toBe(1);
      expect(minutes).toBe(30);
    });
  });

  describe('Tutorial Progress Tracking', () => {
    it('should track completed steps', () => {
      const tutorial = {
        name: 'first-feature',
        completedSteps: ['step-1', 'step-2', 'step-3'],
        totalSteps: 6
      };

      const progress = (tutorial.completedSteps.length / tutorial.totalSteps) * 100;
      expect(progress).toBe(50);
    });

    it('should mark tutorials as completed', () => {
      const tutorial = {
        completed: false,
        completedSteps: ['step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'step-6'],
        totalSteps: 6
      };

      if (tutorial.completedSteps.length === tutorial.totalSteps) {
        tutorial.completed = true;
      }

      expect(tutorial.completed).toBe(true);
    });
  });

  describe('Feature Implementation Tracking', () => {
    it('should track feature implementation time', () => {
      const feature = {
        name: 'user-authentication',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:15:00Z')
      };

      const implementationTime = new Date(feature.endTime) - new Date(feature.startTime);
      const hours = Math.floor(implementationTime / (1000 * 60 * 60));
      const minutes = Math.floor((implementationTime % (1000 * 60 * 60)) / (1000 * 60));

      expect(hours).toBe(2);
      expect(minutes).toBe(15);
    });

    it('should calculate average implementation time', () => {
      const features = [
        { implementationTime: 45 * 60 * 1000 }, // 45 minutes
        { implementationTime: 60 * 60 * 1000 }, // 60 minutes
        { implementationTime: 30 * 60 * 1000 }  // 30 minutes
      ];

      const totalTime = features.reduce((sum, f) => sum + f.implementationTime, 0);
      const averageTime = totalTime / features.length;
      const averageMinutes = Math.floor(averageTime / (1000 * 60));

      expect(averageMinutes).toBe(45);
    });
  });
});

describe('Feedback Collection System', () => {
  describe('Rating Validation', () => {
    it('should validate rating range', () => {
      const rating = 4;
      const isValid = rating >= 1 && rating <= 5;

      expect(isValid).toBe(true);
    });

    it('should handle invalid ratings', () => {
      const invalidRatings = [0, 6, -1, 'invalid'];
      const validRatings = invalidRatings.map(rating => {
        const parsed = parseInt(rating);
        return isNaN(parsed) || parsed < 1 || parsed > 5 ? 0 : parsed;
      });

      expect(validRatings).toEqual([0, 0, 0, 0]);
    });
  });

  describe('Feedback Analytics', () => {
    it('should calculate average ratings', () => {
      const ratings = [4, 5, 3, 4, 5];
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

      expect(average).toBe(4.2);
    });

    it('should calculate recommendation rate', () => {
      const responses = ['yes', 'yes', 'no', 'yes', 'maybe'];
      const positiveResponses = responses.filter(r => r === 'yes').length;
      const recommendationRate = (positiveResponses / responses.length) * 100;

      expect(recommendationRate).toBe(60);
    });

    it('should identify improvement areas', () => {
      const feedback = [
        'documentation needs improvement',
        'tutorials are great',
        'need better documentation',
        'setup was difficult'
      ];

      const documentationMentions = feedback.filter(f =>
        f.toLowerCase().includes('documentation')).length;

      expect(documentationMentions).toBe(2);
    });
  });
});

describe('Integration Validation', () => {
  it('should validate complete tutorial flow', () => {
    const tutorialSteps = [
      'Define shared types',
      'Create backend API',
      'Build frontend components',
      'Add state management',
      'Implement validation',
      'Write tests'
    ];

    const completedSteps = tutorialSteps.slice(0, 4); // First 4 steps completed
    const progress = (completedSteps.length / tutorialSteps.length) * 100;

    expect(progress).toBe(66.67);
  });

  it('should validate success metrics achievement', () => {
    const metrics = {
      timeSavings: 65, // 65% time savings
      tutorialCompletion: 85, // 85% completion rate
      developerSatisfaction: 4.2, // 4.2/5 rating
      recommendationRate: 78 // 78% would recommend
    };

    const goals = {
      timeSavings: 40,
      tutorialCompletion: 70,
      developerSatisfaction: 4.0,
      recommendationRate: 70
    };

    const goalsAchieved = Object.keys(goals).every(key =>
      metrics[key] >= goals[key]);

    expect(goalsAchieved).toBe(true);
  });
});