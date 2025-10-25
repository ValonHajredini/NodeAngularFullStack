import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestToolService } from './test-tool.service';
import { TestToolRecord } from '@nodeangularfullstack/shared';

/**
 * Test Tool Service Tests
 *
 * Tests HTTP requests, signal state management, caching,
 * error handling, and CRUD operations.
 */
describe('TestToolService', () => {
  let service: TestToolService;
  let httpMock: HttpTestingController;

  const apiUrl = '/api/tools/test-tool';

  // Mock data for testing
  const mockItems: TestToolRecord[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Item 1',
      description: 'Test description 1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
      createdBy: 'user-id-1',
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      name: 'Test Item 2',
      description: 'Test description 2',
      createdAt: new Date('2025-01-03T00:00:00Z'),
      updatedAt: new Date('2025-01-04T00:00:00Z'),
      createdBy: 'user-id-2',
    },
  ];

  const mockItem: TestToolRecord = mockItems[0];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestToolService],
    });

    service = TestBed.inject(TestToolService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no outstanding HTTP requests
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Signal State Management', () => {
    it('should have initial loading state as false', () => {
      expect(service.loading$()).toBe(false);
    });

    it('should have initial error state as null', () => {
      expect(service.error$()).toBe(null);
    });

    it('should have empty cache initially', () => {
      expect(service.items$()).toEqual([]);
    });

    it('should have hasData$ as false initially', () => {
      expect(service.hasData$()).toBe(false);
    });

    it('should have itemCount$ as 0 initially', () => {
      expect(service.itemCount$()).toBe(0);
    });
  });

  describe('getAll()', () => {
    it('should fetch all records via GET request', (done) => {
      service.getAll().subscribe({
        next: (items) => {
          expect(items).toEqual(mockItems);
          expect(items.length).toBe(2);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockItems });
    });

    it('should update cache signal on successful fetch', (done) => {
      service.getAll().subscribe({
        next: () => {
          expect(service.items$()).toEqual(mockItems);
          expect(service.hasData$()).toBe(true);
          expect(service.itemCount$()).toBe(2);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ data: mockItems });
    });

    it('should handle empty data array', (done) => {
      service.getAll().subscribe({
        next: (items) => {
          expect(items).toEqual([]);
          expect(service.items$()).toEqual([]);
          expect(service.hasData$()).toBe(false);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ data: [] });
    });

    it('should retry failed requests twice', (done) => {
      let attemptCount = 0;

      service.getAll().subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(attemptCount).toBe(3); // Initial + 2 retries
          done();
        },
      });

      // Expect 3 requests: initial + 2 retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(apiUrl);
        attemptCount++;
        req.error(new ErrorEvent('Network error'));
      }
    });

    it('should handle server errors', (done) => {
      service.getAll().subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
          expect(service.error$()).toBeTruthy();
          done();
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Server Error' });

      // Handle retry attempts
      for (let i = 0; i < 2; i++) {
        const retryReq = httpMock.expectOne(apiUrl);
        retryReq.flush(
          { message: 'Internal server error' },
          { status: 500, statusText: 'Server Error' },
        );
      }
    });
  });

  describe('getById()', () => {
    it('should fetch single record by ID', (done) => {
      const id = mockItem.id;

      service.getById(id).subscribe({
        next: (item) => {
          expect(item).toEqual(mockItem);
          expect(item.id).toBe(id);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${apiUrl}/${id}`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockItem });
    });

    it('should handle 404 not found', (done) => {
      const id = 'nonexistent-id';

      service.getById(id).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/${id}`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      // Handle retries
      for (let i = 0; i < 2; i++) {
        const retryReq = httpMock.expectOne(`${apiUrl}/${id}`);
        retryReq.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('create()', () => {
    it('should create new record via POST request', (done) => {
      const newData: Partial<TestToolRecord> = {
        name: 'New Item',
        description: 'New description',
      };

      service.create(newData).subscribe({
        next: (created) => {
          expect(created.name).toBe(newData.name);
          expect(created.description).toBe(newData.description);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newData);

      const createdItem = { ...mockItem, ...newData };
      req.flush({ data: createdItem });
    });

    it('should add created record to cache', (done) => {
      const newData: Partial<TestToolRecord> = {
        name: 'New Item',
        description: 'New description',
      };

      service.create(newData).subscribe({
        next: () => {
          expect(service.items$().length).toBe(1);
          expect(service.hasData$()).toBe(true);
          expect(service.itemCount$()).toBe(1);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ data: { ...mockItem, ...newData } });
    });

    it('should handle validation errors', (done) => {
      const invalidData: Partial<TestToolRecord> = {};

      service.create(invalidData).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
          done();
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'Validation failed' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('update()', () => {
    it('should update record via PUT request', (done) => {
      const id = mockItem.id;
      const updateData: Partial<TestToolRecord> = {
        name: 'Updated Name',
      };

      service.update(id, updateData).subscribe({
        next: (updated) => {
          expect(updated.name).toBe(updateData.name);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${apiUrl}/${id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush({ data: { ...mockItem, ...updateData } });
    });

    it('should update record in cache', (done) => {
      // First, add item to cache
      service.getAll().subscribe({
        next: () => {
          const id = mockItems[0].id;
          const updateData: Partial<TestToolRecord> = { name: 'Updated' };

          service.update(id, updateData).subscribe({
            next: () => {
              const cachedItem = service.items$().find((item) => item.id === id);
              expect(cachedItem?.name).toBe('Updated');
              done();
            },
            error: done.fail,
          });

          const updateReq = httpMock.expectOne(`${apiUrl}/${id}`);
          updateReq.flush({ data: { ...mockItems[0], ...updateData } });
        },
        error: done.fail,
      });

      const getAllReq = httpMock.expectOne(apiUrl);
      getAllReq.flush({ data: mockItems });
    });
  });

  describe('delete()', () => {
    it('should delete record via DELETE request', (done) => {
      const id = mockItem.id;

      service.delete(id).subscribe({
        next: () => {
          expect(true).toBe(true); // Verify success
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${apiUrl}/${id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should remove deleted record from cache', (done) => {
      // First, add items to cache
      service.getAll().subscribe({
        next: () => {
          const id = mockItems[0].id;
          const initialCount = service.itemCount$();

          service.delete(id).subscribe({
            next: () => {
              expect(service.itemCount$()).toBe(initialCount - 1);
              expect(service.items$().find((item) => item.id === id)).toBeUndefined();
              done();
            },
            error: done.fail,
          });

          const deleteReq = httpMock.expectOne(`${apiUrl}/${id}`);
          deleteReq.flush(null);
        },
        error: done.fail,
      });

      const getAllReq = httpMock.expectOne(apiUrl);
      getAllReq.flush({ data: mockItems });
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', (done) => {
      // First, load data to populate cache
      service.getAll().subscribe({
        next: () => {
          expect(service.items$().length).toBeGreaterThan(0);

          // Clear cache
          service.clearCache();

          expect(service.items$()).toEqual([]);
          expect(service.hasData$()).toBe(false);
          expect(service.itemCount$()).toBe(0);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ data: mockItems });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', (done) => {
      service.getAll().subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Network error');
          expect(service.error$()).toContain('Network error');
          done();
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Network error', { message: 'Connection failed' }));

      // Handle retries
      for (let i = 0; i < 2; i++) {
        const retryReq = httpMock.expectOne(apiUrl);
        retryReq.error(new ErrorEvent('Network error', { message: 'Connection failed' }));
      }
    });

    it('should set error signal on failure', (done) => {
      service.getAll().subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(service.error$()).toBeTruthy();
          expect(service.loading$()).toBe(false);
          done();
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Error'));

      // Handle retries
      for (let i = 0; i < 2; i++) {
        const retryReq = httpMock.expectOne(apiUrl);
        retryReq.error(new ErrorEvent('Error'));
      }
    });
  });
});
