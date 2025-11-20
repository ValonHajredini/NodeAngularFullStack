import { MenuItem } from 'primeng/api';

/**
 * Test Tool Menu Item
 *
 * PrimeNG MenuItem configuration for Test Tool tool navigation.
 * Use this in your sidebar/navigation menu to add Test Tool to the app.
 *
 * **Integration Example:**
 * ```typescript
 * // In your menu/sidebar component (e.g., apps/web/src/app/core/layout/sidebar/sidebar.component.ts)
 * import { testToolMenuItem } from '@app/features/tools/test-tool/menu-item';
 *
 * export class SidebarComponent {
 *   menuItems: MenuItem[] = [
 *     // ... existing menu items
 *     testToolMenuItem, // Add Test Tool to menu
 *   ];
 * }
 * ```
 *
 * **Features:**
 * - Icon: pi-box
 * - Route: /tools/test-tool
 * - Permissions: user
 *
 * **Customization:**
 * You can modify visibility, permissions, or styling by updating this object.
 *
 * @module menu-item
 */
export const testToolMenuItem: MenuItem = {
  /** Display label in navigation menu */
  label: 'Test Tool',

  /** PrimeNG icon for menu item */
  icon: 'pi-box',

  /** Router link to Test Tool component */
  routerLink: ['/tools/test-tool'],

  /** Tooltip on hover */
  title: 'A test tool for integration testing',

  /** Visibility control (set to false to hide) */
  visible: true,

  /** CSS style class for custom styling */
  styleClass: 'test-tool-menu-item',

  /**
   * Dynamic visibility based on user permissions.
   * TODO: Implement permission check logic.
   *
   * Example:
   * ```typescript
   * visible: () => {
   *   const authService = inject(AuthService);
   *   return authService.hasPermission('user');
   * }
   * ```
   */
  // visible: () => true, // Uncomment to use function-based visibility

  /** Additional data for menu item */
  data: {
    toolId: 'test-tool',
    permissions: ['user'],
    version: '1.0.0',
  },
};
