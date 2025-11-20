import { TestBed } from '@angular/core/testing';
import { ChartPreferenceService } from './chart-preference.service';
import { ChartType } from '@nodeangularfullstack/shared';

describe('ChartPreferenceService', () => {
  let service: ChartPreferenceService;
  let localStorageSpy: Record<string, jasmine.Spy>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChartPreferenceService);

    // Mock localStorage
    let store: Record<string, string> = {};
    localStorageSpy = {
      getItem: jasmine.createSpy('getItem').and.callFake((key: string) => store[key] || null),
      setItem: jasmine.createSpy('setItem').and.callFake((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jasmine.createSpy('removeItem').and.callFake((key: string) => {
        delete store[key];
      }),
      clear: jasmine.createSpy('clear').and.callFake(() => {
        store = {};
      }),
    };

    spyOn(localStorage, 'getItem').and.callFake(localStorageSpy['getItem']);
    spyOn(localStorage, 'setItem').and.callFake(localStorageSpy['setItem']);
    spyOn(localStorage, 'removeItem').and.callFake(localStorageSpy['removeItem']);
    spyOn(Object, 'keys').and.callFake(() => Object.keys(store));
  });

  afterEach(() => {
    localStorageSpy['clear']();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getChartType', () => {
    it('should return null when no preference exists', () => {
      const result = service.getChartType('form-123', 'field-456');
      expect(result).toBeNull();
      expect(localStorageSpy['getItem']).toHaveBeenCalledWith(
        'analytics-chart-type-form-123-field-456',
      );
    });

    it('should return stored chart type when preference exists', () => {
      localStorageSpy['setItem']('analytics-chart-type-form-123-field-456', JSON.stringify('bar'));
      const result = service.getChartType('form-123', 'field-456');
      expect(result).toBe('bar');
    });

    it('should handle all valid chart types', () => {
      const chartTypes: ChartType[] = [
        'bar',
        'line',
        'pie',
        'polar',
        'radar',
        'area',
        'doughnut',
        'stat',
      ];

      chartTypes.forEach((chartType) => {
        localStorageSpy['setItem'](
          `analytics-chart-type-form-123-field-${chartType}`,
          JSON.stringify(chartType),
        );
        const result = service.getChartType('form-123', `field-${chartType}`);
        expect(result).toBe(chartType);
      });
    });

    it('should return null and log error when JSON parsing fails', () => {
      spyOn(console, 'error');
      localStorageSpy['setItem']('analytics-chart-type-form-123-field-456', 'invalid-json');
      const result = service.getChartType('form-123', 'field-456');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should return null when localStorage throws error', () => {
      spyOn(console, 'error');
      localStorageSpy['getItem'].and.throwError('localStorage unavailable');
      const result = service.getChartType('form-123', 'field-456');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setChartType', () => {
    it('should store chart type preference in localStorage', () => {
      service.setChartType('form-123', 'field-456', 'bar');
      expect(localStorageSpy['setItem']).toHaveBeenCalledWith(
        'analytics-chart-type-form-123-field-456',
        JSON.stringify('bar'),
      );
    });

    it('should overwrite existing preference', () => {
      service.setChartType('form-123', 'field-456', 'bar');
      service.setChartType('form-123', 'field-456', 'line');
      const result = service.getChartType('form-123', 'field-456');
      expect(result).toBe('line');
    });

    it('should throw error when localStorage quota is exceeded', () => {
      spyOn(console, 'error');
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      localStorageSpy['setItem'].and.throwError(quotaError);

      expect(() => service.setChartType('form-123', 'field-456', 'bar')).toThrowError(
        'Storage quota exceeded. Please clear some preferences.',
      );
      expect(console.error).toHaveBeenCalled();
    });

    it('should rethrow non-quota errors', () => {
      spyOn(console, 'error');
      const genericError = new Error('Generic localStorage error');
      localStorageSpy['setItem'].and.throwError(genericError);

      expect(() => service.setChartType('form-123', 'field-456', 'bar')).toThrow(genericError);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('clearChartTypes', () => {
    it('should remove all preferences for a specific form', () => {
      // Set up preferences for multiple forms and fields
      localStorageSpy['setItem']('analytics-chart-type-form-123-field-1', JSON.stringify('bar'));
      localStorageSpy['setItem']('analytics-chart-type-form-123-field-2', JSON.stringify('line'));
      localStorageSpy['setItem']('analytics-chart-type-form-456-field-1', JSON.stringify('pie'));
      localStorageSpy['setItem']('other-key', 'other-value');

      service.clearChartTypes('form-123');

      expect(localStorageSpy['removeItem']).toHaveBeenCalledWith(
        'analytics-chart-type-form-123-field-1',
      );
      expect(localStorageSpy['removeItem']).toHaveBeenCalledWith(
        'analytics-chart-type-form-123-field-2',
      );
      expect(localStorageSpy['removeItem']).not.toHaveBeenCalledWith(
        'analytics-chart-type-form-456-field-1',
      );
      expect(localStorageSpy['removeItem']).not.toHaveBeenCalledWith('other-key');
    });

    it('should handle errors gracefully when clearing preferences', () => {
      spyOn(console, 'error');
      (Object.keys as jasmine.Spy).and.throwError('Error accessing localStorage');

      expect(() => service.clearChartTypes('form-123')).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('clearAllChartTypes', () => {
    it('should remove all chart type preferences', () => {
      // Set up preferences for multiple forms
      localStorageSpy['setItem']('analytics-chart-type-form-123-field-1', JSON.stringify('bar'));
      localStorageSpy['setItem']('analytics-chart-type-form-456-field-1', JSON.stringify('line'));
      localStorageSpy['setItem']('analytics-chart-type-form-789-field-1', JSON.stringify('pie'));
      localStorageSpy['setItem']('other-key', 'other-value');

      service.clearAllChartTypes();

      expect(localStorageSpy['removeItem']).toHaveBeenCalledWith(
        'analytics-chart-type-form-123-field-1',
      );
      expect(localStorageSpy['removeItem']).toHaveBeenCalledWith(
        'analytics-chart-type-form-456-field-1',
      );
      expect(localStorageSpy['removeItem']).toHaveBeenCalledWith(
        'analytics-chart-type-form-789-field-1',
      );
      expect(localStorageSpy['removeItem']).not.toHaveBeenCalledWith('other-key');
    });

    it('should handle errors gracefully when clearing all preferences', () => {
      spyOn(console, 'error');
      (Object.keys as jasmine.Spy).and.throwError('Error accessing localStorage');

      expect(() => service.clearAllChartTypes()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string formId', () => {
      const result = service.getChartType('', 'field-456');
      expect(localStorageSpy['getItem']).toHaveBeenCalledWith('analytics-chart-type--field-456');
    });

    it('should handle empty string fieldId', () => {
      const result = service.getChartType('form-123', '');
      expect(localStorageSpy['getItem']).toHaveBeenCalledWith('analytics-chart-type-form-123-');
    });

    it('should handle special characters in IDs', () => {
      const formId = 'form-123!@#$%';
      const fieldId = 'field-456^&*()';
      service.setChartType(formId, fieldId, 'bar');
      const result = service.getChartType(formId, fieldId);
      expect(result).toBe('bar');
    });
  });
});
