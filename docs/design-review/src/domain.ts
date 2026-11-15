export type Metric = 'heart' | 'bp' | 'glucose' | 'temperature' | 'sleep' | 'mood';
export type Page = 'console' | 'body' | 'measurements' | 'trends' | 'care' | 'records' | 'history' | 'library' | 'settings' | 'review' | 'medical';
export type Dataset = 'demo' | 'personal';
export type RecordQuality = 'usable' | 'verify';
export type TaskStatus = 'open' | 'complete' | 'cancelled';
export type TaskKind = 'measurement' | 'routine';
export type ObservationProvenance = { kind: 'scenario-fixture' | 'scenario-branch' | 'manual' | 'device'; label: string; recordedHourUtc?: number };

export type Observation = {
  id: string;
  metric: Metric;
  value: number | string;
  secondary?: number;
  unit: string;
  at: string;
  method: string;
  context: string;
  note: string;
  source: string;
  synthetic: boolean;
  dataset: Dataset;
  quality: RecordQuality;
  guidanceVersion: string;
  missionPhase?: string;
  provenance?: ObservationProvenance;
  linkedTask?: string;
};

export type ContextEntry = {
  id: string;
  kind: string;
  value: string;
  at: string;
  note: string;
  dataset: Dataset;
  synthetic: boolean;
  episodeId?: string;
  private?: boolean;
};

export type Followup = {
  id: string;
  kind: TaskKind;
  observationId?: string;
  episodeId?: string;
  title: string;
  due: string;
  createdAt: string;
  status: TaskStatus;
  resultId?: string;
  completedAt?: string;
  completionNote?: string;
  dataset: Dataset;
  synthetic: boolean;
};

export type ReviewEpisode = {
  id: string;
  observationId: string;
  taskId?: string;
  resultIds: string[];
  openedAt: string;
  status: 'open' | 'reviewed';
  reviewNote?: string;
  dataset: Dataset;
  synthetic: boolean;
};

export type MetricInfo = {
  label: string;
  short: string;
  unit: string;
  meaning: string;
  why: string;
  how: string;
  cannot: string;
  source: string;
  sourceUrl: string;
  contextLabel: string;
  contextOptions: string[];
};

export const METRICS: Record<Metric, MetricInfo> = {
  heart: {
    label: 'Resting heart rate', short: 'Heart rate', unit: 'bpm',
    meaning: 'Beats per minute.',
    why: 'A pulse can be compared over time when the method and conditions match.',
    how: 'Follow the device instructions. Record your activity and the method used.',
    cannot: 'A pulse alone cannot explain a change or assess overall heart health.',
    source: 'NASA Human System Risks · background only', sourceUrl: 'https://www.nasa.gov/hhp/human-system-risks/',
    contextLabel: 'Activity and posture', contextOptions: ['At rest · seated', 'At rest · lying down', 'After activity', 'Standing', 'Other conditions', 'Not recorded'],
  },
  bp: {
    label: 'Blood pressure', short: 'Blood pressure', unit: 'mmHg',
    meaning: 'Top: pressure during a heartbeat. Bottom: between beats.',
    why: 'Position, cuff, and activity can change the reading.',
    how: 'Follow the cuff instructions. Record both numbers, your position, and the method.',
    cannot: 'One reading cannot diagnose a condition or explain a change.',
    source: 'NASA Human System Risks · background only', sourceUrl: 'https://www.nasa.gov/hhp/human-system-risks/',
    contextLabel: 'Position and activity', contextOptions: ['Seated · at rest', 'Lying down · at rest', 'Standing', 'After activity', 'Other conditions', 'Not recorded'],
  },
  glucose: {
    label: 'Blood glucose', short: 'Blood glucose', unit: 'mg/dL',
    meaning: 'Blood sugar when checked.',
    why: 'Food and activity can change blood sugar during the day.',
    how: 'Follow the meter instructions. Record meal timing and the device used.',
    cannot: 'Tether does not set personal targets or treatment instructions.',
    source: 'NASA Human System Risks · background only', sourceUrl: 'https://www.nasa.gov/hhp/human-system-risks/',
    contextLabel: 'Meal timing', contextOptions: ['Before a meal', 'After a meal', 'Fasting', 'After activity', 'Other conditions', 'Not recorded'],
  },
  temperature: {
    label: 'Body temperature', short: 'Temperature', unit: '°C',
    meaning: 'How warm your body is.',
    why: 'The device and body site can affect the reading.',
    how: 'Follow thermometer instructions. Record the site and method used.',
    cannot: 'A temperature alone cannot identify the cause.',
    source: 'NASA Human System Risks · background only', sourceUrl: 'https://www.nasa.gov/hhp/human-system-risks/',
    contextLabel: 'Measurement site', contextOptions: ['Oral', 'Ear', 'Forehead', 'Other site', 'Not recorded'],
  },
  sleep: {
    label: 'Sleep duration', short: 'Sleep', unit: 'hours',
    meaning: 'Hours asleep; not sleep quality.',
    why: 'Sleep hours can be reviewed alongside an optional quality check-in.',
    how: 'Estimate time asleep. Note interruptions if useful.',
    cannot: 'Hours alone cannot show how restful sleep felt.',
    source: 'NASA Human System Risks · background only', sourceUrl: 'https://www.nasa.gov/hhp/human-system-risks/',
    contextLabel: 'Sleep period', contextOptions: ['Main sleep period', 'Nap', 'Interrupted sleep', 'Other conditions', 'Not recorded'],
  },
  mood: {
    label: 'Mood check-in', short: 'Mood', unit: '',
    meaning: 'Your own description of how you feel.',
    why: 'A quick check-in can help you notice changes over time.',
    how: 'Choose the description that fits how you feel now. You can skip it.',
    cannot: 'This is not a mental health assessment.',
    source: 'NASA Human System Risks · background only', sourceUrl: 'https://www.nasa.gov/hhp/human-system-risks/',
    contextLabel: 'Optional context', contextOptions: ['At this check-in', 'After waking', 'After activity', 'Other conditions', 'Not recorded'],
  },
};

