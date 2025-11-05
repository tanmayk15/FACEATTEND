/**
 * Date and Time Formatting Utilities
 * Provides consistent DD/MM/YYYY date format and 24-hour time format across the app
 */

/**
 * Format date to DD/MM/YYYY
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format time to 24-hour format (HH:mm)
 * @param {string|Date} date - The date/time to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Time';
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid Time';
  }
};

/**
 * Format date and time together (DD/MM/YYYY HH:mm)
 * @param {string|Date} date - The date/time to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    return `${formatDate(d)} ${formatTime(d)}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format date and time with seconds (DD/MM/YYYY HH:mm:ss)
 * @param {string|Date} date - The date/time to format
 * @returns {string} Formatted datetime string with seconds
 */
export const formatDateTimeWithSeconds = (date) => {
  if (!date) return 'N/A';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${formatDate(d)} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return 'Invalid Date';
  }
};
