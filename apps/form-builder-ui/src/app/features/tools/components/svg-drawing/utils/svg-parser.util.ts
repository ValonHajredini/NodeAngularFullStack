import { Point } from '@nodeangularfullstack/shared';

/**
 * Interface for parsed SVG data.
 */
export interface ParsedSVG {
  /** Sanitized SVG content (inner elements only) */
  content: string;
  /** Original viewBox string */
  viewBox: string;
  /** Width from viewBox */
  width: number;
  /** Height from viewBox */
  height: number;
  /** Whether the SVG has fills */
  hasFills: boolean;
  /** Whether the SVG has strokes */
  hasStrokes: boolean;
}

/**
 * Parses an SVG file and extracts relevant information.
 * @param svgString - Raw SVG file content
 * @returns Parsed SVG data
 */
export function parseSVG(svgString: string): ParsedSVG {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid SVG file');
  }

  const svgElement = doc.querySelector('svg');
  if (!svgElement) {
    throw new Error('No SVG element found');
  }

  // Extract viewBox
  let viewBox = svgElement.getAttribute('viewBox') || '';
  let width = 100;
  let height = 100;

  if (viewBox) {
    const parts = viewBox.split(/\s+/);
    if (parts.length === 4) {
      width = parseFloat(parts[2]);
      height = parseFloat(parts[3]);
    }
  } else {
    // Try to get width and height attributes
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');

    if (widthAttr && heightAttr) {
      width = parseFloat(widthAttr);
      height = parseFloat(heightAttr);
      viewBox = `0 0 ${width} ${height}`;
    }
  }

  // Extract inner content (all children of svg element)
  const content = sanitizeSVGContent(svgElement);

  // Check for fills and strokes
  const hasFills = svgString.includes('fill=') || svgString.includes('fill:');
  const hasStrokes = svgString.includes('stroke=') || svgString.includes('stroke:');

  return {
    content,
    viewBox,
    width,
    height,
    hasFills,
    hasStrokes,
  };
}

/**
 * Sanitizes SVG content by removing scripts and dangerous elements.
 * @param svgElement - SVG element to sanitize
 * @returns Sanitized SVG content
 */
function sanitizeSVGContent(svgElement: SVGSVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Remove dangerous elements
  const dangerousElements = clone.querySelectorAll('script, iframe, object, embed');
  dangerousElements.forEach((el) => el.remove());

  // Remove event handlers
  const allElements = clone.querySelectorAll('*');
  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Return inner HTML
  return clone.innerHTML;
}

/**
 * Replaces colors in SVG content with new colors.
 * @param svgContent - SVG content to modify
 * @param fillColor - New fill color (hex format)
 * @param strokeColor - New stroke color (hex format)
 * @returns Modified SVG content
 */
export function replaceColorsInSVG(
  svgContent: string,
  fillColor?: string,
  strokeColor?: string,
): string {
  let result = svgContent;

  if (fillColor) {
    // Replace fill attributes
    result = result.replace(/fill="[^"]*"/gi, `fill="${fillColor}"`);
    result = result.replace(/fill:\s*[^;"}]*/gi, `fill: ${fillColor}`);
  }

  if (strokeColor) {
    // Replace stroke attributes
    result = result.replace(/stroke="[^"]*"/gi, `stroke="${strokeColor}"`);
    result = result.replace(/stroke:\s*[^;"}]*/gi, `stroke: ${strokeColor}`);
  }

  return result;
}

/**
 * Converts SVG colors to use CSS variables for dynamic theming.
 * @param svgContent - SVG content to convert
 * @returns SVG content with CSS variables
 */
export function convertToThemableColors(svgContent: string): string {
  let result = svgContent;

  // Replace fill colors with CSS variable
  result = result.replace(/fill="(?!none)[^"]*"/gi, 'fill="var(--symbol-fill, currentColor)"');
  result = result.replace(/fill:\s*(?!none)[^;"}]*/gi, 'fill: var(--symbol-fill, currentColor)');

  // Replace stroke colors with CSS variable
  result = result.replace(
    /stroke="(?!none)[^"]*"/gi,
    'stroke="var(--symbol-stroke, currentColor)"',
  );
  result = result.replace(
    /stroke:\s*(?!none)[^;"}]*/gi,
    'stroke: var(--symbol-stroke, currentColor)',
  );

  return result;
}

/**
 * Calculates the transform string for an SVG symbol.
 * @param position - Position to place the symbol
 * @param width - Width of the symbol
 * @param height - Height of the symbol
 * @param rotation - Rotation angle in degrees
 * @param scale - Scale factor
 * @returns SVG transform string
 */
export function getSVGSymbolTransform(
  position: Point,
  width: number,
  height: number,
  rotation = 0,
  scale = 1,
): string {
  const transforms: string[] = [];

  // Translate to position
  transforms.push(`translate(${position.x}, ${position.y})`);

  // Rotate around center
  if (rotation !== 0) {
    const centerX = width / 2;
    const centerY = height / 2;
    transforms.push(`rotate(${rotation}, ${centerX}, ${centerY})`);
  }

  // Scale
  if (scale !== 1) {
    transforms.push(`scale(${scale})`);
  }

  return transforms.join(' ');
}

/**
 * Validates if a file is a valid SVG.
 * @param file - File to validate
 * @returns Promise that resolves to true if valid
 */
export async function validateSVGFile(file: File): Promise<boolean> {
  if (!file.name.toLowerCase().endsWith('.svg')) {
    return false;
  }

  if (!file.type.includes('svg')) {
    return false;
  }

  try {
    const content = await file.text();
    parseSVG(content);
    return true;
  } catch {
    return false;
  }
}
