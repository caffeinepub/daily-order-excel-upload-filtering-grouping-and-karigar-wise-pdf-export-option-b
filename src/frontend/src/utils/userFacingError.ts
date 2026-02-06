/**
 * Convert unknown errors into user-friendly English messages
 */
export function getUserFacingError(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Actor/backend connection errors
  if (errorMessage.includes('Actor not available')) {
    return 'Connecting to backend... Please wait a moment and try again.';
  }
  
  if (errorMessage.includes('Agent creation failed') || errorMessage.includes('Failed to create actor')) {
    return 'Failed to connect to backend. Please check your connection and try again.';
  }
  
  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  // Parsing errors - keep them detailed and user-friendly
  if (errorMessage.includes('parse') || errorMessage.includes('Cannot parse file') || errorMessage.includes('Missing critical columns')) {
    return errorMessage; // Keep specific parsing errors as-is
  }
  
  // File reading errors
  if (errorMessage.includes('Failed to read file') || errorMessage.includes('Unsupported file format')) {
    return errorMessage;
  }
  
  // Backend traps/rejections
  if (errorMessage.includes('trap') || errorMessage.includes('reject')) {
    return 'Backend operation failed. Please try again.';
  }
  
  // Default: return the original message if it's already user-friendly
  return errorMessage;
}

export function withRetryMessage(error: unknown): string {
  return `${getUserFacingError(error)} Click retry to try again.`;
}
