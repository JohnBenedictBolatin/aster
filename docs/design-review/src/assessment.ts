import type { Dataset, Metric, Observation } from './domain';

export type AssessmentState = 'urgent' | 'attention' | 'verify' | 'within' | 'unconfigured' | 'missing' | 'stale';
export type AssessmentRule = {
  id: string;
  version: string;
  metric: Metric;
  dataset: Dataset;
  reviewStatus: 'reviewed' | 'practice-only';
  unit: string;
  validFrom: string;
  validThrough?: string;
  above?: number;
  below?: number;
  aboveSecondary?: number;
  belowSecondary?: number;
  referenceLabel?: string;
  requiredContext?: string;
  requiredMethod?: 'recorded';
  freshnessHours?: number;
  urgency: 'review' | 'urgent';
  source: string;
};

export type ReadingAssessment = {
  metric: Metric;
  observation?: Observation;
  state: AssessmentState;
  label: string;
  reason: string;
  nextAction: string;
  bodyTarget?: string;
  rule?: AssessmentRule;
};

// General adult review guides used to populate the console. They are not
// astronaut-specific medical protocols.
export const ASSESSMENT_RULES: AssessmentRule[] = [{
  id: 'practice-resting-heart-rate-v1',
  version: '1.0',
  metric: 'heart',
  dataset: 'demo',
  reviewStatus: 'practice-only',
  unit: 'bpm',
  validFrom: '2026-10-29T00:00:00.000Z',
  below: 40,
  above: 100,
  requiredContext: 'At rest · seated',
  requiredMethod: 'recorded',
  freshnessHours: 24,
  urgency: 'review',
  source: 'American Heart Association · resting heart-rate guide',
  referenceLabel: 'Adult resting reference: 60–100 bpm. Active adults may have a lower resting rate.',
}, {
  id: 'demo-blood-pressure-reference-v1', version: '1.0', metric: 'bp', dataset: 'demo', reviewStatus: 'practice-only',
  unit: 'mmHg', validFrom: '2026-10-29T00:00:00.000Z', above: 119, aboveSecondary: 79,
  below: 90, belowSecondary: 60,
  requiredContext: 'Seated · at rest', requiredMethod: 'recorded', freshnessHours: 24, urgency: 'review',
  source: 'American Heart Association · adult blood-pressure categories',
  referenceLabel: 'Adult blood-pressure categories use both numbers. A normal reading is below 120/80 mmHg.',
}, {
  id: 'demo-fasting-glucose-reference-v1', version: '1.0', metric: 'glucose', dataset: 'demo', reviewStatus: 'practice-only',
  unit: 'mg/dL', validFrom: '2026-10-29T00:00:00.000Z', below: 70, above: 99,
  requiredContext: 'Fasting', requiredMethod: 'recorded', urgency: 'review',
  source: 'NIDDK · fasting plasma glucose categories',
  referenceLabel: 'General fasting reference: 99 mg/dL or below. Interpretation depends on the test method and clinical context.',
}, {
  id: 'demo-after-meal-glucose-simulation-v1', version: '1.0', metric: 'glucose', dataset: 'demo', reviewStatus: 'practice-only',
  unit: 'mg/dL', validFrom: '2026-10-29T00:00:00.000Z', below: 70, above: 140,
  requiredContext: 'After a meal', requiredMethod: 'recorded', freshnessHours: 24, urgency: 'review',
  source: 'Tether crew check-in',
  referenceLabel: 'Meal timing affects glucose readings. Fasting ranges do not apply to after-meal readings.',
}, {
  id: 'demo-temperature-reference-v1', version: '1.0', metric: 'temperature', dataset: 'demo', reviewStatus: 'practice-only',
  unit: '°C', validFrom: '2026-10-29T00:00:00.000Z', below: 36.1, above: 37.2,
  requiredContext: 'Oral', requiredMethod: 'recorded', freshnessHours: 24, urgency: 'review',
  source: 'MedlinePlus · body-temperature norms',
  referenceLabel: 'Body temperature varies by measurement site, time of day, and individual.',
}, {
  id: 'demo-sleep-reference-v1', version: '1.0', metric: 'sleep', dataset: 'demo', reviewStatus: 'practice-only',
  unit: 'hours', validFrom: '2026-10-29T00:00:00.000Z', below: 7,
  requiredContext: 'Main sleep period', requiredMethod: 'recorded', urgency: 'review',
  source: 'CDC · adult sleep duration recommendation',
  referenceLabel: 'Adults aged 18–60 are generally recommended to get at least 7 hours of sleep.',
}];

const recorded = (value: string) => value.trim() !== '' && value.trim().toLocaleLowerCase() !== 'not recorded';

export function bodyTargetForMetric(metric: Metric): string | undefined {
  if (metric === 'heart') return 'heart';
  if (metric === 'bp') return 'vessels';
  if (metric === 'glucose' || metric === 'temperature') return 'skin';
  return undefined;
}

