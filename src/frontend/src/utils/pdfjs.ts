/**
 * PDF.js runtime helper and configuration
 * Ensures PDF.js library is available and properly configured before parsing
 */

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

/**
 * Check if PDF.js library is loaded and available
 * @throws Error if PDF.js is not available
 */
export function ensurePdfJsLoaded(): void {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library not loaded. Please refresh the page and try again.');
  }
}

/**
 * Configure PDF.js worker source
 * Uses CDN worker to match the main library
 */
export function configurePdfJsWorker(): void {
  if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Use the same CDN version as the main library
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

/**
 * Initialize PDF.js with proper configuration
 * Call this before attempting to parse any PDF files
 */
export function initializePdfJs(): void {
  ensurePdfJsLoaded();
  configurePdfJsWorker();
}

/**
 * Check if PDF.js is ready to use
 * @returns true if PDF.js is loaded and configured
 */
export function isPdfJsReady(): boolean {
  try {
    ensurePdfJsLoaded();
    return true;
  } catch {
    return false;
  }
}
