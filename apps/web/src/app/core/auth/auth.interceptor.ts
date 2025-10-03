import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

// State for token refresh management
let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

/**
 * HTTP interceptor function that automatically adds JWT tokens to API requests
 * and handles token refresh when access tokens expire.
 *
 * Features:
 * - Automatic JWT token attachment to requests
 * - Token refresh on 401 responses
 * - Request queuing during token refresh
 * - Excludes auth endpoints from token attachment
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn,
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);

  // Skip auth endpoints to prevent infinite loops
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Add access token to request if available
  const authReq = addTokenHeader(req, authService);

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(authReq, next, authService);
      }

      return throwError(() => error);
    }),
  );
};

/**
 * Adds the JWT access token to the request headers.
 * @param request - The HTTP request to modify
 * @param authService - The authentication service instance
 * @returns The modified request with auth header
 */
function addTokenHeader(request: HttpRequest<any>, authService: AuthService): HttpRequest<any> {
  const token = authService.getAccessToken();

  if (token) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return request;
}

/**
 * Handles 401 Unauthorized responses by attempting to refresh the access token.
 * Queues subsequent requests until refresh is complete.
 * @param request - The original failed request
 * @param next - The next handler function
 * @param authService - The authentication service instance
 * @returns Observable of HTTP events
 */
function handle401Error(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authService.getRefreshToken();

    if (refreshToken) {
      return authService.refreshAccessToken().pipe(
        switchMap((tokenResponse: any) => {
          isRefreshing = false;
          refreshTokenSubject.next(tokenResponse.accessToken);

          // Retry the original request with the new token
          return next(addTokenHeader(request, authService));
        }),
        catchError((error) => {
          isRefreshing = false;
          refreshTokenSubject.next(null);

          // If refresh fails, logout the user
          authService.logout().subscribe();
          return throwError(() => error);
        }),
      );
    } else {
      // No refresh token available, logout immediately
      isRefreshing = false;
      authService.logout().subscribe();
      return throwError(() => new Error('No refresh token available'));
    }
  }

  // If already refreshing, wait for the refresh to complete
  return refreshTokenSubject.pipe(
    filter((token) => token !== null),
    take(1),
    switchMap(() => next(addTokenHeader(request, authService))),
  );
}

/**
 * Determines if the request URL is an authentication endpoint.
 * These endpoints should not have tokens attached to prevent infinite loops.
 * @param url - The request URL to check
 * @returns True if this is an auth endpoint, false otherwise
 */
function isAuthEndpoint(url: string): boolean {
  const authEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
  ];

  return authEndpoints.some((endpoint) => url.includes(endpoint));
}
