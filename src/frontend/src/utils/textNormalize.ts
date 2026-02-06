/**
 * Text normalization utilities for Excel/CSV parsing and design code matching.
 * Handles hidden characters, unicode variations, and whitespace normalization.
 */

/**
 * Normalize a cell value from Excel/CSV:
 * - Remove zero-width characters (ZWSP, ZWNJ, ZWJ, etc.)
 * - Remove other invisible/control characters
 * - Replace non-breaking spaces with regular spaces
 * - Normalize unicode dashes to ASCII hyphen
 * - Normalize unicode quotes to ASCII quotes
 * - Collapse multiple whitespace to single space
 * - Trim leading/trailing whitespace
 */
export function normalizeCellValue(value: string | null | undefined): string {
  if (!value) return '';
  
  let normalized = String(value);
  
  // Remove zero-width characters (ZWSP, ZWNJ, ZWJ, zero-width no-break space)
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Remove other invisible/control characters (except newlines and tabs which we'll handle)
  normalized = normalized.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  
  // Replace non-breaking spaces with regular spaces
  normalized = normalized.replace(/\u00A0/g, ' ');
  
  // Normalize various unicode dashes to ASCII hyphen
  normalized = normalized.replace(/[\u2010-\u2015\u2212]/g, '-');
  
  // Normalize various unicode quotes to ASCII quotes
  normalized = normalized.replace(/[\u2018\u2019]/g, "'");
  normalized = normalized.replace(/[\u201C\u201D]/g, '"');
  
  // Normalize apostrophes and special punctuation
  normalized = normalized.replace(/[\u2032\u2033]/g, "'");
  
  // Collapse multiple whitespace (including newlines, tabs) to single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Trim
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Normalize a header string for column matching:
 * - Apply cell normalization
 * - Convert to lowercase
 * - Remove punctuation (except spaces)
 * - Normalize whitespace
 */
export function normalizeHeader(header: string | null | undefined): string {
  if (!header) return '';
  
  let normalized = normalizeCellValue(header);
  
  // Convert to lowercase
  normalized = normalized.toLowerCase();
  
  // Remove punctuation but keep spaces
  normalized = normalized.replace(/[^\w\s]/g, '');
  
  // Normalize whitespace again after punctuation removal
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Normalize a design code for lookup matching:
 * - Apply cell normalization
 * - Convert to lowercase for case-insensitive matching
 * - Preserve original structure but clean hidden chars
 */
export function normalizeDesignCode(design: string | null | undefined): string {
  if (!design) return '';
  
  let normalized = normalizeCellValue(design);
  
  // Convert to lowercase for case-insensitive matching
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * Check if a normalized header matches any of the given aliases
 */
export function matchesHeaderAlias(header: string, aliases: string[]): boolean {
  const normalized = normalizeHeader(header);
  if (!normalized) return false;
  
  return aliases.some(alias => {
    const normalizedAlias = normalizeHeader(alias);
    // Exact match or contains (for flexibility)
    return normalized === normalizedAlias || normalized.includes(normalizedAlias);
  });
}
