import { Application } from 'express';

/**
 * Route information interface
 */
interface RouteInfo {
  method: string;
  path: string;
  middleware: string[];
  handler: string;
}

/**
 * Extract routes from Express application
 * Similar to Laravel's `php artisan route:list`
 */
export class RouteList {
  private routes: RouteInfo[] = [];

  constructor(private app: Application) {}

  /**
   * Extract all routes from the Express app
   */
  extract(): RouteInfo[] {
    this.routes = [];
    this.extractRoutes(this.app._router);
    return this.routes;
  }

  /**
   * Recursively extract routes from router layers
   */
  private extractRoutes(router: any, basePath = ''): void {
    if (!router || !router.stack) return;

    router.stack.forEach((layer: any) => {
      if (layer.route) {
        // Route layer
        const route = layer.route;
        const path = basePath + route.path;

        Object.keys(route.methods).forEach((method) => {
          if (route.methods[method]) {
            this.routes.push({
              method: method.toUpperCase(),
              path: this.cleanPath(path),
              middleware: this.extractMiddleware(route.stack),
              handler: this.extractHandler(route.stack),
            });
          }
        });
      } else if (
        layer.name === 'router' ||
        (layer.handle && layer.handle.stack)
      ) {
        // Nested router - extract path
        let routePath = '';

        // Express 5 uses `path` property directly
        if (layer.path) {
          routePath = layer.path;
        } else if (layer.regexp) {
          // Fallback to regexp for older Express versions
          routePath = this.extractPathFromRegexp(layer.regexp);
        }

        this.extractRoutes(layer.handle, basePath + routePath);
      }
    });
  }

  /**
   * Extract path from Express regexp
   */
  private extractPathFromRegexp(regexp: RegExp): string {
    const regexpStr = regexp.toString();

    // Remove regexp delimiters and flags
    let path = regexpStr
      .replace(/^\/\^/, '') // Remove leading /^
      .replace(/\$?\//gi, '') // Remove trailing $/ or /
      .replace(/\\\//g, '/') // Replace \/ with /
      .replace(/\?(?=\/|$)/g, ''); // Remove trailing ?

    // Handle parameters
    path = path.replace(/\(\?\:\(\[\^\\\/\]\+\?\)\)/g, ':param');

    // Clean up
    path = path.replace(/\\/g, '');

    return path.startsWith('/') ? path : '/' + path;
  }

  /**
   * Clean and normalize path
   */
  private cleanPath(path: string): string {
    return (
      path
        .replace(/\/\//g, '/')
        .replace(/\/$/, '')
        .replace(/\?/g, '')
        .replace(/\(\[\^\\\/\]\+\?\)/g, ':param') || '/'
    );
  }

  /**
   * Extract middleware names from route stack
   */
  private extractMiddleware(stack: any[]): string[] {
    if (!stack) return [];

    return stack
      .slice(0, -1) // Exclude the final handler
      .map((layer: any) => {
        if (layer.name && layer.name !== '<anonymous>') {
          return layer.name;
        }
        return 'anonymous';
      })
      .filter((name: string) => name !== 'anonymous');
  }

  /**
   * Extract handler name from route stack
   */
  private extractHandler(stack: any[]): string {
    if (!stack || stack.length === 0) return 'unknown';

    const handler = stack[stack.length - 1];
    if (handler.name && handler.name !== '<anonymous>') {
      return handler.name;
    }

    return 'anonymous';
  }

  /**
   * Display routes in a formatted table
   */
  display(): void {
    const routes = this.extract();

    // Group routes by method
    const routesByMethod = routes.reduce(
      (acc, route) => {
        if (!acc[route.method]) {
          acc[route.method] = [];
        }
        acc[route.method].push(route);
        return acc;
      },
      {} as Record<string, RouteInfo[]>
    );

    // Calculate column widths
    const maxMethodWidth = 8;
    const maxPathWidth = Math.max(...routes.map((r) => r.path.length), 20);
    const maxMiddlewareWidth = Math.max(
      ...routes.map((r) => r.middleware.join(', ').length),
      15
    );
    const maxHandlerWidth = Math.max(
      ...routes.map((r) => r.handler.length),
      15
    );

    // Print header
    console.log('\n' + '='.repeat(120));
    console.log('API ROUTES');
    console.log('='.repeat(120));
    console.log(
      this.pad('Method', maxMethodWidth) +
        ' | ' +
        this.pad('Path', maxPathWidth) +
        ' | ' +
        this.pad('Middleware', maxMiddlewareWidth) +
        ' | ' +
        this.pad('Handler', maxHandlerWidth)
    );
    console.log('='.repeat(120));

    // Print routes grouped by method
    const methodOrder = [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
      'HEAD',
    ];

    methodOrder.forEach((method) => {
      if (routesByMethod[method]) {
        routesByMethod[method]
          .sort((a, b) => a.path.localeCompare(b.path))
          .forEach((route) => {
            console.log(
              this.colorMethod(this.pad(route.method, maxMethodWidth)) +
                ' | ' +
                this.truncate(route.path, maxPathWidth) +
                ' | ' +
                this.truncate(route.middleware.join(', '), maxMiddlewareWidth) +
                ' | ' +
                this.truncate(route.handler, maxHandlerWidth)
            );
          });
      }
    });

    console.log('='.repeat(120));
    console.log(`Total routes: ${routes.length}\n`);
  }

  /**
   * Display routes as JSON
   */
  json(): void {
    const routes = this.extract();
    console.log(JSON.stringify(routes, null, 2));
  }

  /**
   * Filter routes by method
   */
  filterByMethod(method: string): RouteInfo[] {
    return this.extract().filter(
      (route) => route.method.toLowerCase() === method.toLowerCase()
    );
  }

  /**
   * Filter routes by path pattern
   */
  filterByPath(pattern: string): RouteInfo[] {
    return this.extract().filter((route) =>
      route.path.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Pad string to specific width
   */
  private pad(str: string, width: number): string {
    return str.padEnd(width);
  }

  /**
   * Truncate string if too long
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str.padEnd(maxLength);
    }
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Color code HTTP methods
   */
  private colorMethod(method: string): string {
    const colors: Record<string, string> = {
      GET: '\x1b[32m', // Green
      POST: '\x1b[36m', // Cyan
      PUT: '\x1b[33m', // Yellow
      PATCH: '\x1b[35m', // Magenta
      DELETE: '\x1b[31m', // Red
      OPTIONS: '\x1b[90m', // Gray
      HEAD: '\x1b[90m', // Gray
    };

    const reset = '\x1b[0m';
    const methodName = method.trim();
    const color = colors[methodName] || '';

    return color + method + reset;
  }
}

/**
 * Create route listing utility
 */
export function createRouteList(app: Application): RouteList {
  return new RouteList(app);
}
