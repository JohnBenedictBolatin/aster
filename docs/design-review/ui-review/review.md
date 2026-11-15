# Aster UI review

Captured from the hosted Aster preview on 15 November 2026. The screenshots show the app at a 1493 × 709 content viewport, with browser chrome cropped out. This was a read-only walkthrough; no records were submitted.

## Assessment

The screens have a consistent dark palette and the gradient metric icons give the interface useful color. The review detail pages also put a concrete next action near the top. The main issue is hierarchy: small supporting text, repeated labels, and multiple destinations compete with the action the astronaut needs to take.

The previous 11 px minimum did not make the content comfortable to scan. The stylesheet still assigns 11 px to much of the body copy, labels, timestamps, and buttons, while the Doto instrument style gives the values a dotted display texture. The six values are distinctive, but the number and unit are both hard to read at a glance.

## Highest-impact findings

1. **The navigation is still crowded.** The hosted preview shows Home, My readings, Health reviews, Care plan, and History together, plus Help & sources, Medical support, Settings, and Presenter controls. That is more destinations than the agreed three primary screens and keeps Presenter controls visible after the request to remove them. This is a product and hierarchy mismatch, not only a font issue.

2. **Home shows too many competing areas at once.** The first view includes the active review, six reading tiles, a trend, and the beginning of the body reference and activity sections. Keep the current concern and one next step dominant; move the full reading set, chart, anatomy, and history behind their relevant destinations or disclosures.

3. **History repeats events across review contexts.** The visible timeline shows the same dosimeter, cabin sensor, and daily readings as separate rows for crew recovery, cabin environment, and radiation context. The displayed 79-event count therefore overstates the number of distinct events. Show each event once and link it to any related reviews.

4. **The text scale has too many small levels.** Main titles are clear, but supporting copy, timestamps, status labels, and controls are very small and low contrast across Home, My readings, History, and Help & sources. A better starting scale is 14–16 px for body copy, 12–13 px for secondary metadata, and 13–14 px for controls. Keep Doto for the numeric portion of readings, enlarge it, and render units in the system sans font.

5. **Dialog positioning and sizing are inconsistent.** Add entry and its forms sit against the left edge of the app, while urgent guidance is centered. The reading form also reaches the bottom of the viewport with its Save record action partly clipped. Use one centered dialog container with a viewport-bounded height, a scrollable form body, and a visible footer.

6. **The symptom form repeats a field label.** “What would you like to record?” labels both the check-in selector and the text area. Name the selector “Check-in type” and the text area “What did you notice?” so each control has a distinct purpose.

7. **Some layouts leave actions far from their content.** The review list puts each Open review button at the far right of a wide row, and the empty Care plan page leaves a lone Open health reviews button detached from its empty state. Keep actions visually attached to the information they act on; hide empty sections that have no useful content.

8. **Review details have a useful structure, but too many labels.** “Open review,” “What changed?,” “Your next step,” and the side rail for “Other actions” and “Finish or reopen” all appear together. Retain the finding and primary action, then let the supporting observations, history, and lifecycle controls stay collapsed until requested.

## Screen notes

| Screen | Notes | Capture |
|---|---|---|
| Home | Current review and readings compete for first attention; lower sections begin below the fold. | [home.jpg](screenshots/home.jpg) |
| My readings | Six metric tabs, a large value, several disclosures, and a long repeated record list create a dense scan path. | [my-readings.jpg](screenshots/my-readings.jpg) |
| Health reviews | The three review summaries are easy to distinguish, but their actions sit far from the summaries. | [health-reviews.jpg](screenshots/health-reviews.jpg) |
| Recovery review | Strong next action; small status labels and a competing right rail. | [recovery-review.jpg](screenshots/recovery-review.jpg) |
| Cabin review | Useful separation of the finding, uncertainty, and instrument check; supporting sections extend down the page. | [cabin-review.jpg](screenshots/cabin-review.jpg) |
| Radiation review | “What changed,” “What is still unclear,” and the next step provide a clear sequence. | [radiation-review.jpg](screenshots/radiation-review.jpg) |
| Care plan | Empty state repeats explanatory copy and shows two empty sections. | [care-plan.jpg](screenshots/care-plan.jpg) |
| Mission history | Repeated events, small metadata, and context labels spread across the full width. | [mission-history.jpg](screenshots/mission-history.jpg) |
| Help & sources | Source list is readable as a hierarchy, but labels remain small and the full-width Explore body action distracts from the library. | [help-and-sources.jpg](screenshots/help-and-sources.jpg) |
| Medical support | Urgent guidance is prominent and actionable; category labels and descriptive text are small. | [medical-support.jpg](screenshots/medical-support.jpg) |
| Settings | Clear two-column grouping, but explanatory text and export options are small compared with the available space. | [settings.jpg](screenshots/settings.jpg) |
| Add entry | Good two-choice starting point; dialog is left aligned rather than centered. | [add-entry.jpg](screenshots/add-entry.jpg) |
| Reading entry | The form is tall and its footer is clipped at this viewport. | [reading-entry.jpg](screenshots/reading-entry.jpg) |
| Symptom entry | The duplicated question label makes the selector and text area ambiguous. | [symptom-entry.jpg](screenshots/symptom-entry.jpg) |
| Urgent guidance | This dialog is centered, confirming that modal placement differs by dialog type. | [urgent-guidance.jpg](screenshots/urgent-guidance.jpg) |

## Recommended screen order

Use one repeatable reading order on each page:

1. Screen title and one-sentence purpose.
2. The current finding or status.
3. One primary action with a short reason.
4. Supporting observations.
5. Optional details and sources, collapsed by default.

The largest first fixes are removing duplicate navigation and repeated history rows, increasing the supporting type scale, and making all dialogs centered and viewport-safe. Those changes address the actual clutter without removing the useful measurements or evidence.
