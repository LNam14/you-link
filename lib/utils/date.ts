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

/**
 * Get current time in Vietnam timezone (UTC+7)
 * @returns Date object representing current time in Vietnam
 */
export function getVietnamTime(): Date {
  const now = new Date();
  // Get UTC time and add 7 hours for Vietnam timezone
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const vietnamTime = new Date(utcTime + (7 * 60 * 60 * 1000));
  return vietnamTime;
}

/**
 * Get current hours in Vietnam timezone (UTC+7)
 * @returns Hours (0-23) in Vietnam timezone
 */
export function getVietnamHours(): number {
  return getVietnamTime().getHours();
}

/**
 * Get current minutes in Vietnam timezone (UTC+7)
 * @returns Minutes (0-59) in Vietnam timezone
 */
export function getVietnamMinutes(): number {
  return getVietnamTime().getMinutes();
}

/**
 * Format time in Vietnam timezone to HH:MM format
 * @param date - Optional Date object. If not provided, uses current Vietnam time
 * @returns Formatted time string in HH:MM format
 */
export function formatVietnamTime(date?: Date): string {
  const vietnamDate = date ? getVietnamTimeFromDate(date) : getVietnamTime();
  const hours = String(vietnamDate.getHours()).padStart(2, "0");
  const minutes = String(vietnamDate.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Get current date in Vietnam timezone (UTC+7) in YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format
 */
export function getVietnamDate(): string {
  const vietnamTime = getVietnamTime();
  const year = vietnamTime.getFullYear();
  const month = String(vietnamTime.getMonth() + 1).padStart(2, "0");
  const day = String(vietnamTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to Vietnam timezone (UTC+7)
 * @param date - Date object to convert
 * @returns Date object in Vietnam timezone
 */
export function getVietnamTimeFromDate(date: Date): Date {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const vietnamTime = new Date(utcTime + (7 * 60 * 60 * 1000));
  return vietnamTime;
}