export const METRIC_ORDER: Metric[] = ['heart', 'bp', 'glucose', 'temperature', 'sleep', 'mood'];
export const MOOD = ['Very low', 'Low', 'Okay', 'Good', 'Very good'];
export const GUIDANCE_VERSION = 'Tether guidance 0.2';
export const GUIDANCE_REVIEW_STATUS = 'Mission procedure review pending';

export const HAZARDS = [
  { key: 'radiation', name: 'Space radiation', text: 'Radiation dose requires a radiation monitor; vital signs cannot estimate it.', limit: 'Exposure appears only when a dosimeter is connected.' },
  { key: 'isolation', name: 'Isolation and confinement', text: 'Sleep and mood check-ins help crew track how they feel.', limit: 'These are not a mental-health assessment.' },
  { key: 'distance', name: 'Distance from Earth', text: 'Records and a prepared handoff support review when communication is available.', limit: 'Tether cannot contact your medical team.' },
  { key: 'gravity', name: 'Altered gravity', text: 'Heart readings and exercise notes can be tracked. Bone and muscle health need separate checks.', limit: 'Exercise and reference anatomy do not measure bone strength or muscle health.' },
  { key: 'environment', name: 'Hostile closed environments', text: 'Temperature and symptom check-ins record what crew notice.', limit: 'No cabin sensors are connected. Immune health is not measured.' },
];

export const CONTEXT_KINDS = ['symptom', 'exercise', 'meal / hydration', 'sleep quality'] as const;
export const SLEEP_QUALITY = ['1 · Not restorative', '2 · Poor', '3 · Fair', '4 · Good', '5 · Very restorative'];

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatValue(item: Observation): string {
  if (item.metric === 'bp') return `${item.value} / ${item.secondary} ${item.unit}`;
  if (item.metric === 'sleep') return `${Number(item.value).toFixed(1)} h`;
  return `${item.value}${item.unit ? ` ${item.unit}` : ''}`;
}

export function localStamp(iso: string, withDate = false, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, withDate
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone }
    : { hour: '2-digit', minute: '2-digit', timeZone }).format(date);
}

export function fullDate(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone }).format(date);
}

