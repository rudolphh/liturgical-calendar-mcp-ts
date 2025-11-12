/**
 * Filter utilities for liturgical calendar events
 * Handles month and grade filtering
 */

/**
 * Parses and validates a month filter string
 * @param monthFilter - Month string (1-12)
 * @returns Month number (1-12), undefined if not provided, or undefined if invalid
 */
export const parseMonthFilter = (monthFilter?: string): number | null | undefined => {
  if (!monthFilter) return undefined;
  
  const month = parseInt(monthFilter, 10);
  if (isNaN(month) || month < 1 || month > 12) return undefined;
  
  return month;
};

/**
 * Parses and validates a grade filter (single or comma-separated)
 * @param gradeFilter - Grade string or number (0-7, comma-separated allowed)
 * @returns Array of valid grade numbers, undefined if not provided, or undefined if all invalid
 */
export const parseGradeFilter = (gradeFilter?: string | number): number[] | null | undefined => {
  if (!gradeFilter) return undefined;
  
  const filterStr = typeof gradeFilter === 'number' ? String(gradeFilter) : gradeFilter;
  const grades = filterStr
    .split(',')
    .map(g => parseInt(g.trim(), 10))
    .filter(g => !isNaN(g) && g >= 0 && g <= 7);
  
  return grades.length > 0 ? grades : undefined;
};
