import { METRICS, METRIC_ORDER, type ContextEntry, type Dataset, type Followup, type Metric, type Observation, makeId } from '../domain.ts';
import { RADLAB_EXCERPT } from './radlabExcerpt.ts';

export type ScenarioId = 'recovery' | 'cabin' | 'radiation';
export type InvestigationStatus = 'open' | 'awaiting-measurement' | 'awaiting-reassessment' | 'ready-for-review' | 'closed';
export type MissionEventKind = 'workload' | 'environment' | 'exposure' | 'check-in' | 'measurement' | 'action' | 'handoff' | 'reaction';

export type MissionEvent = {
  id: string;
  at: string;
  scenarioId: ScenarioId;
  kind: MissionEventKind;
  title: string;
  detail: string;
  provenance: string;
  synthetic: boolean;
  private?: boolean;
};

export type Investigation = {
  id: string;
  scenarioId: ScenarioId;
  title: string;
  status: InvestigationStatus;
  openedAt: string;
  lastUpdatedAt: string;
  acknowledged: boolean;
  note: string;
};

export type EvidenceReference = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  summary: string;
  appliesTo: ScenarioId[];
};

export type BaselineComparison = {
  metric: Metric;
  unit: string;
  median: number | null;
  low: number | null;
  high: number | null;
  recentMedian: number | null;
  change: number | null;
  count: number;
  recentCount: number;
  state: 'shifted' | 'within-history' | 'insufficient' | 'verify';
  explanation: string;
  referenceIds: string[];
  recentIds: string[];
};

export type ReactionSession = {
  id: string;
  scenarioId: ScenarioId;
  version: 'aster-rst-demo-1';
  input: 'pointer' | 'keyboard' | 'mixed';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  responsesMs: number[];
  missed: number;
  premature: number;
  interrupted: boolean;
};

export type CabinReading = {
  id: string;
  at: string;
  value: number;
  unit: 'ppm';
  instrument: string;
  quality: 'usable' | 'verify';
  synthetic: true;
};

export type RadiationReading = {
  id: string;
  at: string;
  value: number;
  unit: string;
  instrument: string;
  quality: 'usable' | 'verify';
  synthetic: boolean;
  spacecraft?: string;
  source?: string;
  sourceUrl?: string;
  retrievedAt?: string;
  portalVersion?: string;
};

export type Handoff = {
  id: string;
  scenarioId: ScenarioId;
  status: 'queued' | 'transmitted' | 'received' | 'reviewed';
  queuedAt: string;
  deliverAt: string | null;
  privateNotes: string;
  includePrivateNotes: boolean;
  summary: string;
};

export type ScenarioWorkspace = {
  reviewProgress?: { version: 1; skipped: string[]; inspections: Record<string, boolean> };
  observations: Observation[];
  contexts: ContextEntry[];
  tasks: Followup[];
  checklist: Record<string, boolean>;
  investigations: Investigation[];
  events: MissionEvent[];
  cabinReadings: CabinReading[];
  radiationReadings: RadiationReading[];
  reactionSessions: ReactionSession[];
  handoffs: Handoff[];
};

export type AsterSnapshot = {
  schemaVersion: 2;
  activeScenario: ScenarioId;
  scenarioNow: string;
  scenarioTimes: Record<ScenarioId, string>;
  liveObservations: Observation[];
  workspaces: Record<ScenarioId, ScenarioWorkspace>;
  settings: {
    missionStart: string;
    phase: string;
    linkDelayMinutes: number;
    presenterOpen: boolean;
  };
};

export const RULE_VERSION = 'aster-personal-baseline-demo-v1';

export const SCENARIOS: Record<ScenarioId, { label: string; title: string; brief: string; lead: string }> = {
  recovery: {
    label: 'Crew recovery', title: 'Sleep and resting pulse have shifted',
    brief: 'Three days of shorter sleep coincide with a resting pulse above this crew member’s recent pattern. The records show a change; they do not identify its cause.',
    lead: 'Review the evidence, record how you feel, and choose a follow-up.',
  },
  cabin: {
    label: 'Cabin environment', title: 'Check an environmental reading with symptoms',
    brief: 'A cabin sensor event and a crew member’s symptom report overlap in time. Check the instrument and follow the configured environmental review path.',
    lead: 'Timing can guide a review; it cannot show that the sensor caused a symptom.',
  },
  radiation: {
    label: 'Radiation context', title: 'Review mission exposure records',
    brief: 'Inspect the instrument, measurement units, and data gaps. Mission or reference radiation readings are not the crew member’s personal dose.',
    lead: 'Separate measured records, context, and unknowns before preparing a handoff.',
  },
};

