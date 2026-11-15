import type { ContextEntry, Observation } from '../domain.ts';
import { compareToPersonalBaseline, RULE_VERSION, type MissionEvent, type ScenarioId } from './domain.ts';

export type AssessmentPriority = 'review' | 'verify' | 'information';

export type AssessmentFinding = {
  id: string;
  title: string;
  summary: string;
  priority: AssessmentPriority;
  supportingRecordIds: string[];
};

export type AssessmentRules = {
  referenceDays: number;
  currentDays: number;
  minimumComparableDays: number;
  cabinOverlapHours: number;
};

export type AssessmentResult = {
  scenarioId: ScenarioId;
  evaluatedAt: string;
  ruleVersion: string;
  findings: AssessmentFinding[];
  missingEvidence: string[];
  workflowSteps: string[];
};

export const DEFAULT_ASSESSMENT_RULES: AssessmentRules = {
  referenceDays: 14, currentDays: 3, minimumComparableDays: 7, cabinOverlapHours: 6,
};

export function evaluateAssessment(input: {
  scenarioId: ScenarioId;
  observations: Observation[];
  contexts: ContextEntry[];
  missionEvents: MissionEvent[];
  now: string;
  rules?: AssessmentRules;
}): AssessmentResult {
  const findings: AssessmentFinding[] = [];
  const missingEvidence: string[] = [];
  const steps: string[] = [];
  const rules = { ...DEFAULT_ASSESSMENT_RULES, ...input.rules };
  const nowMs = Date.parse(input.now);
  const missionEvents = input.missionEvents.filter((item) => Number.isFinite(Date.parse(item.at)) && Date.parse(item.at) <= nowMs);
  const contexts = input.contexts.filter((item) => Number.isFinite(Date.parse(item.at)) && Date.parse(item.at) <= nowMs);

  if (input.scenarioId === 'recovery') {
    const pulse = compareToPersonalBaseline('heart', input.observations, input.now, rules);
    const sleep = compareToPersonalBaseline('sleep', input.observations, input.now, rules);
    const comparisons = [pulse, sleep];
    for (const comparison of comparisons) {
      const metric = comparison.metric === 'heart' ? 'Resting pulse' : 'Sleep duration';
      if (comparison.state === 'shifted') {
        findings.push({
          id: `${comparison.metric}-personal-shift`, title: `${metric} differs from personal history`,
          summary: comparison.explanation,
          priority: 'review', supportingRecordIds: [...comparison.referenceIds, ...comparison.recentIds],
        });
      } else if (comparison.state === 'verify') {
        findings.push({ id: `${comparison.metric}-verification`, title: `${metric} needs verification`,
          summary: comparison.explanation, priority: 'verify', supportingRecordIds: comparison.recentIds });
        missingEvidence.push(`${metric}: verify the latest value, unit, and source before comparison.`);
      } else if (comparison.state === 'insufficient') {
        missingEvidence.push(`${metric}: ${comparison.explanation}`);
      }
    }
    if (pulse.state === 'shifted' && sleep.state === 'shifted') {
      findings.push({ id: 'combined-personal-shift', title: 'Two measures shifted together',
        summary: 'Resting pulse and sleep duration both differ from this crew member’s own comparable history. This is a pattern for review, not a diagnosis or cause.',
        priority: 'review', supportingRecordIds: [...pulse.referenceIds, ...pulse.recentIds, ...sleep.referenceIds, ...sleep.recentIds] });
    }
    if (!contexts.some((item) => ['workload', 'sleep quality', 'crew check-in'].includes(item.kind))) {
      missingEvidence.push('Optional crew context: workload or a self-described check-in has not been recorded for this review window.');
    }
    steps.push('Review measurement source and conditions.', 'Record optional context in the crew member’s own words.', 'Schedule a comparable follow-up and reassess its result.');
  } else if (input.scenarioId === 'cabin') {
    const environment = missionEvents.filter((item) => item.kind === 'environment');
    const symptoms = contexts.filter((item) => item.kind.toLowerCase() === 'symptom');
    const symptomEvents = missionEvents.filter((item) => item.kind === 'check-in' && /symptom|headache/i.test(`${item.title} ${item.detail}`));
    const symptomTimes = [...symptoms.map((item) => ({ id: item.id, at: item.at })), ...symptomEvents.map((item) => ({ id: item.id, at: item.at }))];
    const overlapMs = rules.cabinOverlapHours * 60 * 60 * 1000;
    const pairs = environment.flatMap((sensor) => symptomTimes
      .filter((symptom) => Math.abs(Date.parse(sensor.at) - Date.parse(symptom.at)) <= overlapMs)
      .map((symptom) => [sensor.id, symptom.id]));
    if (pairs.length) {
      findings.push({ id: 'cabin-timing-overlap', title: 'A symptom report overlaps an environment event',
        summary: `At least one crew report is within ${rules.cabinOverlapHours} hours of a cabin event. Timing can guide review; it does not establish exposure or cause.`,
        priority: 'review', supportingRecordIds: [...new Set(pairs.flat())] });
    } else if (environment.length && symptomTimes.length) {
      findings.push({ id: 'cabin-no-close-overlap', title: 'No close timing overlap in the visible records',
        summary: 'The available event times are outside the configured review window. This does not rule out an exposure or explain symptoms.',
        priority: 'information', supportingRecordIds: [...environment.map((item) => item.id), ...symptomTimes.map((item) => item.id)] });
    }
    if (!environment.length) missingEvidence.push('No cabin environment event is available in the current scenario time window.');
    if (!symptomTimes.length) missingEvidence.push('No crew symptom report is available in the current scenario time window.');
    const verificationEvents = environment.filter((item) => /verify|uncertain|contact lost/i.test(`${item.title} ${item.detail}`));
    if (verificationEvents.length) findings.push({ id: 'cabin-sensor-verification', title: 'Cabin sensor record needs verification',
      summary: 'The scenario marks sensor contact or source quality as uncertain. Keep that reading out of a normal or confirmed interpretation.',
      priority: 'verify', supportingRecordIds: verificationEvents.map((item) => item.id) });
    steps.push('Check sensor identity, timestamp, and quality.', 'Record the crew member’s own symptom description.', 'Compare the timeline without inferring a cause.', 'Prepare a local handoff if the crew chooses.');
  } else {
    const exposureEvents = missionEvents.filter((item) => item.kind === 'exposure');
    const gaps = exposureEvents.filter((item) => /gap|missing|unknown/i.test(`${item.title} ${item.detail}`));
    if (gaps.length) findings.push({ id: 'radiation-record-gap', title: 'An instrument interval is missing',
      summary: 'The missing interval remains unknown. Aster does not estimate exposure from a gap or convert instrument records into personal dose.',
      priority: 'review', supportingRecordIds: gaps.map((item) => item.id) });
    if (exposureEvents.some((item) => /captured|record/i.test(`${item.title} ${item.detail}`))) {
      findings.push({ id: 'radiation-instrument-context', title: 'Instrument context is available',
        summary: 'Inspect the named instrument, timestamps, units, and provenance. These records are not a personal health measurement.',
        priority: 'information', supportingRecordIds: exposureEvents.map((item) => item.id) });
    }
    if (!exposureEvents.length) missingEvidence.push('No instrument event is available in the current scenario time window.');
    steps.push('Confirm instrument source, units, and timestamps.', 'Keep data gaps marked as unknown.', 'Prepare a local handoff with instrument context if needed.');
  }

  return { scenarioId: input.scenarioId, evaluatedAt: input.now, ruleVersion: RULE_VERSION, findings,
    missingEvidence, workflowSteps: steps };
}
