# Specification

## Summary
**Goal:** Allow Karigar Mapping uploads to work with the same simple single-sheet tabular Excel format as the live-app example, without requiring sheet names “1”, “2”, or “3”.

**Planned changes:**
- Update the karigar mapping Excel parser to detect and parse mappings from any sheet name when a sheet contains a recognizable header pair for Design and Karigar (with optional Name), while preserving existing sheet-priority behavior when sheets “1”/“3”/“2” are present (in that order).
- When parsing fails, return a clear English error that lists which sheets were checked and why each was rejected (e.g., missing required columns such as Design and Karigar).
- Improve Karigar Mapping upload UI copy to explicitly support the user’s tabular Excel format and clarify allowed upload types (Excel .xlsx/.xls and PDF), including an English error for unsupported uploads such as screenshots/images.
- After a successful mapping upload (and when an existing mapping is loaded), display an English summary showing the number of mapping entries parsed and the sheet name(s) used.

**User-visible outcome:** Users can upload a normal single-sheet Excel table (any sheet name) with columns like “Design”, “NAME”, and “KARIGAR” and get successful karigar mappings; if upload/parsing fails, they see a clear English reason; after success they see a brief summary of parsed entries and the sheet(s) used.
