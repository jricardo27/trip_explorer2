# Application Audit Results

This document summarizes the findings from the comprehensive audit of the Trip Explorer application, comparing the backend capabilities, the current frontend implementation, previous user requests, and the archived version of the app.

## 1. Backend Features Not fully utilized in Frontend

Many backend capabilities are defined in the Prisma schema but are either not exposed in the UI or have missing functionality.

| Feature Area   | Backend Capability (Prisma)                                | Current Frontend Usage | Gap                                                                                                                            |
| :------------- | :--------------------------------------------------------- | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Activities** | `linkedGroupId`                                            | None                   | Intended for "soft copies" (shared activity data). Backend service has logic, but frontend lacks UI to trigger "Copy as Link". |
| **Activities** | Fields: `phone`, `email`, `website`, `openingHours`        | Limited                | These fields are in the schema but not editable in the `ActivityDialog`.                                                       |
| **Transport**  | `TransportAlternative` (waypoints, pros/cons, feasibility) | Basic                  | Frontend uses a simpler `TransportSegment` instead of the full alternatives logic.                                             |
| **Expenses**   | `splitType`, `ExpenseSplit`                                | Basic (shared toggle)  | Backend supports custom splits (percentage, per-person amounts), frontend only has a global toggle.                            |
| **Budgets**    | `Budget` model with `alertThreshold`                       | None                   | Backend has service/controller; frontend lacks UI for setting or monitoring category-based budgets.                            |
| **Checklists** | `TripChecklistItem`, `ChecklistTemplate`                   | None                   | Backend has service/controller; frontend needs a dedicated "Preparation" tab.                                                  |
| **Packing**    | `TripPackingItem`, `PackingListTemplate`                   | None                   | Backend has service/controller; frontend needs a dedicated "Packing" tab.                                                      |
| **Documents**  | `TripDocument`                                             | None                   | Backend has service/controller; frontend needs a dedicated "Documents" tab with upload/link capability.                        |

## 2. Unimplemented User Requests

Status of specific previously requested items:

- [ ] **Viewer role enforcement**: `canEdit` logic exists but needs a comprehensive audit across all interactive components (especially `TripMap` handles and `ActivityList` actions).
- [/] **Soft copy for activities**: Backend logic is mostly there; frontend implementation is pending.
- [/] **Map coordinate pre-fill**: Implementation verified in `ActivityDialog`, but needs testing to ensure it works in all contexts (e.g. Activity List vs Map right-click).
- [x] **Auto-opening trips**: Verified as implemented in `TripList.tsx`.
- [x] **Accessible shared trips**: Backend has logic to link memberships by email during signup; verified in `AuthController.ts` and `GoogleAuthController.ts`.
- [x] **Activity Participants**: Verified as implemented in `ActivityDialog.tsx` and `ActivityService.ts`.

## 3. Features Missing from Archived App (\_archive_old)

- **Saved Features Drawer**: A "library" of locations and activities that can be reused across multiple trips.
- **Trip Comparison**: A view to compare statistics and routes across different trips.
- **PWA Support**: Offline capabilities and home screen installation shortcuts.
- **Transport Connector**: Visual indicators on the map for the "connection" between two points.

## 4. Technical Debt / Potential Issues

- **Syncing Status**: `ActivityStatus` enums slightly differ between frontend (`BOOKED`, `CONFIRMED`) and backend (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `SKIPPED`).
- **Translation Coverage**: Multi-language support needs to be extended to all new features (Checklists, Documents, etc.).
