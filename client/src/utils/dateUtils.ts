/**
 * Formats a date to display in a standardized way
 * @param date - Date to format (Date object or ISO string)
 * @param options - Optional formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string,
  options?: {
    format?: 'default' | 'short' | 'long';
    includeTime?: boolean;
  },
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const defaultOptions = {
    format: 'default',
    includeTime: true,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Default format: "15 May, 13:45"
  if (mergedOptions.format === 'default') {
    return dateObj.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      hour: mergedOptions.includeTime ? 'numeric' : undefined,
      minute: mergedOptions.includeTime ? 'numeric' : undefined,
      hour12: false,
    });
  }

  // Short format: "15 May" or "15 May, 13:45"
  if (mergedOptions.format === 'short') {
    return dateObj.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: mergedOptions.includeTime ? 'numeric' : undefined,
      minute: mergedOptions.includeTime ? 'numeric' : undefined,
      hour12: false,
    });
  }

  // Long format: "15 May 2025, 13:45" with weekday
  if (mergedOptions.format === 'long') {
    return dateObj.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: mergedOptions.includeTime ? 'numeric' : undefined,
      minute: mergedOptions.includeTime ? 'numeric' : undefined,
      hour12: false,
    });
  }

  return dateObj.toLocaleString('en-GB');
};

/**
 * Formats a date as a relative time (e.g., "2 hours ago", "5 days ago")
 * @param date - Date to format (Date object or ISO string)
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (date: Date | string): string => {
  if (!date) return 'unknown';

  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();

  if (isNaN(dateObj.getTime())) {
    console.error('Invalid Date', date);
    return 'Invalid Date';
  }

  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  // For older dates, return the formatted date
  return formatDate(dateObj, { format: 'short' });
};
