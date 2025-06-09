/**
 * Format a date to YYYY-MM-DD HH:MM:SS format
 * @param date Date object to format
 * @returns Formatted date string
 */
export function formatDateTime(date: Date = new Date()): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  /**
   * Parse a date string in various formats to a Date object
   * @param dateString Date string to parse
   * @returns Date object
   */
  export function parseDate(dateString: string): Date | null {
    if (!dateString) return null
  
    // Try to parse the date string
    const date = new Date(dateString)
  
    // Check if the date is valid
    if (isNaN(date.getTime())) return null
  
    return date
  }
  