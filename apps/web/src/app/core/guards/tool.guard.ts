import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { map, catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { ToolsService } from '../services/tools.service';

/**
 * Tool availability guard that protects routes requiring specific tools to be enabled.
 * Redirects to appropriate page if tool is disabled or unavailable.
 */

/**
 * Factory function that creates a guard for a specific tool.
 * Checks if the specified tool is enabled before allowing route activation.
 *
 * @param toolKey - The unique key of the tool to check
 * @param redirectRoute - Optional route to redirect to if tool is disabled (default: '/app/dashboard')
 * @param showError - Whether to show an error message in query params (default: true)
 * @returns CanActivateFn that checks tool availability
 *
 * @example
 * // In route configuration
 * {
 *   path: 'short-links',
 *   component: ShortLinksComponent,
 *   canActivate: [toolGuard('short-link')]
 * }
 *
 * @example
 * // With custom redirect
 * {
 *   path: 'analytics',
 *   component: AnalyticsComponent,
 *   canActivate: [toolGuard('analytics', '/app/tools', false)]
 * }
 */
export function toolGuard(
  toolKey: string,
  redirectRoute = '/app/dashboard',
  showError = true,
): CanActivateFn {
  return (route: ActivatedRouteSnapshot, state) => {
    const toolsService = inject(ToolsService);
    const router = inject(Router);

    if (!toolKey.trim()) {
      console.error('ToolGuard: Empty tool key provided');
      return handleToolUnavailable(
        router,
        redirectRoute,
        toolKey,
        showError,
        'Invalid tool configuration',
      );
    }

    // First check cache for immediate response
    const cachedEnabled = toolsService.isToolEnabled(toolKey);
    if (cachedEnabled && toolsService.hasFreshCache()) {
      return true;
    }

    // If cache indicates disabled or is stale, verify with API
    return toolsService.getToolStatus(toolKey).pipe(
      timeout(5000), // 5 second timeout for guard checks
      map((tool) => {
        if (!tool) {
          console.warn(`ToolGuard: Tool '${toolKey}' not found`);
          return handleToolUnavailable(router, redirectRoute, toolKey, showError, 'Tool not found');
        }

        if (!tool.active) {
          console.info(`ToolGuard: Tool '${toolKey}' is disabled`);
          return handleToolUnavailable(
            router,
            redirectRoute,
            toolKey,
            showError,
            'Tool is currently disabled',
          );
        }

        return true;
      }),
      catchError((error) => {
        console.error(`ToolGuard: Failed to check tool '${toolKey}':`, error);

        // On API failure, use cached data as fallback
        if (cachedEnabled) {
          console.warn(`ToolGuard: Using cached data for tool '${toolKey}' due to API failure`);
          return of(true);
        }

        // If no cache and API fails, deny access
        return of(
          handleToolUnavailable(
            router,
            redirectRoute,
            toolKey,
            showError,
            'Unable to verify tool status',
          ),
        );
      }),
    );
  };
}

/**
 * Guard that checks if ANY of the specified tools are enabled.
 * Useful for routes that can work with multiple alternative tools.
 *
 * @param toolKeys - Array of tool keys to check
 * @param redirectRoute - Optional route to redirect to if no tools are enabled
 * @param showError - Whether to show an error message in query params
 * @returns CanActivateFn that checks if any tools are available
 *
 * @example
 * // In route configuration - allow if either tool is enabled
 * {
 *   path: 'content-tools',
 *   component: ContentToolsComponent,
 *   canActivate: [anyToolGuard(['short-link', 'qr-generator'])]
 * }
 */
export function anyToolGuard(
  toolKeys: string[],
  redirectRoute = '/app/dashboard',
  showError = true,
): CanActivateFn {
  return (route, state) => {
    const toolsService = inject(ToolsService);
    const router = inject(Router);

    if (!toolKeys.length) {
      console.error('AnyToolGuard: No tool keys provided');
      return handleToolUnavailable(
        router,
        redirectRoute,
        'multiple',
        showError,
        'No tools specified',
      );
    }

    // Check if any tools are enabled in cache
    const anyEnabled = toolKeys.some((key) => toolsService.isToolEnabled(key));
    if (anyEnabled && toolsService.hasFreshCache()) {
      return true;
    }

    // Refresh and check again
    return toolsService.refreshAllTools().pipe(
      timeout(5000),
      map((tools) => {
        const enabledTools = tools.filter((tool) => tool.active && toolKeys.includes(tool.key));

        if (enabledTools.length === 0) {
          console.info(
            `AnyToolGuard: None of the required tools are enabled: ${toolKeys.join(', ')}`,
          );
          return handleToolUnavailable(
            router,
            redirectRoute,
            toolKeys.join(', '),
            showError,
            'Required tools are not available',
          );
        }

        return true;
      }),
      catchError((error) => {
        console.error('AnyToolGuard: Failed to check tools:', error);

        // Fallback to cache on API failure
        const anyCachedEnabled = toolKeys.some((key) => toolsService.isToolEnabled(key));
        if (anyCachedEnabled) {
          console.warn('AnyToolGuard: Using cached data due to API failure');
          return of(true);
        }

        return of(
          handleToolUnavailable(
            router,
            redirectRoute,
            toolKeys.join(', '),
            showError,
            'Unable to verify tools status',
          ),
        );
      }),
    );
  };
}

/**
 * Guard that checks if ALL specified tools are enabled.
 * Useful for routes that require multiple tools to function properly.
 *
 * @param toolKeys - Array of tool keys that must all be enabled
 * @param redirectRoute - Optional route to redirect to if any tools are disabled
 * @param showError - Whether to show an error message in query params
 * @returns CanActivateFn that checks if all tools are available
 *
 * @example
 * // In route configuration - require both tools to be enabled
 * {
 *   path: 'advanced-analytics',
 *   component: AdvancedAnalyticsComponent,
 *   canActivate: [allToolsGuard(['analytics', 'reporting'])]
 * }
 */
export function allToolsGuard(
  toolKeys: string[],
  redirectRoute = '/app/dashboard',
  showError = true,
): CanActivateFn {
  return (route, state) => {
    const toolsService = inject(ToolsService);
    const router = inject(Router);

    if (!toolKeys.length) {
      console.error('AllToolsGuard: No tool keys provided');
      return true; // Allow access if no tools specified
    }

    // Check if all tools are enabled in cache
    const allEnabled = toolKeys.every((key) => toolsService.isToolEnabled(key));
    if (allEnabled && toolsService.hasFreshCache()) {
      return true;
    }

    // Refresh and check again
    return toolsService.refreshAllTools().pipe(
      timeout(5000),
      map((tools) => {
        const disabledTools = toolKeys.filter((key) => {
          const tool = tools.find((t) => t.key === key);
          return !tool?.active;
        });

        if (disabledTools.length > 0) {
          console.info(`AllToolsGuard: Required tools are disabled: ${disabledTools.join(', ')}`);
          return handleToolUnavailable(
            router,
            redirectRoute,
            disabledTools.join(', '),
            showError,
            `Required tools are not available: ${disabledTools.join(', ')}`,
          );
        }

        return true;
      }),
      catchError((error) => {
        console.error('AllToolsGuard: Failed to check tools:', error);

        // Fallback to cache on API failure
        const allCachedEnabled = toolKeys.every((key) => toolsService.isToolEnabled(key));
        if (allCachedEnabled) {
          console.warn('AllToolsGuard: Using cached data due to API failure');
          return of(true);
        }

        return of(
          handleToolUnavailable(
            router,
            redirectRoute,
            toolKeys.join(', '),
            showError,
            'Unable to verify tools status',
          ),
        );
      }),
    );
  };
}

/**
 * Handles tool unavailability by redirecting with appropriate messaging.
 */
function handleToolUnavailable(
  router: Router,
  redirectRoute: string,
  toolKey: string,
  showError: boolean,
  reason: string,
): boolean {
  const queryParams = showError
    ? {
        toolError: 'true',
        tool: toolKey,
        reason: reason,
      }
    : {};

  router.navigate([redirectRoute], { queryParams });
  return false;
}

/**
 * Dynamic tool guard that checks tool availability by slug from route parameters.
 * Used for dynamic tool routing where the slug is part of the URL.
 *
 * @param redirectRoute - Optional route to redirect to if tool is disabled
 * @param showError - Whether to show an error message in query params
 * @returns CanActivateFn that checks tool availability using slug from route
 *
 * @example
 * // In route configuration for dynamic tool routes
 * {
 *   path: 'tools/:slug',
 *   component: ToolContainerComponent,
 *   canActivate: [slugToolGuard]
 * }
 */
export const slugToolGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const toolsService = inject(ToolsService);
  const router = inject(Router);

  const redirectRoute = '/app/dashboard';
  const showError = true;

  // Check if route data specifies to skip slug check and use toolId instead
  const checkToolBySlug = route.data['checkToolBySlug'] !== false; // Default to true if not specified
  const toolId = route.data['toolId'] as string | undefined;

  // If checkToolBySlug is false, use the toolId from route data directly
  if (!checkToolBySlug && toolId) {
    // Check tool by key/id instead of slug
    const cachedEnabled = toolsService.isToolEnabled(toolId);
    if (cachedEnabled && toolsService.hasFreshCache()) {
      return true;
    }

    // Verify with API
    return toolsService.getToolStatus(toolId).pipe(
      timeout(5000),
      map((tool) => {
        if (!tool) {
          console.warn(`ToolGuard: Tool '${toolId}' not found`);
          return handleToolUnavailable(router, redirectRoute, toolId, showError, 'Tool not found');
        }

        if (!tool.active) {
          console.info(`ToolGuard: Tool '${toolId}' is disabled`);
          return handleToolUnavailable(
            router,
            redirectRoute,
            toolId,
            showError,
            'Tool is currently disabled',
          );
        }

        return true;
      }),
      catchError((error) => {
        console.error(`ToolGuard: Failed to check tool '${toolId}':`, error);

        // On API failure, use cached data as fallback
        if (cachedEnabled) {
          console.warn(`ToolGuard: Using cached data for tool '${toolId}' due to API failure`);
          return of(true);
        }

        return of(
          handleToolUnavailable(
            router,
            redirectRoute,
            toolId,
            showError,
            'Unable to verify tool status',
          ),
        );
      }),
    );
  }

  // Original slug-based logic
  const slug = route.paramMap.get('slug');

  if (!slug) {
    console.error('ToolGuard: No slug parameter found in route');
    return handleToolUnavailable(router, redirectRoute, 'unknown', showError, 'Invalid tool URL');
  }

  // Get tool by slug from cached tools
  const cachedTools = toolsService.getCachedTools();
  const cachedTool = cachedTools.find((tool) => tool.slug === slug);

  if (cachedTool && cachedTool.active && toolsService.hasFreshCache()) {
    return true;
  }

  // If no cache or tool not found/disabled, fetch fresh data
  return toolsService.refreshAllTools().pipe(
    timeout(5000),
    map((tools) => {
      const tool = tools.find((t) => t.slug === slug);

      if (!tool) {
        console.warn(`ToolGuard: Tool with slug '${slug}' not found`);
        return handleToolUnavailable(router, redirectRoute, slug, showError, 'Tool not found');
      }

      if (!tool.active) {
        console.info(`ToolGuard: Tool '${tool.name}' (${slug}) is disabled`);
        return handleToolUnavailable(
          router,
          redirectRoute,
          slug,
          showError,
          'Tool is currently disabled',
        );
      }

      return true;
    }),
    catchError((error) => {
      console.error(`ToolGuard: Failed to check tool with slug '${slug}':`, error);

      // On API failure, use cached data as fallback
      if (cachedTool?.active) {
        console.warn(`ToolGuard: Using cached data for tool '${slug}' due to API failure`);
        return of(true);
      }

      // If no cache and API fails, deny access
      return of(
        handleToolUnavailable(
          router,
          redirectRoute,
          slug,
          showError,
          'Unable to verify tool status',
        ),
      );
    }),
  );
};

/**
 * Convenience guards for commonly checked tools
 */

/**
 * Guard for short-link tool availability.
 * @example
 * {
 *   path: 'short-links',
 *   component: ShortLinksComponent,
 *   canActivate: [shortLinkToolGuard]
 * }
 */
export const shortLinkToolGuard: CanActivateFn = toolGuard('short-link');

/**
 * Guard for QR generator tool availability.
 * @example
 * {
 *   path: 'qr-generator',
 *   component: QrGeneratorComponent,
 *   canActivate: [qrGeneratorToolGuard]
 * }
 */
export const qrGeneratorToolGuard: CanActivateFn = toolGuard('qr-generator');

/**
 * Guard for analytics tool availability.
 * @example
 * {
 *   path: 'analytics',
 *   component: AnalyticsComponent,
 *   canActivate: [analyticsToolGuard]
 * }
 */
export const analyticsToolGuard: CanActivateFn = toolGuard('analytics');
