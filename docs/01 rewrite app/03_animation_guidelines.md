# Precise, Step-by-Step Instructions for Implementing the Trip Playback Animation

Implement a "Play Trip" feature that animates the entire trip as a smooth, video-like sequence on the map. The animation must follow this exact flow, in order, for every activity in the itinerary (activities are assumed to be sorted chronologically by start time).

## Initial Overview State

When the user clicks the "Play" button:
Immediately display all activity markers on the map (if they are not already visible).
Fit the map view to show all markers comfortably with some padding around the edges (so no marker is cut off).
Keep this overview visible for 3–5 seconds (long enough for the user to see the full trip scope).
Do not start moving to the first activity until this pause is complete.

## Transition to the First Activity

After the overview pause, smoothly zoom and pan the map so that the first activity's marker is centered and the map is zoomed in closely enough to clearly see the marker and its label/pop-up (typical zoom level: street-level detail).
The animation duration for this zoom/pan should be 1.5–2 seconds (smooth but not sluggish).
Once arrived, keep the map focused on this activity for 2–4 seconds (to simulate "being there").

Travel to Each Subsequent Activity (repeat this block for every pair of consecutive activities)
a. Departure Phase
At the exact moment travel begins (after the stay duration at the current activity), smoothly zoom out and pan the map so that both the current (departure) activity marker and the next (arrival) activity marker are fully visible in the view at the same time.
The map must show enough context to clearly see the route between them.
Do not zoom out too far—keep it tight enough that the two markers and the space between them dominate the view.
This zoom-out/pan duration: 1–1.5 seconds.
b. Travel Animation Phase
Draw a straight line connecting the departure marker to the arrival marker. The line should appear immediately or fade in quickly.
Place a small transport mode icon (e.g., walking person, car, train, plane) at the exact position of the departure marker.
Animate this icon so it moves smoothly and at constant speed along the line from the departure marker to the arrival marker.
The icon must face the direction of travel (rotate it accordingly if possible).
The total travel animation duration should be proportional to real-world distance or user-configurable (default: 2–6 seconds depending on distance; short distances faster, long distances slower).
The line remains visible throughout the travel animation.
c. Arrival Phase
The moment the transport icon reaches the arrival marker, remove the icon from the map.
Immediately begin smoothly zooming in and panning so that the arrival activity marker is centered and zoomed in closely (same close level as step 2).
This zoom-in/pan duration: 1–1.5 seconds.
Once centered on the arrival activity, keep the map in this close view for 2–4 seconds (simulating time spent at the activity).
Optionally highlight or open a pop-up on the arrival marker during this stay period.

## End of Trip

After completing the arrival phase for the last activity in the itinerary, hold the close-up view on the final activity for 3–5 seconds.
Then smoothly zoom out and pan to the full overview showing all markers again (same as step 1).
Hold this final overview for 4–6 seconds.
Stop the animation completely.
Enable the "Play" button again (disable it during playback).

General Rules That Must Always Apply
Every map movement (zoom, pan) must be animated smoothly—never instantaneous jumps.
The sequence must be strictly linear: overview → first activity → travel to second → second activity → travel to third → … → final activity → back to overview. No skipping or parallel actions.
The transport mode icon and line must only appear during the travel phase between two activities and must be removed/cleaned up before zooming in on the arrival activity.
All timing (stay durations, travel speeds, transition durations) should be consistent and feel natural, not rushed or dragging.
Provide a visible progress indicator (e.g., a progress bar or "Day 2 of 5 – Visiting Eiffel Tower") so the user always knows where they are in the trip.
Include Pause, Resume, and Stop controls that work at any point in the sequence.

Follow these steps exactly in this order, with no deviations, to ensure the animation behaves precisely as described and cannot be misinterpreted.
