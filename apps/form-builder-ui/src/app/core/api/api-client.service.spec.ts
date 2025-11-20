import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiClientService } from './api-client.service';
import { environment } from '@env/environment';

describe('ApiClientService', () => {
  let service: ApiClientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiClientService]
    });

    service = TestBed.inject(ApiClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('GET Requests', () => {
    it('should make a GET request', () => {
      const mockData = { id: 1, name: 'Test' };
      const endpoint = '/test';

      service.get<typeof mockData>(endpoint).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(mockData);
    });

    it('should make a GET request with query parameters', () => {
      const mockData = [{ id: 1, name: 'Test' }];
      const endpoint = '/users';
      const options = {
        params: { page: '1', limit: '10' }
      };

      service.get<typeof mockData>(endpoint, options).subscribe(data => {
        expect(data).toEqual(mockData);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}?page=1&limit=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    it('should handle GET request errors', () => {
      const endpoint = '/test';

      service.get(endpoint).subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('POST Requests', () => {
    it('should make a POST request', () => {
      const requestBody = { name: 'New Item' };
      const responseBody = { id: 1, name: 'New Item' };
      const endpoint = '/items';

      service.post<typeof responseBody>(endpoint, requestBody).subscribe(data => {
        expect(data).toEqual(responseBody);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(requestBody);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(responseBody);
    });

    it('should make a POST request with custom headers', () => {
      const requestBody = { name: 'New Item' };
      const responseBody = { id: 1, name: 'New Item' };
      const endpoint = '/items';
      const options = {
        headers: { 'Custom-Header': 'custom-value' }
      };

      service.post<typeof responseBody>(endpoint, requestBody, options).subscribe(data => {
        expect(data).toEqual(responseBody);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Custom-Header')).toBe('custom-value');
      req.flush(responseBody);
    });
  });

  describe('PATCH Requests', () => {
    it('should make a PATCH request', () => {
      const requestBody = { name: 'Updated Item' };
      const responseBody = { id: 1, name: 'Updated Item' };
      const endpoint = '/items/1';

      service.patch<typeof responseBody>(endpoint, requestBody).subscribe(data => {
        expect(data).toEqual(responseBody);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(requestBody);
      req.flush(responseBody);
    });
  });

  describe('PUT Requests', () => {
    it('should make a PUT request', () => {
      const requestBody = { id: 1, name: 'Replaced Item' };
      const responseBody = { id: 1, name: 'Replaced Item' };
      const endpoint = '/items/1';

      service.put<typeof responseBody>(endpoint, requestBody).subscribe(data => {
        expect(data).toEqual(responseBody);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(requestBody);
      req.flush(responseBody);
    });
  });

  describe('DELETE Requests', () => {
    it('should make a DELETE request', () => {
      const endpoint = '/items/1';

      service.delete(endpoint).subscribe(response => {
        expect(response).toEqual({});
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      const endpoint = '/test';

      service.get(endpoint).subscribe({
        error: (error) => {
          expect(error).toBeDefined();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle server errors', () => {
      const endpoint = '/test';

      service.get(endpoint).subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Request Options', () => {
    it('should build request options correctly', () => {
      const endpoint = '/test';
      const options = {
        headers: { 'Authorization': 'Bearer token' },
        params: { 'filter': 'active' },
        withCredentials: true
      };

      service.get(endpoint, options).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}${endpoint}?filter=active`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer token');
      expect(req.request.withCredentials).toBe(true);
      req.flush({});
    });
  });
});