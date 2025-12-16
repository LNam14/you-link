/**
 * Format date to YYYY-MM-DD HH:MM:SS format
 * @param date - Date object or ISO string. If not provided, uses current date
 * @returns Formatted date string in YYYY-MM-DD HH:MM:SS format
 */
export function formatDateTime(date?: Date | string): string {
  const dateObj = date ? (typeof date === "string" ? new Date(date) : date) : new Date();

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  const seconds = String(dateObj.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current date time in YYYY-MM-DD HH:MM:SS format
 * @returns Current date time string
 */
export function getCurrentDateTime(): string {
  return formatDateTime();
}

/**
 * Parse date string from YYYY-MM-DD HH:MM:SS format to Date object
 * @param dateString - Date string in YYYY-MM-DD HH:MM:SS format
 * @returns Date object
 */
export function parseDateTime(dateString: string): Date {
  // Replace space with T to make it ISO-like format
  const isoString = dateString.replace(" ", "T");
  return new Date(isoString);
}

