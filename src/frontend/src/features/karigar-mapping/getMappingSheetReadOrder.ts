/**
 * Compute deterministic sheet read order for karigar mapping lookups.
 * Priority sheets ("1", "3", "2") are read first if present,
 * then all remaining sheets in alphabetical order.
 */
export function getMappingSheetReadOrder(availableSheetNames: string[]): string[] {
  const prioritySheets = ['1', '3', '2'];
  const result: string[] = [];
  const remaining: string[] = [];

  // Add priority sheets first (in order) if they exist
  for (const prioritySheet of prioritySheets) {
    if (availableSheetNames.includes(prioritySheet)) {
      result.push(prioritySheet);
    }
  }

  // Collect all non-priority sheets
  for (const sheetName of availableSheetNames) {
    if (!prioritySheets.includes(sheetName)) {
      remaining.push(sheetName);
    }
  }

  // Sort remaining sheets alphabetically for deterministic order
  remaining.sort((a, b) => a.localeCompare(b));

  // Append remaining sheets
  result.push(...remaining);

  return result;
}
