# Agent Instructions

This repository contains a React and TypeScript project. Please adhere to the following guidelines when making changes:

## General Best Practices

- Follow standard software engineering best practices.
- Write clean, maintainable, and well-documented code.
- Ensure all tests pass before submitting changes.

## TypeScript and React Specifics

- **No Semicolons:** Do not use semicolons at the end of statements.
- **Type Annotations:** Always use type annotations for function parameters, and return types. For variables, leverage type inference and only add explicit types when the type is not obvious from the assigned value.
- **Avoid `any`:** Do not use `any` as a type annotation. Strive for more specific types whenever possible. If you must use `any`, provide a comment explaining why.
- **React Best Practices:** Follow standard React best practices, such as using functional components with hooks where appropriate.

## Comments

- **Minimal Comments:** Keep comments to a minimum. Code should be self-documenting as much as possible.
- **Focus on "What" and "Why", not "How":** Comments should explain _what_ the code is doing or _why_ a particular approach was taken, if it's not obvious. Avoid comments that merely describe _how_ the code works, as this should be clear from the code itself.
- **No Agent Action Comments:** Do not include comments that document your actions as an agent (e.g., "Agent added this function").
- **No Import Comments:** Comments on import statements are generally not necessary.

## Testing

- Write unit tests for all new features and bug fixes.
- Ensure all tests pass before submitting changes.

By following these guidelines, we can maintain a high-quality and consistent codebase.

Transport modes:
Transport modes are similar to activities, they have a start time but instead of end time they have a duration time.
They must be placed between two activities, if one of the activities is moved, the transport mode is no longer visible.
For more details look into \_archive_old/src_old

Pre-Trip Checklist Creator:
A customizable to-do list for preparations (e.g., book visas, buy insurance, confirm vaccinations). Users can add, check off, and categorize items (e.g., by deadline or priority).
There's a default list of global suggeted items, more items can be added to it.
Each trip have a selected list of item, users can add more custom items to it without being added to the global list.

Packing List Generator:
A tool to create and manage packing lists based on trip details (e.g., duration, activity types, number of members). Users input categories (clothing, gear, documents), and the app generates a printable/exportable list. Include checkboxes for tracking and quantity fields;
Similar to the pre-tip checklist, a global and a per-trip list.

Budget Analyzer and Forecaster:
Expand your expense tab with a summary dashboard showing total estimated vs. actual costs, breakdowns by category (e.g., food, transport), and per-person splits.

Route Optimizer:
Since you have a map and location coords, add a utility to calculate and display optimal routes between activities (e.g., shortest path by distance or time). Implement basic algorithms like sorting by proximity (using coordinate distance formulas in JS) and visualize on your existing map without external routing services but leave it open to use Google map route api.

Time Zone and Schedule Adjuster:
A converter for handling multi-location trips. Users input locations, and the app adjusts activity times across time zones using built-in JS Date APIs. This prevents overlaps and helps with jet lag planning.

Collaboration Mode for Trip Members:
Add version history to track changes.

Document and File Organizer:
A section to upload and categorize trip-related files (e.g., tickets, reservations, scans). For now, allow to add links to cloud shared documents.

Journal and Reflection Log:
A daily or activity-based notes section for post-trip reviews (e.g., what went well, adjustments for next time). Expand your existing notes field into a searchable log with timestamps, photos (user uploads), and export options.

Printable/Exportable Reports: One-click generation of PDF or printable views for the full itinerary, timeline, expenses, and checklists. Use browser print styles (CSS media queries) or JS to create downloadable summaries without external tools.

Alert and Validation System: Built-in checks for common issues, like activity overlaps, budget overruns, or missing details (e.g., no location for an activity). Display warnings in the UI using JS event listeners, and add user-settable reminders (e.g., pop-ups for upcoming deadlines).

Trip History and Templates: Save completed trips as templates for reuse. Users can archive past itineraries, view summaries (e.g., total costs, favorite activities), and duplicate them for new plans. This uses your existing data structure stored locally or in a database.

Accessibility and Customization Settings: font size adjustments, or keyboard shortcuts for drag-and-drop. Also, user profiles to save preferences across trips.