export const EVIDENCE: EvidenceReference[] = [
  { id: 'nasa-hazards', title: 'The five hazards of human spaceflight', publisher: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/hazards/', summary: 'NASA groups spaceflight hazards into radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments. These hazards can interact; timing or a single reading cannot identify a cause.', appliesTo: ['recovery', 'cabin', 'radiation'] },
  { id: 'nasa-risks', title: 'Risks of human spaceflight', publisher: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/risks/', summary: 'NASA describes health risks across physiology, behavioral performance, and radiation, with effects that vary by destination. Aster uses this as context only: it does not score these risks or diagnose them.', appliesTo: ['recovery', 'cabin', 'radiation'] },
  { id: 'nasa-ongoing-research', title: 'Ongoing human research', publisher: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/', summary: 'NASA research examples include tracking sleep, activity, and wellbeing; standardizing crew observations; and studying immune changes. Aster’s six readings cover only a small part of this work and are not a full health assessment.', appliesTo: ['recovery', 'cabin', 'radiation'] },
  { id: 'csa-space-science', title: 'Why conduct science experiments in space?', publisher: 'Canadian Space Agency', url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp', summary: 'The CSA explains how ISS research helps prepare for deep-space missions and study changes in the human body. This is research context, not a clinical rule or treatment recommendation for an individual crew member.', appliesTo: ['recovery', 'cabin', 'radiation'] },
  { id: 'nasa-fatigue', title: 'Psychomotor Vigilance Test on ISS', publisher: 'NASA Human Research Roadmap', url: 'https://humanresearchroadmap.nasa.gov/Tasks/task.aspx?i=714', summary: 'NASA describes a reaction self-test used to study vigilance, sleep timing and quality, fatigue, and stress during ISS missions. Aster’s separately authored check is not that test.', appliesTo: ['recovery'] },
  { id: 'nasa-cabin-co2', title: 'Carbon dioxide in crewed vehicles', publisher: 'NASA Office of the Chief Health and Medical Officer', url: 'https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/', summary: 'NASA discusses carbon-dioxide monitoring and potential effects in closed spacecraft environments. A symptom and timestamp do not establish exposure or cause.', appliesTo: ['cabin'] },
  { id: 'csa-radiation-monitoring', title: 'Monitoring radiation for astronaut health', publisher: 'Canadian Space Agency', url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp', summary: 'The CSA describes continued development of CANS, a compact instrument designed for continuous, autonomous neutron-radiation monitoring. It illustrates why instrument type and coverage matter; it is separate from Aster’s historical NASA RadLab records and supplies no personal dose for this demo.', appliesTo: ['radiation'] },
  { id: 'nasa-radlab', title: 'RadLab radiation data API', publisher: 'NASA Open Science Data Repository', url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/', summary: `Aster includes a four-row ISS DosTel excerpt from RadLab portal release ${RADLAB_EXCERPT.portalVersion}. It preserves source instrument IDs, timestamps, and absorbed-dose-rate values as external historical context; it is not a personal astronaut measurement.`, appliesTo: ['radiation'] },
  { id: 'nasa-medical-autonomy', title: 'Autonomous Medical Officer Support', publisher: 'NASA Technical Reports Server', url: 'https://ntrs.nasa.gov/citations/20220014327', summary: 'NASA evaluated just-in-time procedure guidance to support medical activities when real-time communication from Earth is unavailable or delayed.', appliesTo: ['recovery', 'cabin', 'radiation'] },
];

const SCENARIO_NOW = Date.UTC(2026, 1, 17, 18, 0, 0);
const MS_DAY = 86_400_000;
const SCENARIO_START = Date.UTC(2026, 1, 1, 0, 0, 0);
const scenarioDate = (day: number, hour: number) => new Date(SCENARIO_START + day * MS_DAY + hour * 3_600_000).toISOString();

const METRIC_CONTEXT: Record<Metric, string> = {
  heart: 'At rest · seated', bp: 'Seated · at rest', glucose: 'Fasting',
  temperature: 'Oral', sleep: 'Main sleep period', mood: 'At this check-in',
};

function crewObservation(metric: Metric, day: number, value: number | string, at: string, phase = 'Transit') : Observation {
  return {
    id: `FIXTURE-${metric}-${day}`, metric, value, unit: METRICS[metric].unit,
    at, method: metric === 'sleep' || metric === 'mood' ? 'Crew check-in' : 'Crew self-measurement',
    context: METRIC_CONTEXT[metric], note: '', source: 'Scenario record',
    synthetic: true, dataset: 'demo' as Dataset, quality: 'usable', guidanceVersion: 'Aster scenario rules v1',
    missionPhase: phase,
    provenance: { kind: 'scenario-fixture', label: 'Scenario record' },
  };
}

function event(scenarioId: ScenarioId, kind: MissionEventKind, day: number, hour: number, title: string, detail: string, provenance: string): MissionEvent {
  return { id: `EVENT-${scenarioId}-${day}-${kind}`, at: scenarioDate(day, hour), scenarioId, kind, title, detail, provenance, synthetic: true };
}

export function makeScenarioWorkspace(scenarioId: ScenarioId): ScenarioWorkspace {
  const observations: Observation[] = [];
  for (let day = 0; day <= 16; day++) {
    const sleep = day >= 14 ? [5.5, 4.8, 4.3][day - 14] : 7.0 + [0.1, 0, 0.2, -0.1, 0.2, 0, -0.2][day % 7];
    const heart = day >= 14 ? [75, 81, 84][day - 14] : 70 + [0, 1, -1, 0, -1, 1, 0][day % 7];
    observations.push(crewObservation('sleep', day, Number(sleep.toFixed(1)), scenarioDate(day, 6)));
    observations.push(crewObservation('heart', day, Math.round(heart), scenarioDate(day, 8)));
    observations.push(crewObservation('bp', day, 116 + day % 4, scenarioDate(day, 9)));
    observations.push(crewObservation('temperature', day, Number((36.5 + (day % 3) * 0.1).toFixed(1)), scenarioDate(day, 9.2)));
    observations.push(crewObservation('glucose', day, 88 + day % 7, scenarioDate(day, 9.4)));
    if (day < 14 || day === 14) observations.push(crewObservation('mood', day, day > 13 ? 'Okay' : day % 4 === 0 ? 'Good' : 'Okay', scenarioDate(day, 9.6)));
  }

  const investigations: Investigation[] = Object.entries(SCENARIOS).map(([key, info]) => {
    const openedAt = scenarioDate(14, 12);
    return { id: `INV-${key}`, scenarioId: key as ScenarioId, title: info.title,
      status: key === 'recovery' ? 'open' : 'ready-for-review', openedAt, lastUpdatedAt: openedAt,
      acknowledged: false, note: '' };
  });

  const events: MissionEvent[] = [
    event('recovery', 'workload', 13, 13, 'Shift extended', 'Workload note · crew-recorded mission context.', 'Crew schedule'),
    event('recovery', 'workload', 14, 13, 'Rest period shortened', 'Schedule note · crew-recorded mission context.', 'Mission timeline'),
    event('recovery', 'workload', 15, 13, 'Workload remains elevated', 'Review workload alongside recent rest and sleep.', 'Mission timeline'),
    event('cabin', 'environment', 15, 10, 'Cabin sensor event', 'Check instrument status and source.', 'Cabin telemetry'),
    event('cabin', 'check-in', 15, 10.1, 'Crew reports a headache', 'Crew symptom check-in.', 'Crew check-in'),
    event('cabin', 'environment', 16, 10, 'Cabin sensor event', 'Reading repeated; timing alone does not establish cause.', 'Cabin telemetry'),
    event('radiation', 'exposure', 14, 11, 'Dosimeter context captured', 'Instrument record · not a personal health measurement.', 'Dosimeter record'),
    event('radiation', 'exposure', 15, 11, 'Radiation record gap', 'Instrument data gap is retained as unknown exposure.', 'Mission timeline'),
    event('radiation', 'exposure', 16, 11, 'Dosimeter context captured', 'Inspect instrument, timestamp, and units.', 'Dosimeter record'),
  ];

  const cabinReadings: CabinReading[] = [15, 16].map((day, index) => ({
    id: `CABIN-${day}`, at: scenarioDate(day, 10), value: index ? 2100 : 1850, unit: 'ppm',
    instrument: 'Cabin CO₂ sensor', quality: 'usable', synthetic: true,
  }));

  const scenarioRadiationReadings: RadiationReading[] = [14, 16].map((day, index) => ({
    id: `RAD-${day}`, at: scenarioDate(day, 11), value: index ? 0.42 : 0.31, unit: 'µGy/h',
    instrument: 'Dosimeter', quality: 'usable', synthetic: true,
  }));
  const radiationReadings: RadiationReading[] = [...scenarioRadiationReadings,
    ...(scenarioId === 'radiation' ? RADLAB_EXCERPT.records.map((record) => ({
      ...record, unit: RADLAB_EXCERPT.unit, quality: 'usable' as const, synthetic: false,
      spacecraft: RADLAB_EXCERPT.spacecraft, source: RADLAB_EXCERPT.source, sourceUrl: RADLAB_EXCERPT.sourceUrl,
      retrievedAt: RADLAB_EXCERPT.retrievedAt, portalVersion: RADLAB_EXCERPT.portalVersion,
    })) : []),
  ];

  const contexts: ContextEntry[] = scenarioId === 'cabin' ? [{
    id: 'CTX-cabin-headache', kind: 'symptom', value: 'Headache reported', at: scenarioDate(15, 10.1),
    note: 'Crew check-in.', dataset: 'demo', synthetic: true, episodeId: 'INV-cabin',
  }] : scenarioId === 'recovery' ? [14, 15, 16].map((day) => ({
    id: `CTX-workload-${day}`, kind: 'workload', value: day < 16 ? 'Extended shift' : 'Recovery time shortened',
    at: scenarioDate(day, 13), note: '', dataset: 'demo', synthetic: true, episodeId: 'INV-recovery',
  })) : [];

  return {
    observations, contexts, investigations, events, cabinReadings, radiationReadings,
    tasks: [], checklist: {}, reactionSessions: [], handoffs: [],
  };
}

export function createInitialSnapshot(): AsterSnapshot {
  return {
    schemaVersion: 2, activeScenario: 'recovery', scenarioNow: new Date(SCENARIO_NOW).toISOString(),
    scenarioTimes: {
      recovery: new Date(SCENARIO_NOW).toISOString(), cabin: new Date(SCENARIO_NOW).toISOString(), radiation: new Date(SCENARIO_NOW).toISOString(),
    },
    liveObservations: [],
    workspaces: {
      recovery: makeScenarioWorkspace('recovery'), cabin: makeScenarioWorkspace('cabin'), radiation: makeScenarioWorkspace('radiation'),
    },
    settings: { missionStart: '2025-09-28', phase: 'Transit', linkDelayMinutes: 12, presenterOpen: false },
  };
}

export function id(prefix: string) { return makeId(prefix); }
export { METRICS, METRIC_ORDER, SCENARIO_NOW, scenarioDate };

function median(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const half = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[half] : (ordered[half - 1] + ordered[half]) / 2;
}

function hasNumericValue(value: Observation['value']) {
  return !(typeof value === 'string' && !value.trim()) && Number.isFinite(Number(value));
}

export function compareToPersonalBaseline(metric: Metric, observations: Observation[], now: string, rules: Partial<{ referenceDays: number; currentDays: number; minimumComparableDays: number }> = {}): BaselineComparison {
  const referenceDays = rules.referenceDays ?? 14;
  const currentDays = rules.currentDays ?? 3;
  const minimumComparableDays = rules.minimumComparableDays ?? 7;
  const currentTime = Date.parse(now);
  const firstRecentDay = Math.floor(currentTime / 86_400_000) * 86_400_000 - (currentDays - 1) * 86_400_000;
  const baselineEnd = firstRecentDay;
  const baselineStart = baselineEnd - referenceDays * 86_400_000;
  const inWindow = observations.filter((item) => {
    const at = Date.parse(item.at);
    return item.metric === metric && Number.isFinite(at) && at >= baselineStart && at <= currentTime;
  });
  const recentAny = inWindow.filter((item) => Date.parse(item.at) >= firstRecentDay).sort((a, b) => b.at.localeCompare(a.at));
  const latestRecent = recentAny[0];
  const usableRecent = latestRecent && latestRecent.quality === 'usable' && latestRecent.unit === METRICS[metric].unit
    && latestRecent.method.trim() && latestRecent.context.trim() && latestRecent.missionPhase?.trim()
    && hasNumericValue(latestRecent.value) ? latestRecent : undefined;
  const empty = (state: BaselineComparison['state'], explanation: string): BaselineComparison => ({
    metric, unit: METRICS[metric].unit, median: null, low: null, high: null, recentMedian: null, change: null,
    count: 0, recentCount: 0, state, explanation, referenceIds: [], recentIds: latestRecent ? [latestRecent.id] : [],
  });

  if (latestRecent && (latestRecent.quality !== 'usable' || latestRecent.unit !== METRICS[metric].unit)) {
    return empty('verify', 'The latest record needs its unit, source, or measurement quality checked before it can be compared.');
  }
  if (!usableRecent) {
    return empty('insufficient', latestRecent
      ? 'A recent record is present, but its measurement method, conditions, phase, or numeric value is incomplete.'
      : 'No comparable observation was recorded during the current three-day review window. The latest value is stale or unavailable.');
  }

  const comparable = inWindow.filter((item) => item.quality === 'usable'
    && item.unit === usableRecent.unit
    && item.method.trim() === usableRecent.method.trim()
    && item.context.trim() === usableRecent.context.trim()
    && item.missionPhase?.trim() === usableRecent.missionPhase?.trim()
    && hasNumericValue(item.value));
  const referenceItems = comparable.filter((item) => Date.parse(item.at) < baselineEnd);
  const recentItems = comparable.filter((item) => Date.parse(item.at) >= firstRecentDay);

  const groupDaily = (items: Observation[]) => {
    const days = new Map<number, number[]>();
    for (const item of items) {
      const day = Math.floor(Date.parse(item.at) / 86_400_000);
      const values = days.get(day) ?? [];
      values.push(Number(item.value));
      days.set(day, values);
    }
    return [...days.values()].map((values) => values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  const referenceDaily = groupDaily(referenceItems);
  const recentDaily = groupDaily(recentItems);
  const format = (value: number) => Number(value.toFixed(metric === 'sleep' || metric === 'temperature' ? 1 : 0));
  const center = median(referenceDaily);

  if (referenceDaily.length < minimumComparableDays) {
    return { metric, unit: METRICS[metric].unit, median: center, low: null, high: null, recentMedian: median(recentDaily), change: null,
      count: referenceDaily.length, recentCount: recentDaily.length, state: 'insufficient',
      explanation: `A comparable ${referenceDays}-day personal reference needs at least ${minimumComparableDays} days; ${referenceDaily.length} are available.`,
      referenceIds: referenceItems.map((item) => item.id), recentIds: recentItems.map((item) => item.id) };
  }

  if (recentDaily.length < 2 || center === null) {
    return { metric, unit: METRICS[metric].unit, median: format(center ?? 0), low: null, high: null, recentMedian: median(recentDaily), change: null,
      count: referenceDaily.length, recentCount: recentDaily.length, state: 'insufficient',
      explanation: 'More recent comparable daily measurements are needed before this pattern can be reviewed.',
      referenceIds: referenceItems.map((item) => item.id), recentIds: recentItems.map((item) => item.id) };
  }

  const deviations = referenceDaily.map((value) => Math.abs(value - center));
  const spread = median(deviations) ?? 0;
  const margin = Math.max(spread * 2.5, metric === 'sleep' ? 1 : metric === 'heart' ? 5 : 0.4);
  const lower = center - margin;
  const upper = center + margin;
  const recent = median(recentDaily)!;
  const shiftedDays = recentDaily.filter((dailyValue) => dailyValue < lower || dailyValue > upper).length;
  const shifted = shiftedDays >= Math.min(2, recentDaily.length);
  const direction = recent < center ? 'below' : 'above';
  return {
    metric, unit: METRICS[metric].unit, median: format(center), low: format(lower), high: format(upper),
    recentMedian: format(recent), change: format(recent - center), count: referenceDaily.length, recentCount: recentDaily.length,
    state: shifted ? 'shifted' : 'within-history',
    explanation: shifted
      ? `The recent daily median is ${direction} the personal reference band. This comparison describes a change; it does not assess clinical risk or its cause.`
      : 'Recent comparable daily values remain within the personal reference band.',
    referenceIds: referenceItems.map((item) => item.id), recentIds: recentItems.map((item) => item.id),
  };
}

export function scenarioCopy(snapshot: AsterSnapshot) {
  return SCENARIOS[snapshot.activeScenario];
}
