/**
 * Build information utilities for displaying version/build identifiers in the UI.
 * The build timestamp is injected at build time via Vite.
 */

// Build timestamp injected by Vite at build time
const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || 'dev';

/**
 * Get a user-friendly build identifier for display in the UI.
 * Returns a formatted timestamp or "Development" for local builds.
 */
export function getBuildId(): string {
  if (BUILD_TIMESTAMP === 'dev') {
    return 'Development';
  }
  
  // Format timestamp as readable date/time
  try {
    const date = new Date(parseInt(BUILD_TIMESTAMP));
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return BUILD_TIMESTAMP;
  }
}

/**
 * Get the raw build timestamp for programmatic use.
 */
export function getBuildTimestamp(): string {
  return BUILD_TIMESTAMP;
}
