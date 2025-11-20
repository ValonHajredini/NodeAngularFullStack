import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  TokenService,
  ApiTokenResponse,
  TokenListResponse,
  DeleteTokenResponse,
} from './token.service';
import { ApiClientService } from '../api/api-client.service';
import {
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  ApiTokenListResponse,
  UpdateApiTokenRequest,
} from '@nodeangularfullstack/shared';
import { environment } from '@env/environment';

describe('TokenService', () => {
  let service: TokenService;
  let httpMock: HttpTestingController;
  let apiClientService: ApiClientService;

  const mockCreateTokenRequest: CreateApiTokenRequest = {
    name: 'Test Token',
    scopes: ['read', 'write'],
  };

  const mockCreateTokenResponse: CreateApiTokenResponse = {
    id: 'token-123',
    token: 'api_token_plaintext_value',
    name: 'Test Token',
    scopes: ['read', 'write'],
    expiresAt: '2025-09-25T20:00:00.000Z',
  };

  const mockTokenList: ApiTokenListResponse[] = [
    {
      id: 'token-123',
      name: 'Test Token',
      scopes: ['read', 'write'],
      expiresAt: '2025-09-25T20:00:00.000Z',
      createdAt: '2024-09-25T20:00:00.000Z',
      lastUsedAt: '2024-09-26T10:00:00.000Z',
      isActive: true,
    },
    {
      id: 'token-456',
      name: 'Another Token',
      scopes: ['read'],
      expiresAt: '2025-12-25T20:00:00.000Z',
      createdAt: '2024-08-15T15:30:00.000Z',
      isActive: true,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TokenService, ApiClientService],
    });

    service = TestBed.inject(TokenService);
    apiClientService = TestBed.inject(ApiClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createToken', () => {
    it('should create a new API token successfully', (done) => {
      const mockResponse: ApiTokenResponse<CreateApiTokenResponse> = {
        success: true,
        data: mockCreateTokenResponse,
        timestamp: '2024-09-25T20:00:00.000Z',
      };

      service.createToken(mockCreateTokenRequest).subscribe({
        next: (response) => {
          expect(response).toEqual(mockCreateTokenResponse);
          expect(response.token).toBe('api_token_plaintext_value');
          expect(response.name).toBe('Test Token');
          expect(response.scopes).toEqual(['read', 'write']);
          done();
        },
        error: done.fail,
      });

      // Expect the create token request
      const createReq = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      expect(createReq.request.method).toBe('POST');
      expect(createReq.request.body).toEqual(mockCreateTokenRequest);
      createReq.flush(mockResponse);

      // Expect the automatic token list refresh
      const listReq = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      expect(listReq.request.method).toBe('GET');
      listReq.flush({
        success: true,
        data: [mockCreateTokenResponse],
        meta: { total: 1 },
        timestamp: '2024-09-25T20:00:00.000Z',
      });
    });

    it('should handle creation errors properly', (done) => {
      const errorResponse = {
        error: {
          error: {
            message: 'Token name already exists for this user',
          },
        },
      };

      service.createToken(mockCreateTokenRequest).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.error()).toBe('Token name already exists for this user');
          expect(service.loading()).toBeFalse();
          done();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      req.flush(errorResponse, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('getTokens', () => {
    it('should retrieve user tokens successfully', (done) => {
      const mockResponse: TokenListResponse = {
        success: true,
        data: mockTokenList,
        meta: { total: 2 },
        timestamp: '2024-09-25T20:00:00.000Z',
      };

      service.getTokens().subscribe({
        next: (tokens) => {
          expect(tokens).toEqual(mockTokenList);
          expect(tokens.length).toBe(2);
          expect(service.tokens()).toEqual(mockTokenList);
          expect(service.loading()).toBeFalse();
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle token retrieval errors', (done) => {
      const errorResponse = {
        error: {
          error: {
            message: 'Unauthorized access',
          },
        },
      };

      service.getTokens().subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.error()).toBe('Unauthorized access');
          expect(service.loading()).toBeFalse();
          done();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('revokeToken', () => {
    it('should revoke a token successfully', (done) => {
      const tokenId = 'token-123';
      const mockResponse: DeleteTokenResponse = {
        success: true,
        data: { message: 'Token revoked successfully' },
        timestamp: '2024-09-25T20:00:00.000Z',
      };

      // Set initial token state
      service.getTokens().subscribe(() => {
        // Now revoke a token
        service.revokeToken(tokenId).subscribe({
          next: () => {
            // Check that token was removed from local state
            const remainingTokens = service.tokens();
            expect(remainingTokens.find((t) => t.id === tokenId)).toBeUndefined();
            expect(service.loading()).toBeFalse();
            done();
          },
          error: done.fail,
        });

        const deleteReq = httpMock.expectOne(`${environment.apiUrl}/tokens/${tokenId}`);
        expect(deleteReq.request.method).toBe('DELETE');
        deleteReq.flush(mockResponse);
      });

      // First request to set up token state
      const getReq = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      getReq.flush({
        success: true,
        data: mockTokenList,
        meta: { total: 2 },
        timestamp: '2024-09-25T20:00:00.000Z',
      });
    });

    it('should handle revocation errors', (done) => {
      const tokenId = 'token-123';
      const errorResponse = {
        error: {
          error: {
            message: 'Token not found or access denied',
          },
        },
      };

      service.revokeToken(tokenId).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.error()).toBe('Token not found or access denied');
          expect(service.loading()).toBeFalse();
          done();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens/${tokenId}`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('updateToken', () => {
    it('should update a token successfully', (done) => {
      const tokenId = 'token-123';
      const updates: UpdateApiTokenRequest = {
        name: 'Updated Token Name',
        isActive: false,
      };

      const updatedToken: ApiTokenListResponse = {
        ...mockTokenList[0],
        name: 'Updated Token Name',
        isActive: false,
      };

      const mockResponse: ApiTokenResponse<ApiTokenListResponse> = {
        success: true,
        data: updatedToken,
        timestamp: '2024-09-25T20:00:00.000Z',
      };

      service.updateToken(tokenId, updates).subscribe({
        next: (response) => {
          expect(response).toEqual(updatedToken);
          expect(response.name).toBe('Updated Token Name');
          expect(response.isActive).toBeFalse();
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens/${tokenId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updates);
      req.flush(mockResponse);
    });

    it('should handle update errors', (done) => {
      const tokenId = 'token-123';
      const updates: UpdateApiTokenRequest = { name: 'Duplicate Name' };
      const errorResponse = {
        error: {
          error: {
            message: 'Token name already exists for this user',
          },
        },
      };

      service.updateToken(tokenId, updates).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.error()).toBe('Token name already exists for this user');
          done();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens/${tokenId}`);
      req.flush(errorResponse, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('getTokenById', () => {
    it('should return token if found in cache', (done) => {
      service.getTokens().subscribe(() => {
        const foundToken = service.getTokenById('token-123');
        expect(foundToken).toEqual(mockTokenList[0]);
        expect(foundToken?.name).toBe('Test Token');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      req.flush({
        success: true,
        data: mockTokenList,
        meta: { total: 2 },
        timestamp: '2024-09-25T20:00:00.000Z',
      });
    });

    it('should return null if token not found', () => {
      const result = service.getTokenById('nonexistent-token');
      expect(result).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      // Set error state
      service.createToken(mockCreateTokenRequest).subscribe({
        error: () => {
          expect(service.error()).toBeTruthy();

          // Clear error
          service.clearError();
          expect(service.error()).toBeNull();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      req.flush({ error: 'Test error' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh token list', (done) => {
      service.refreshTokens().subscribe({
        next: (tokens) => {
          expect(tokens).toEqual(mockTokenList);
          expect(service.tokens()).toEqual(mockTokenList);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tokens`);
      req.flush({
        success: true,
        data: mockTokenList,
        meta: { total: 2 },
        timestamp: '2024-09-25T20:00:00.000Z',
      });
    });
  });
});
