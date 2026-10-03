# Foundation Coverage Audit

Date: 2026-10-03

## Purpose

This document is the baseline for migrating Happy Workspace modules onto the locked Foundation systems.

Canonical shared systems:
- Table List Foundation
- Navigation Rule
- Comparison Card Rule
- Action System
- Spacing System
- Surface System
- Workspace Navigation System
- Motion System
- Typography System

The audit is intentionally structural. A high duplicate-selector count does not automatically mean the UI is wrong; it indicates that the module still depends heavily on historical cascade layers and should be consolidated carefully.

## Coverage Summary

| Module | Coverage | Current condition | Priority |
| --- | --- | --- | --- |
| Dashboard | High | Mature table, spacing, typography and surface rules. Some historical header/overview duplication remains. | Low |
| Product | High | Table List, Action, Spacing, Surface and Typography largely aligned. Small legacy toolbar/form rules remain. | Low |
| Quotation | High / Medium debt | Visual Foundation is mature: workflow, comparison cards, actions, navigation and table list are locked. Historical quotation CSS still has several older geometry/shell layers. | Medium |
| Inquiry | Medium-High | Library is mature and locked. Inquiry detail/new/edit flows still contain several older local layouts and button/workflow overrides. | Medium |
| Itinerary | Medium | Functional UI is stable but editor/detail styles still contain many local hard-coded dimensions and repeated selectors. | High |
| Operation | Medium-Low | Largest duplicate-selector concentration in core workspace rows/state/queue structures. Strong candidate for the next controlled consolidation pass. | Highest |
| AI Workspace | Medium-Low | Many repeated sidebar/thread/workbench rules accumulated through iterative refinement. Visually refined but cascade-heavy. | Highest |

## Duplicate Selector Signals

Key repeated selectors found during the audit:

### Operation
- .operation-workspace-template .operation-case-row — 17 blocks
- .operation-workspace-template .operation-case-state — 8 blocks
- .operation-workspace-template .operation-empty — 6 blocks
- .operation-workspace-template .operation-queue-grid — 5 blocks
- .operation-workspace-template .operation-queue-section — 5 blocks

### AI Workspace
- .ai-thread-list — 13 blocks
- .ai-thread-item — 12 blocks
- .ai-thread-meta — 9 blocks
- .ai-lab-workbench-head — 8 blocks
- .ai-lab-compose — 8 blocks
- .ai-lab-starters — 8 blocks
- .ai-lab-context — 8 blocks

### Itinerary
- .itinerary-editor .itinerary-more-menu-popover — 7 blocks
- .itinerary-editor .itinerary-attraction-summary — 4 blocks
- several editor/detail selectors — 3 blocks each

### Inquiry
- .inquiry-detail-template .inquiry-overview-strip — 6 blocks
- .new-inquiry-template .new-inquiry-workflow-actions — 5 blocks
- .inquiry-status-card — 4 blocks
- .new-inquiry-template .new-inquiry-head — 4 blocks

### Quotation
- quotation library table geometry still appears in multiple compatibility/responsive blocks
- editor shell / save-state / header selectors retain historical layers
- these are lower risk because final Foundation authority is already explicit

## Recommended Migration Order

1. Operation workspace
2. AI Workspace
3. Itinerary editor/detail
4. Inquiry detail/new/edit
5. Quotation historical cleanup
6. Dashboard/Product final polish only

## Consolidation Rule

For each module:
1. Identify the final visual authority.
2. Separate unique layout behavior from shared Foundation behavior.
3. Merge equivalent selectors.
4. Replace shared hard-coded values with locked Foundation tokens.
5. Preserve responsive and state-specific rules.
6. Remove superseded trial blocks only after the replacement is structurally equivalent.
7. Verify production build after every controlled pass.

Do not perform a large all-at-once rewrite of globals.css.
