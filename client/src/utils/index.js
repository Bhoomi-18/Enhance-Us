/**
  * Utility helper to conditionally join classNames
  */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format date string into human readable format
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
