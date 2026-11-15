# What you can do with Aster

Aster guides a crew member through a simple review: notice a change, inspect its context, decide what to do next, and return to the result. This guide describes the current demonstration screens and scenarios in everyday language.

## The main workspace

### Home

See which health reviews need attention, which follow-ups are due, and what has recently been recorded. Choose a review to open the relevant readings and evidence.

### My readings

Browse six kinds of crew record: resting heart rate, blood pressure, blood glucose, body temperature, sleep duration, and a mood check-in. Add an entry with its time, collection method, conditions, and any source details. Optional supported Bluetooth heart-rate samples are stored separately from the scenario records.

When enough comparable history is available, Aster can show how recent values differ from that crew member’s own earlier pattern. The demo uses at least seven matching days from the previous 14-day period and looks at a recent three-day period. Matching includes the measurement unit, method, conditions, and mission phase. If the records are missing, stale, incomplete, or incompatible, the app asks for review instead of treating them as reassuring.

This is a historical comparison, not a clinical reference range. It cannot explain why a value changed.

### Health reviews

Each guided review brings together the observation, relevant mission events, data-quality details, and a suggested next action. Open **Why this suggestion?** to see the records and rule information behind it. The rules are demonstration logic, not medically validated thresholds.

The three included reviews are:

| Review | What the scenario demonstrates | What remains unknown |
|---|---|---|
| Recovery and fatigue | Shorter sleep, a higher resting pulse than the crew member’s recent pattern, and workload context. The optional reaction check adds another recorded observation. | The records do not identify a cause or determine whether someone is fit for duty. |
| Cabin environment | A fictional cabin carbon-dioxide sensor event appears near a fictional headache check-in. Instrument source, timing, and quality can be inspected. | The timing overlap does not prove exposure or explain the symptom. |
| Radiation context | Fictional dosimeter entries and a visible data gap appear separately from a small historical NASA RadLab ISS/DosTel excerpt. | The records do not calculate an astronaut’s personal dose or fill in an unknown interval. |

### Anatomy view and source library

The reference anatomy view helps orient selected readings to a body area. It is a visual reference only. Aster does not assess body systems for which the scenario has no data.

**Help & sources** contains measurement guides and short summaries of NASA and Canadian Space Agency research. Each summary links to its publisher and explains what it can and cannot tell you about Aster. The linked research does not validate Aster’s rules and the agencies do not endorse this project.

### Care plan and reassessment

Create a routine action or a measurement follow-up, choose when it is due, and record what happened. A repeat reading stays connected to the original reading so the two can be reviewed together. The user must review a result and close an investigation explicitly; completing a task does not imply that a concern has resolved.

### History, export, and local handoff

Use History to search and filter the timeline, inspect earlier records, and select what to include in an HTML or JSON export. Private notes are left out by default.

Medical support can prepare an editable summary for a later review. In this prototype it is saved locally. The queued, transmitted, received, and reviewed handoff states are driven by a demonstration mission clock. **No communication is sent to Earth, a clinician, or a mission-control system.**

## What stays on the device

The browser version stores its records in the current browser on the current device. The Windows desktop version uses a local SQLite database. There is no account, cloud health service, or synchronization between devices. The hosted browser page itself needs internet to load; its scenario fixtures and source summaries are bundled with the app.

## What Aster is not

Aster is an educational prototype. It is not a medical device, diagnostic system, or treatment guide. It does not provide medication or emergency-procedure instructions, calculate a health score or personal radiation dose, or predict future health. The included crew, symptoms, cabin events, and mission readings are fictional. The limited historical NASA data excerpt is clearly marked as reference data and kept separate from the fictional crew.
