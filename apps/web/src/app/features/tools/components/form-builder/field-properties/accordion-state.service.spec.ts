import { TestBed } from '@angular/core/testing';
import { AccordionStateService } from './accordion-state.service';

describe('AccordionStateService', () => {
  let service: AccordionStateService;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageMock[key] || null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete localStorageMock[key];
    });

    spyOn(localStorage, 'key').and.callFake((index: number) => {
      const keys = Object.keys(localStorageMock);
      return keys[index] || null;
    });

    Object.defineProperty(localStorage, 'length', {
      get: () => Object.keys(localStorageMock).length,
      configurable: true,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(AccordionStateService);
  });

  afterEach(() => {
    localStorageMock = {};
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveAccordionState', () => {
    it('should save accordion state to localStorage with field type prefix', () => {
      service.saveAccordionState('text', [0, 1]);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'field_properties_accordion_text',
        JSON.stringify([0, 1]),
      );
      expect(localStorageMock['field_properties_accordion_text']).toBe(JSON.stringify([0, 1]));
    });

    it('should convert single number to array when saving', () => {
      service.saveAccordionState('email', 2);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'field_properties_accordion_email',
        JSON.stringify([2]),
      );
    });

    it('should handle array of panel indices', () => {
      service.saveAccordionState('heading', [0, 2, 3]);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'field_properties_accordion_heading',
        JSON.stringify([0, 2, 3]),
      );
    });

    it('should overwrite existing state for same field type', () => {
      service.saveAccordionState('select', [0]);
      service.saveAccordionState('select', [1, 2]);

      expect(localStorageMock['field_properties_accordion_select']).toBe(JSON.stringify([1, 2]));
    });
  });

  describe('loadAccordionState', () => {
    it('should load accordion state from localStorage', () => {
      localStorageMock['field_properties_accordion_text'] = JSON.stringify([0, 1]);

      const result = service.loadAccordionState('text');

      expect(localStorage.getItem).toHaveBeenCalledWith('field_properties_accordion_text');
      expect(result).toEqual([0, 1]);
    });

    it('should return [0] when no state exists for field type', () => {
      const result = service.loadAccordionState('nonexistent');

      expect(result).toEqual([0]);
    });

    it('should return [0] when localStorage returns null', () => {
      localStorageMock['field_properties_accordion_email'] = '';

      const result = service.loadAccordionState('email');

      expect(result).toEqual([0]);
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock['field_properties_accordion_broken'] = 'invalid-json-{[';

      const result = service.loadAccordionState('broken');

      expect(result).toEqual([0]);
    });

    it('should return [0] when stored value is not an array', () => {
      localStorageMock['field_properties_accordion_invalid'] = JSON.stringify({
        not: 'an array',
      });

      const result = service.loadAccordionState('invalid');

      expect(result).toEqual([0]);
    });

    it('should handle empty array', () => {
      localStorageMock['field_properties_accordion_empty'] = JSON.stringify([]);

      const result = service.loadAccordionState('empty');

      expect(result).toEqual([]);
    });
  });

  describe('clearAllStates', () => {
    it('should remove all accordion states matching prefix', () => {
      localStorageMock['field_properties_accordion_text'] = JSON.stringify([0, 1]);
      localStorageMock['field_properties_accordion_email'] = JSON.stringify([0]);
      localStorageMock['field_properties_accordion_select'] = JSON.stringify([1, 2]);
      localStorageMock['other_key'] = 'should not be removed';

      service.clearAllStates();

      expect(localStorage.removeItem).toHaveBeenCalledTimes(3);
      expect(localStorage.removeItem).toHaveBeenCalledWith('field_properties_accordion_text');
      expect(localStorage.removeItem).toHaveBeenCalledWith('field_properties_accordion_email');
      expect(localStorage.removeItem).toHaveBeenCalledWith('field_properties_accordion_select');
      expect(localStorageMock['other_key']).toBe('should not be removed');
    });

    it('should handle empty localStorage', () => {
      service.clearAllStates();

      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should not remove keys with different prefixes', () => {
      localStorageMock['field_properties_accordion_text'] = JSON.stringify([0]);
      localStorageMock['form_settings_key'] = 'value';
      localStorageMock['user_preferences'] = 'value';

      service.clearAllStates();

      expect(localStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(localStorage.removeItem).toHaveBeenCalledWith('field_properties_accordion_text');
      expect(localStorageMock['form_settings_key']).toBe('value');
      expect(localStorageMock['user_preferences']).toBe('value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in field type', () => {
      service.saveAccordionState('custom-field_type.v2', [0, 2]);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'field_properties_accordion_custom-field_type.v2',
        JSON.stringify([0, 2]),
      );

      const result = service.loadAccordionState('custom-field_type.v2');
      expect(result).toEqual([0, 2]);
    });

    it('should handle very large arrays', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i);
      service.saveAccordionState('test', largeArray);

      const result = service.loadAccordionState('test');
      expect(result).toEqual(largeArray);
    });

    it('should handle negative panel indices', () => {
      service.saveAccordionState('test', [-1, 0, 5]);

      const result = service.loadAccordionState('test');
      expect(result).toEqual([-1, 0, 5]);
    });
  });
});
