/**
 * Date utilities for liturgical calendar dates
 * Handles both Unix timestamps and ISO 8601 strings
 */

/**
 * Formats a date value (Unix timestamp or ISO string) to YYYY-MM-DD format
 * @param dateValue - Unix timestamp (number) or ISO 8601 string
 * @returns Formatted date string or null if invalid
 */
export const formatDate = (dateValue: any): string | null => {
  if (!dateValue) return null;
  
  try {
    // Handle both Unix timestamp (seconds) and ISO string formats
    const date = typeof dateValue === 'number' 
      ? new Date(dateValue * 1000) // Convert Unix timestamp to milliseconds
      : new Date(dateValue);
    
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString().split('T')[0]; // Extract YYYY-MM-DD
  } catch {
    return null;
  }
};

/**
 * Validates a year is within supported range
 * @param year - Year string (optional, defaults to current year)
 * @returns Validated year as number
 * @throws Error if year is out of range (1970-9999)
 */
export const validateYear = (year?: string): number => {
  const y = parseInt(year?.trim() || String(new Date().getFullYear()), 10);
  if (isNaN(y) || y < 1970 || y > 9999) {
    throw new Error("Year must be between 1970 and 9999");
  }
  return y;
};
