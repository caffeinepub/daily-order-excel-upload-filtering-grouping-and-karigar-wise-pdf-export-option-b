# Specification

## Summary
**Goal:** Fix Order List enrichment so orders correctly map to Karigar/Generic names even when design-code formatting differs, and ensure mapping changes take effect immediately without stale lookups.

**Planned changes:**
- Update design-code normalization used for matching to treat equivalent codes the same across orders and mapping uploads (case/whitespace/invisible characters + common separators like hyphens, underscores, slashes).
- Ensure the decoded/derived mapping lookup is rebuilt after successful mapping upload and when stored mapping changes so Order List uses fresh data (no hard refresh needed).
- Make mapping lookup construction resilient to older saved mapping blobs by recomputing the normalized key from the stored design value using current rules (not relying only on persisted `designNormalized`).
- Improve Order List diagnostics when a mapping is loaded but no orders match by showing a small English hint with concrete debug counts/samples (only when matchedOrders == 0 and totalOrders > 0).

**User-visible outcome:** On the Order List tab, orders whose design codes differ only by separator/formatting are enriched with Generic Name and Karigar Name; mapping updates reflect immediately, and when nothing matches the UI provides clearer English diagnostics to help identify why.
