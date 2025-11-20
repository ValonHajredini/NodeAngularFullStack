/**
 * Width ratio option for dropdown UI in row layout and step form sidebars.
 * Used to configure column width distributions in multi-column layouts.
 */
export interface WidthRatioOption {
  /** Display label for the dropdown option */
  label: string;
  /** Width ratio value - can be a string (e.g., '1fr 2fr') or array of strings */
  value: string | string[];
}
