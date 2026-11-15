# Aster evidence register

This register describes public references bundled in the application and the boundaries applied to them. The five challenge resources supplied on 2026-11-15 were reviewed against Aster’s scenarios, source library, and claims. Summaries are curated for an educational demonstration. Aster bundles a small, attributed four-row NASA RadLab API excerpt for context; it is never presented as a personal crew measurement. No source validates Aster’s scenario rules.

## Reference sources

| ID | Source | Used for | Does not support |
|---|---|---|---|
| `nasa-hazards` | [NASA Human Research Program: Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | Shows the system-level framework used in Help & sources and explains that hazards can interact. Scenario reviews keep relevant context visible and avoid treating one measure or a timing overlap as proof of cause. | One combined risk score, individual diagnosis, or Aster-specific alert thresholds. |
| `nasa-risks` | [NASA Human Research Program: Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) | Distinguishes specific physiological, behavioral-performance, and radiation risks and notes that effects depend on destination. Used to state the limits of Aster’s small indicator set. | That Aster assesses every listed risk, applies NASA risk models, or diagnoses an individual. |
| `nasa-ongoing-research` | [NASA Human Research Program: Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Research context for sleep, activity, wellbeing, standardized observations, immune work, and broader multi-system studies. It supports showing context alongside measures and identifying what is outside Aster’s coverage. | That Aster reproduces a NASA study, uses NASA’s research instruments, or has enough data to assess immune, bone, eye, or other unmeasured systems. |
| `csa-radiation-monitoring` | [Canadian Space Agency: Monitoring radiation for astronaut health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Describes continued development of the Canadian Active Neutron Spectrometer (CANS), a compact autonomous instrument designed for neutron-radiation measurement. Its relevance is instrument type, measurement coverage, and source context; Aster links it from radiation references. | Aster’s historical NASA RadLab readings being CANS data, a fictional crew dose, a deployed instrument reading, a health outcome, or a dose estimate for missing intervals. |
| `csa-space-science` | [Canadian Space Agency: Why Do We Conduct Science Experiments in Space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Broad context on ISS research to prepare for deep-space missions and study human-body changes. Listed as research background, separate from individual crew guidance. | An individual diagnosis, treatment recommendation, validation of Aster’s rules, or endorsement of Aster. |
| `nasa-fatigue` | [NASA Human Research Roadmap: Psychomotor Vigilance Test](https://humanresearchroadmap.nasa.gov/Tasks/task.aspx?i=714) | Research context for vigilance, sleep timing/quality, fatigue, and stress; links to NASA’s in-flight Reaction Self-Test work. | Equivalence between Aster’s 60-second interaction and NASA’s validated research instrument, or an operational readiness result. |
| `nasa-cabin-co2` | [NASA OCHMO Technical Brief: Carbon Dioxide](https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/) | Why cabin CO₂ is monitored and why closed-environment measurements need instrument and time context. | A clinical interpretation of Aster’s fictional ppm values or proof that a symptom was caused by CO₂. |
| `nasa-radlab` | [NASA OSDR RadLab API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) and [release history](https://visualization.osdr.nasa.gov/radlab/gui/knowledgebase/Release_history) | Four archived ISS DosTel API rows preserve instrument ID, source timestamp, absorbed-dose-rate value/unit, spacecraft, exact query, retrieval time, and RadLab portal release 1.1.2. | Personal astronaut dose, current exposure, missing-interval exposure, a health outcome, or a clinical threshold. |
| `nasa-medical-autonomy` | [NASA Technical Reports Server: Autonomous Medical Officer Support](https://ntrs.nasa.gov/citations/20220014327) | Background for onboard, just-in-time medical guidance in communications-limited environments. | That Aster is an approved medical procedure or NASA-sponsored decision-support tool. |

## Data register

| Data in Aster | Origin | Provenance shown | Comparison rule |
|---|---|---|---|
| Recovery vital signs, sleep, and mood | Authored fictional fixture | “Fictional scenario data” | Numeric records only; at least seven matched historical days. |
| Cabin sensor events and headache check-in | Authored fictional fixture | “Synthetic cabin telemetry” / “Fictional scenario check-in” | Time-linked only; no causal conclusion. |
| Radiation values and data gap | Authored fictional fixture | “Synthetic dosimeter replay” | Instrument/unit context only; no dose calculation. |
| Historical radiation reference | Four rows returned by the [NASA RadLab API query](https://visualization.osdr.nasa.gov/radlab/api/?absorbed_dose_rate%3E2=&altitude=&b=&flux=&format=html&instrument=DosTel&l=&latitude=&longitude=&spacecraft=ISS&timestamp%3C2022-04-02T01:05=&timestamp%3E=2022-04-01T23:00) | `NASA Open Science Data Repository · RadLab API`, ISS, DosTel1/DosTel2, source timestamps preserved verbatim, source unit `μGy/hour`, retrieved 2026-11-12, portal release 1.1.2 | External historical instrument context only. Not mixed into fictional personal measurements, clinical evaluation, or gap estimates. |
| Presenter-selected follow-ups | User-selected local branches | “Presenter-controlled branch” | Added as new records; prior records retained; no automatic resolution. |
| Manual browser/desktop scenario entry | User-entered demonstration data | “Crew entered · fictional scenario” | Included only when quality, unit, method, conditions, and phase match. |
| Bluetooth heart-rate samples | Connected standard BLE monitor | “Live Bluetooth measurement” and device method | Saved separately from synthetic workspaces; marked verification-required until conditions are recorded. |
| Reaction session | Local pointer/keyboard interaction | Version `aster-rst-demo-1`, input `pointer` | Comparisons require same version and input method; incomplete sessions are discarded. |
| Simulated handoff states | Presenter clock | “Local-only handoff” / simulated delivery | Local demonstration only; no real recipient or transport. |

## Rule note

The personal-history comparison uses a 14-day reference window preceding a three-day assessment window. Seven or more distinct reference days are required. The most recent observation selects the cohort; method, unit, conditions, and mission phase must match. A median and median absolute deviation define a versioned demonstration band. These parameters are a software example, not a medical threshold. The latest record’s origin, units, and time remain available in the measurement view and export.

## Application to Aster

- NASA’s hazards and risks pages provide the framing for the scenarios, not a clinical ruleset. The interface keeps hazard context distinct from observed crew data and does not combine unlike risks into a score.
- The NASA research overview supports keeping sleep, activity/workload, and self-described wellbeing available as separate context. It also motivates the explicit coverage note: six indicators do not amount to a complete spaceflight health assessment.
- In the radiation review, the CSA CANS article is a separate research reference. It is not the instrument behind the bundled NASA RadLab excerpt or the fictional mission readings. All three remain distinguishable by source and instrument.
- The CSA space-science overview is general background. It is not used to derive a threshold, action, or treatment.
- Source summaries are brief paraphrases with direct links to their publishers. No CSA images or datasets are embedded. The linked source pages retain their own terms and notices. Aster is an independent demonstration and is not endorsed by NASA or CSA.
- These references do not change the versioned assessment thresholds or automatic guidance. They help explain the limits and context around the records; the rules remain authored demonstration logic.

## Research/data status

- No external API feed or ground communication is configured at runtime. The bundled NASA excerpt works offline.
- RadLab response timestamps are preserved as returned; the API table does not include an explicit UTC offset, so Aster does not localize or convert them. Values are displayed without numeric transformation; the source field documentation gives absorbed-dose-rate units in μGy/hour.
- The NASA OSDR FAQ requests credit to the RadLab Portal and a version number for visualizations. Aster shows “Data and visualizations courtesy of the RadLab Portal, Version 1.1.2,” the retrieval date, and a link to the exact source query.
- Only four selected rows are bundled; the full NASA data service is not mirrored. The fictional dosimeter fixture and the NASA reference remain separate records.
- The bundled source-preserving excerpt is `docs/design-review/src/aster/radlabExcerpt.ts`; SHA-256: `86897347991E3E68426D679C892DC6B10C4452E86802846CA8D37DAF94D2DAD2`.
- Source URLs are opened by the user and may require a network connection. Cached summaries and scenarios remain available offline.
- Before adapting any NASA dataset, record the query, retrieval time, instrument, units, time zone, license/reuse terms, filtering, transformation, and checksum. Do not infer a personal dose from RadLab records.