export function assessObservation(observation: Observation, dataset: Dataset, now = Date.now(), rules = ASSESSMENT_RULES): ReadingAssessment {
  const { metric } = observation;
  const bodyTarget = bodyTargetForMetric(metric);
  const observedAt = new Date(observation.at).getTime();
  const candidates = rules.filter((item) => item.metric === metric && item.dataset === dataset
    && (dataset === 'demo' || item.reviewStatus === 'reviewed')
    && new Date(item.validFrom).getTime() <= observedAt && (!item.validThrough || new Date(item.validThrough).getTime() >= observedAt));
  const rule = candidates.find((item) => !item.requiredContext || item.requiredContext === observation.context) ?? candidates[0];
  const qualityNeedsCheck = observation.quality === 'verify' || !recorded(observation.method) || !recorded(observation.context);
  const unitMismatch = !!rule && observation.unit.trim().toLocaleLowerCase() !== rule.unit.trim().toLocaleLowerCase();
  if (qualityNeedsCheck || unitMismatch || (rule?.requiredContext && observation.context !== rule.requiredContext)) {
    const contextRecorded = recorded(observation.context);
    if (contextRecorded && rule?.requiredContext && observation.context !== rule.requiredContext && !unitMismatch && observation.quality !== 'verify' && recorded(observation.method)) {
      return { metric, observation, state: 'unconfigured', label: 'No matching guide',
        reason: `This guide applies to ${rule.requiredContext.toLocaleLowerCase()} readings. Your recorded condition is ${observation.context.toLocaleLowerCase()}, so this result is not classified.`,
        nextAction: 'Use a guide that matches the recorded conditions.', bodyTarget };
    }
    return { metric, observation, state: 'verify', label: 'Check measurement',
      reason: unitMismatch
        ? `This check expects ${rule.unit}; the recorded unit is ${observation.unit || 'missing'}.`
        : !recorded(observation.method) || !recorded(observation.context)
        ? 'The method or conditions were not recorded, so this reading cannot be checked reliably.'
        : `The recorded conditions do not match this ${rule?.requiredContext?.toLocaleLowerCase() ?? 'measurement'} check.`,
      nextAction: 'Repeat it and record how you measured.', bodyTarget, rule };
  }

  if (metric === 'mood') {
    const needsSupport = dataset === 'demo' && ['Very low', 'Low'].includes(String(observation.value));
    return { metric, observation, state: needsSupport ? 'attention' : 'within',
      label: needsSupport ? 'Needs review' : 'Good',
      reason: `You reported feeling ${String(observation.value).toLocaleLowerCase()}.`,
      nextAction: needsSupport ? 'Consider a support check-in and note what has changed.' : 'Continue your regular check-ins.', bodyTarget };
  }

  if (!rule) return { metric, observation, state: 'unconfigured', label: 'No crew range',
    reason: metric === 'glucose'
      ? 'This after-meal reading has no matching guide. Fasting test ranges use different conditions, so this result is not classified.'
      : 'No guide is configured for this reading. Review the recorded method and conditions.',
    nextAction: 'Review the reading and its conditions.', bodyTarget };

  const ageHours = (now - new Date(observation.at).getTime()) / 3600000;
  if (rule.freshnessHours !== undefined && ageHours > rule.freshnessHours) {
    return { metric, observation, state: 'stale', label: 'Out of date', reason: `This configured check only applies to readings from the past ${rule.freshnessHours} hours.`,
      nextAction: 'Record a fresh measurement.', bodyTarget, rule };
  }

  const primaryBelow = rule.below !== undefined && Number(observation.value) < rule.below;
  const primaryAbove = rule.above !== undefined && Number(observation.value) > rule.above;
  const secondaryBelow = rule.belowSecondary !== undefined && Number(observation.secondary) < rule.belowSecondary;
  const secondaryAbove = rule.aboveSecondary !== undefined && Number(observation.secondary) > rule.aboveSecondary;
  if (primaryBelow || primaryAbove || secondaryBelow || secondaryAbove) {
    return { metric, observation, state: rule.urgency === 'urgent' ? 'urgent' : 'attention',
      label: rule.urgency === 'urgent' ? 'Urgent' : 'Needs attention',
      reason: metric === 'sleep' ? 'You slept less than the general adult recommendation.'
        : `${measurementName(metric)} is ${primaryBelow || secondaryBelow ? 'below' : 'above'} the configured reference range.`,
      nextAction: metric === 'sleep' ? 'Review your sleep pattern and scheduled rest.' : 'Repeat this measurement and compare the result.', bodyTarget, rule };
  }

  return { metric, observation, state: 'within', label: 'Within range',
    reason: metric === 'sleep' ? 'Your sleep duration meets the general adult recommendation.' : `${measurementName(metric)} is within the configured reference range.`,
    nextAction: 'Continue your scheduled check-ins.', bodyTarget, rule };
}

function measurementName(metric: Metric) {
  return ({ heart: 'Your resting heart rate', bp: 'Your blood pressure', glucose: 'Your blood glucose', temperature: 'Your temperature', sleep: 'Your sleep duration', mood: 'Your mood check-in' })[metric];
}

export function assessReading(metric: Metric, observations: Observation[], dataset: Dataset, now = Date.now(), rules = ASSESSMENT_RULES): ReadingAssessment {
  const observation = observations.filter((item) => item.metric === metric).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (observation) return assessObservation(observation, dataset, now, rules);
  const bodyTarget = bodyTargetForMetric(metric);
  return { metric, state: 'missing', label: 'No measurement', reason: 'There is no recorded reading yet.', nextAction: 'Record this measurement.', bodyTarget };
}

export function assessmentPriority(state: AssessmentState) {
  return ({ urgent: 0, attention: 1, verify: 2, stale: 3, unconfigured: 4, missing: 5, within: 6 } satisfies Record<AssessmentState, number>)[state];
}