export function latestForMetric(observations: Observation[], metric: Metric) {
  return observations.filter((item) => item.metric === metric).sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function isComparable(a: Observation, b: Observation) {
  const validText = (text: string) => text.trim() && text !== 'Not recorded';
  return a.metric === b.metric && a.method.trim() === b.method.trim() && validText(a.method)
    && a.context.trim().toLocaleLowerCase() === b.context.trim().toLocaleLowerCase() && validText(a.context);
}

export function makeDemoData(now = new Date()) {
  const readings: Observation[] = [];
  const samples: Record<Metric, Array<number | string | [number, number]>> = {
    heart: [64, 62, 65, 63, 64, 62, 64],
    bp: [[118, 76], [117, 75], [116, 74], [119, 76], [118, 75], [116, 74], [117, 75]],
    glucose: [89, 92, 91, 88, 94, 90, 91],
    temperature: [36.6, 36.7, 36.6, 36.8, 36.7, 36.6, 36.8],
    sleep: [7.5, 7.8, 7.6, 7.9, 7.4, 7.7, 7.8],
    mood: ['Good', 'Good', 'Very good', 'Good', 'Good', 'Very good', 'Good'],
  };
  for (const metric of METRIC_ORDER) {
    samples[metric].forEach((sample, index) => {
      const observed = new Date(now);
      observed.setDate(observed.getDate() - (6 - index));
      observed.setHours(metric === 'heart' || metric === 'bp' ? 7 : 8, (index * 13) % 60, 0, 0);
      if (index === 6) observed.setTime(now.getTime() - 30 * 60 * 1000);
      const [value, secondary] = Array.isArray(sample) ? sample : [sample, undefined];
      readings.push({
        id: `DEMO-${metric}-${index + 1}`, metric, value, secondary, unit: METRICS[metric].unit,
        at: observed.toISOString(), method: 'Crew self-measurement',
        context: metric === 'glucose' ? 'Fasting'
          : metric === 'temperature' ? 'Oral'
            : metric === 'sleep' ? 'Main sleep period'
              : metric === 'mood' ? 'At this check-in' : metric === 'bp' ? 'Seated · at rest' : 'At rest · seated',
        note: '',
        source: 'Crew self-measurement', synthetic: true, dataset: 'demo',
        quality: 'usable', guidanceVersion: GUIDANCE_VERSION,
      });
    });
  }
  return {
    observations: readings,
    contexts: [] as ContextEntry[],
    tasks: [] as Followup[],
    episodes: [] as ReviewEpisode[],
  };
}

export function compareObservation(item: Observation, all: Observation[], days = 7) {
  const end = new Date(item.at).getTime();
  const start = end - days * 86400000;
  const comparable = all.filter((candidate) => candidate.id !== item.id && candidate.metric === item.metric
    && new Date(candidate.at).getTime() >= start && new Date(candidate.at).getTime() < end && isComparable(item, candidate))
    .sort((a, b) => a.at.localeCompare(b.at));
  const previous = comparable.at(-1);
  if (!previous) return { days, count: 0, previous: undefined, comparison: `No earlier reading with matching method and conditions in the past ${days} days.` };
  if (item.metric === 'mood') {
    const before = MOOD.indexOf(String(previous.value));
    const after = MOOD.indexOf(String(item.value));
    const difference = after - before;
    return { days, count: comparable.length, previous, comparison: `Compared with your previous similar check-in: ${difference === 0 ? 'same description' : `${difference > 0 ? 'a higher' : 'a lower'} mood rating`}.` };
  }
  const before = Number(previous.value);
  const after = Number(item.value);
  const primaryDifference = Number.isFinite(after - before) ? after - before : null;
  const precision = item.metric === 'temperature' || item.metric === 'sleep' ? 1 : 0;
  const formatDelta = (difference: number) => {
    const rounded = Number(difference.toFixed(precision));
    const normalized = Object.is(rounded, -0) ? 0 : rounded;
    return `${normalized > 0 ? '+' : ''}${normalized} ${item.unit}`;
  };
  const primaryText = primaryDifference === null ? 'difference unavailable' : formatDelta(primaryDifference);
  if (item.metric === 'bp') {
    const secondaryDifference = Number(item.secondary) - Number(previous.secondary);
    const secondaryText = Number.isFinite(secondaryDifference) ? formatDelta(secondaryDifference) : 'difference unavailable';
    return { days, count: comparable.length, previous, comparison: `Compared with your previous similar reading: top number ${primaryText}; bottom number ${secondaryText}.` };
  }
  return { days, count: comparable.length, previous, comparison: `Compared with your previous similar reading: ${primaryText}.` };
}
