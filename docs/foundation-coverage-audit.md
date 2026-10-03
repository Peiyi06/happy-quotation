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
| Operation | High | Queue/list, header, toolbar, scope switch and review surfaces are consolidated onto locked Foundation systems. Remaining older base declarations are compatibility-only and no longer define final presentation. | Low |
| AI Workspace | High | Phase 1 consolidated thread, workbench, composer, starter and context presentation under the locked Foundation. Remaining duplicate signals are primarily responsive/state scopes and global typography authority. | Low |

## Duplicate Selector Signals

Key repeated selectors found during the audit:

### Operation
- .operation-workspace-template .operation-case-row — 17 blocks
- .operation-workspace-template .operation-case-state — 8 blocks
- .operation-workspace-template .operation-empty — 6 blocks
- .operation-workspace-template .operation-queue-grid — 5 blocks
- .operation-workspace-template .operation-queue-section — 5 blocks

### AI Workspace
Phase 1 post-consolidation signals:
- .ai-thread-list — base presentation split by responsibility plus desktop/short-viewport/mobile scopes
- .ai-thread-item — canonical base + short-viewport density scope
- .ai-thread-meta — canonical base; unlinked state remains separate
- .ai-lab-workbench-head — canonical base + tablet/mobile scopes
- .ai-lab-compose — canonical base + responsive scopes; typography remains owned by the global Foundation Typography layer
- .ai-lab-starters — canonical base + tablet/mobile scopes; typography remains owned by the global Foundation Typography layer
- .ai-lab-context — canonical rail shell + desktop sticky/mobile/collapse motion scopes
- .ai-lab-context-section — single canonical base block
- .ai-lab-context-head — canonical base + mobile scope

Residual duplicate counts are intentional when they represent responsive/state behavior or cross-page Foundation typography authority.

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

1. AI Workspace
2. Itinerary editor/detail
3. Inquiry detail/new/edit
4. Quotation historical cleanup
5. Dashboard/Product final polish only

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

## AI Workspace Phase 1 Lock

Status: Locked — Phase 1 complete.

Completed:
- Thread presentation was consolidated under the final Sidebar Foundation authority.
- Superseded thread presentation layers were removed without changing thread/context/memory/action behavior.
- The right rail remains governed by the Apple/iOS + Foundation visual system already approved in the live UI.
- Production deployment for the thread consolidation passed.

Locked constraints for the remaining AI Workspace cleanup:
- Do not flatten responsive or state-scoped rules into base selectors.
- Do not change confirm-before-write behavior.
- Do not redesign the current AI Workspace.
- Preserve sidebar collapse, empty-state, reduced-motion, short-viewport, and mobile behavior.
- Remove historical overrides only when their final computed effect is already represented by the canonical Foundation rule.

Audit rule:
- Duplicate selector counts are signals, not automatic deletion targets.
- Media/state-specific duplicates are allowed when they express real responsive or interaction behavior.
- A consolidation pass must preserve selector scope and cascade order.


### AI Workspace Phase 1 Final Audit

Final audit result: PASS.

The remaining repeated selectors are not treated as historical presentation debt when they are scoped to:
- short desktop viewport density
- tablet/mobile layout
- desktop sticky rail behavior
- sidebar collapse and motion
- empty-state layout
- global Foundation Typography authority

Phase 1 is locked. Future AI Workspace work should extend the canonical Foundation rules or add explicit state/responsive modifiers rather than append new unscoped presentation overrides.
