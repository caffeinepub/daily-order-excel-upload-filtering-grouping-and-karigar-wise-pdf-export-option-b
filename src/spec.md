# Specification

## Summary
**Goal:** Fix Karigar Mapping PDF uploads by ensuring PDF.js is loaded and configured (including worker setup) so PDFs can be parsed without the “PDF.js library not loaded” error.

**Planned changes:**
- Ensure the PDF.js browser library is loaded and available at runtime as `window.pdfjsLib` before `parseKarigarMapping(file)` runs.
- Configure PDF.js worker settings at runtime (e.g., `pdfjsLib.GlobalWorkerOptions.workerSrc`) to work reliably in production builds on the Internet Computer.
- Improve the Karigar Mapping upload error message when PDF parsing can’t start (missing/unavailable PDF.js) to be actionable in English, preserve whitespace formatting, and suggest retry/refresh or using Excel (.xlsx/.xls) as a fallback.

**User-visible outcome:** Uploading a PDF in the Karigar Mapping tab parses successfully in production without the “PDF.js library not loaded” error; if PDF parsing is unavailable, users see a clear English message with next steps and an Excel fallback.
