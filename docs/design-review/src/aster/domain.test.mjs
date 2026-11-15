import assert from 'node:assert/strict';
import test from 'node:test';
import { compareToPersonalBaseline, makeScenarioWorkspace, SCENARIO_NOW } from './domain.ts';
import { privateMaterialForHandoff, workspaceForExport } from './export.ts';
import { evaluateAssessment } from './assessment.ts';
import { comparableReactionSessions, reactionMedian } from './reaction.ts';
import { RADLAB_EXCERPT } from './radlabExcerpt.ts';
import { selectGuidance, inspectionItems, matchingTask, attachFollowupResults } from './guidance.ts';
import { upgradeSnapshot } from './storage.ts';
import { createInitialSnapshot } from './domain.ts';

test('guidance routes questionable and missing readings before optional checks', () => {
  const workspace = makeScenarioWorkspace('recovery');
  workspace.observations.at(-1);
  workspace.observations = workspace.observations.map(o => o.id === 'FIXTURE-heart-16' ? {...o, quality:'verify'} : o);
  assert.equal(selectGuidance('recovery', workspace, NOW).next.metric, 'heart');
  workspace.observations = workspace.observations.filter(o => o.metric !== 'sleep').map(o=>({...o,quality:'usable'}));
  assert.equal(selectGuidance('recovery', workspace, NOW).next.metric, 'sleep');
});

test('a stale reading routes to a new measurement, never a normal state', () => {
  const g=selectGuidance('recovery',makeScenarioWorkspace('recovery'),new Date(SCENARIO_NOW+2*86400000).toISOString());
  assert.equal(g.next.kind,'measurement');
  assert.ok(g.questions.length>0);
});

test('instrument inspection is scoped to the actual record and preserves uncertainty', () => {
  const w=makeScenarioWorkspace('cabin');
  w.reviewProgress={version:1,skipped:[],inspections:Object.fromEntries(inspectionItems('cabin',w,NOW).map(i=>[i.id,true]))};
  assert.equal(selectGuidance('cabin',w,NOW).next.kind,'schedule');
  w.cabinReadings.push({...w.cabinReadings.at(-1),id:'NEW-SENSOR',at:NOW,quality:'verify'});
  const g=selectGuidance('cabin',w,NOW);
  assert.equal(g.next.kind,'inspect');
  assert.ok(g.questions.some(q=>q.includes('verification')));
});

test('pending and completed-result follow-ups recommend different actions', () => {
  const w=makeScenarioWorkspace('recovery');
  w.tasks.push({id:'T',episodeId:'INV-recovery',status:'open',createdAt:NOW,due:new Date(SCENARIO_NOW+3600000).toISOString()});
  assert.equal(selectGuidance('recovery',w,NOW).next.kind,'wait');
  w.tasks[0].resultId='FIXTURE-heart-16';
  assert.equal(selectGuidance('recovery',w,NOW).next.kind,'review-result');
  w.investigations.find(i=>i.scenarioId==='recovery').status='closed';
  assert.equal(selectGuidance('recovery',w,NOW).next.kind,'reopen');
});

test('unrelated, older, or questionable readings do not fulfill a recovery follow-up', () => {
  const w=makeScenarioWorkspace('recovery');
  w.tasks.push({id:'T',episodeId:'INV-recovery',status:'open',createdAt:NOW,due:NOW});
  assert.equal(matchingTask(w,'recovery',{id:'R',at:NOW,metric:'glucose'}),undefined);
  assert.equal(matchingTask(w,'recovery',{id:'R',at:NOW,metric:'heart',quality:'verify'}),undefined);
  assert.equal(matchingTask(w,'recovery',{id:'R',at:new Date(SCENARIO_NOW-1000).toISOString(),metric:'heart'}),undefined);
  assert.equal(matchingTask(w,'recovery',{id:'R',at:NOW,metric:'heart'})?.id,'T');
});

test('presenter follow-up attachment uses recorded evidence without completing or closing anything', () => {
  for (const scenario of ['recovery','cabin','radiation']) {
    const w=makeScenarioWorkspace(scenario);
    w.tasks.push({id:'T',episodeId:`INV-${scenario}`,status:'open',createdAt:NOW,due:NOW});
    assert.equal(attachFollowupResults(w,scenario,NOW),w);
    const rows=scenario==='recovery'?w.observations:scenario==='cabin'?w.cabinReadings:w.radiationReadings;
    rows.push({...rows.find(r=>scenario!=='recovery'||r.metric==='heart'),id:'NEW',at:NOW,quality:'usable',synthetic:true});
    const result=attachFollowupResults(w,scenario,NOW);
    assert.equal(result.tasks[0].resultId,'NEW');
    assert.equal(result.tasks[0].status,'open');
    assert.notEqual(result.investigations.find(i=>i.scenarioId===scenario).status,'closed');
    assert.deepEqual(result.observations,w.observations);
  }
});

test('migration preserves history, legacy checklist, live data, and versioned progress on restart', () => {
  const snapshot=createInitialSnapshot();
  snapshot.workspaces.recovery.checklist['Earlier checklist action']=true;
  snapshot.liveObservations=[{id:'LIVE-KEEP'}];
  const migrated=upgradeSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(migrated.workspaces.recovery.reviewProgress,{version:1,skipped:[],inspections:{}});
  assert.deepEqual(migrated.workspaces.recovery.observations,snapshot.workspaces.recovery.observations);
  assert.equal(migrated.workspaces.recovery.checklist['Earlier checklist action'],true);
  assert.deepEqual(migrated.liveObservations,snapshot.liveObservations);
  migrated.workspaces.recovery.reviewProgress.skipped=['reaction'];
  const restarted=upgradeSnapshot(JSON.parse(JSON.stringify(migrated)));
  assert.ok(!selectGuidance('recovery',restarted.workspaces.recovery,NOW).optional.some(a=>a.id==='reaction'));
  assert.ok(selectGuidance('recovery',restarted.workspaces.recovery,NOW).optional.some(a=>a.id==='summary'));
});

test('simultaneous reviews retain independent progress and pending work', () => {
  const s=createInitialSnapshot();
  s.workspaces.recovery.reviewProgress={version:1,skipped:['context'],inspections:{}};
  assert.equal(selectGuidance('cabin',s.workspaces.cabin,NOW).next.kind,'inspect');
  assert.ok(selectGuidance('cabin',s.workspaces.cabin,NOW).optional.some(a=>a.id==='context'));
  const old={...s,schemaVersion:1};delete old.scenarioTimes;
  assert.equal(upgradeSnapshot(old).scenarioTimes.radiation,NOW);
});

const NOW = new Date(SCENARIO_NOW).toISOString();
const fixture = () => makeScenarioWorkspace('recovery').observations.filter((item) => item.metric === 'heart');

test('requires seven comparable reference days and two recent days', () => {
  const result = compareToPersonalBaseline('heart', fixture().filter((item) => Number(item.id.split('-').at(-1)) >= 12), NOW);
  assert.equal(result.state, 'insufficient');
  assert.ok(result.count < 7);
});

test('recovery scenario presents a multi-indicator change from personal history', () => {
  const workspace = makeScenarioWorkspace('recovery');
  const pulse = compareToPersonalBaseline('heart', workspace.observations, NOW);
  const sleep = compareToPersonalBaseline('sleep', workspace.observations, NOW);
  assert.equal(pulse.state, 'shifted');
  assert.equal(sleep.state, 'shifted');
  assert.equal(pulse.count, 14);
  assert.equal(pulse.recentCount, 3);
});

test('excludes reference records with mismatched measurement method', () => {
  const observations = fixture().map((item) => Date.parse(item.at) < SCENARIO_NOW - 2 * 86_400_000
    ? { ...item, method: 'Different measurement method' } : item);
  const result = compareToPersonalBaseline('heart', observations, NOW);
  assert.equal(result.state, 'insufficient');
  assert.equal(result.count, 0);
});

test('requires measurement conditions to match', () => {
  const observations = fixture().map((item) => Date.parse(item.at) < SCENARIO_NOW - 2 * 86_400_000
    ? { ...item, context: 'After activity' } : item);
  const result = compareToPersonalBaseline('heart', observations, NOW);
  assert.equal(result.state, 'insufficient');
  assert.equal(result.count, 0);
});

test('excludes observations from a different mission phase', () => {
  const observations = fixture().map((item) => Date.parse(item.at) < SCENARIO_NOW - 2 * 86_400_000
    ? { ...item, missionPhase: 'Lunar transit' } : item);
  const result = compareToPersonalBaseline('heart', observations, NOW);
  assert.equal(result.state, 'insufficient');
  assert.equal(result.count, 0);
});

test('flags an incompatible unit for verification', () => {
  const observations = fixture().map((item) => item.id === 'FIXTURE-heart-16' ? { ...item, unit: 'MHz' } : item);
  const result = compareToPersonalBaseline('heart', observations, NOW);
  assert.equal(result.state, 'verify');
});

test('does not treat a missing recent value as zero or normal', () => {
  const observations = fixture().map((item) => item.id === 'FIXTURE-heart-16' ? { ...item, value: '' } : item);
  const result = compareToPersonalBaseline('heart', observations, NOW);
  assert.equal(result.state, 'insufficient');
  assert.equal(result.recentCount, 0);
  const invalid = fixture().map((item) => item.id === 'FIXTURE-heart-16' ? { ...item, value: 'not-a-number' } : item);
  const invalidResult = compareToPersonalBaseline('heart', invalid, NOW);
  assert.equal(invalidResult.state, 'insufficient');
  assert.match(invalidResult.explanation, /numeric value is incomplete/);
});

test('keeps the assessment window out of the personal reference IDs', () => {
  const observations = fixture();
  const future = { ...observations.at(-1), id: 'FUTURE', at: new Date(SCENARIO_NOW + 60_000).toISOString() };
  const result = compareToPersonalBaseline('heart', [...observations, future], NOW);
  const reviewStart = Math.floor(SCENARIO_NOW / 86_400_000) * 86_400_000 - 2 * 86_400_000;
  assert.equal(result.state, 'shifted');
  assert.ok(result.referenceIds.every((id) => Date.parse(observations.find((item) => item.id === id).at) < reviewStart));
  assert.ok(result.recentIds.every((id) => Date.parse(observations.find((item) => item.id === id).at) >= reviewStart));
  assert.ok(!result.referenceIds.includes('FUTURE'));
  assert.ok(!result.recentIds.includes('FUTURE'));
});

test('private note text is removed from every default export path', () => {
  const workspace = makeScenarioWorkspace('recovery');
  workspace.observations[0].note = 'measurement note secret';
  workspace.contexts.push({ id: 'PRIVATE', kind: 'crew note', value: 'crew note secret', at: NOW, note: 'context note secret', dataset: 'demo', synthetic: true });
  workspace.events.push({ id: 'PRIVATE-EVENT', at: NOW, scenarioId: 'recovery', kind: 'check-in', title: 'Crew note recorded', detail: 'event note secret', provenance: 'Private local crew note', synthetic: true });
  workspace.contexts.push({ id: 'PRIVATE-CHECK-IN', kind: 'symptom', value: 'symptom check-in secret', at: NOW, note: 'symptom context secret', dataset: 'demo', synthetic: true, private: true });
  workspace.events.push({ id: 'PRIVATE-CHECK-IN-EVENT', at: NOW, scenarioId: 'recovery', kind: 'check-in', title: 'Crew symptom check-in', detail: 'symptom event secret', provenance: 'Private local crew check-in', synthetic: true, private: true });
  workspace.investigations[0].note = 'investigation note secret';
  workspace.handoffs.push({ id: 'HANDOFF', scenarioId: 'recovery', status: 'queued', queuedAt: NOW, deliverAt: null, privateNotes: 'handoff note secret', includePrivateNotes: false, summary: 'Review observations' });
  const defaultExport = JSON.stringify(workspaceForExport(workspace, false));
  for (const secret of ['measurement note secret', 'crew note secret', 'context note secret', 'event note secret', 'symptom check-in secret', 'symptom context secret', 'symptom event secret', 'investigation note secret', 'handoff note secret']) {
    assert.equal(defaultExport.includes(secret), false, `${secret} must not appear in the default export`);
  }
  const privateHandoff = privateMaterialForHandoff(workspace, 'draft-only secret');
  for (const secret of ['measurement note secret', 'crew note secret', 'symptom check-in secret', 'symptom context secret', 'investigation note secret', 'draft-only secret']) {
    assert.equal(privateHandoff.includes(secret), true, `${secret} should be included after the explicit handoff opt-in`);
  }
  const optedIn = JSON.stringify(workspaceForExport(workspace, true));
  for (const secret of ['measurement note secret', 'crew note secret', 'context note secret', 'event note secret', 'symptom check-in secret', 'symptom context secret', 'symptom event secret', 'investigation note secret', 'handoff note secret']) {
    assert.equal(optedIn.includes(secret), true, `${secret} should appear after explicit opt-in`);
  }
});

test('assessment uses an explicit clock, records its rule version, and links the recovery pattern', () => {
  const workspace = makeScenarioWorkspace('recovery');
  const result = evaluateAssessment({ scenarioId: 'recovery', observations: workspace.observations, contexts: workspace.contexts,
    missionEvents: workspace.events, now: NOW });
  const combined = result.findings.find((finding) => finding.id === 'combined-personal-shift');
  assert.ok(combined);
  assert.ok(combined.supportingRecordIds.includes('FIXTURE-heart-16'));
  assert.ok(combined.supportingRecordIds.includes('FIXTURE-sleep-16'));
  assert.match(result.ruleVersion, /demo-v1/);
  assert.equal(result.evaluatedAt, NOW);
});

test('cabin timing findings state that overlap does not prove cause', () => {
  const result = evaluateAssessment({ scenarioId: 'cabin', observations: [], now: NOW, contexts: [
    { id: 'SYMPTOM-1', kind: 'symptom', value: 'Headache reported', at: NOW, note: '', dataset: 'demo', synthetic: true },
  ], missionEvents: [
    { id: 'CABIN-1', at: NOW, scenarioId: 'cabin', kind: 'environment', title: 'Cabin reading', detail: 'Fictional sensor event', provenance: 'Synthetic cabin telemetry', synthetic: true },
    { id: 'CABIN-ERROR', at: NOW, scenarioId: 'cabin', kind: 'environment', title: 'Sensor requires verification', detail: 'Contact uncertain', provenance: 'Presenter branch', synthetic: true },
  ] });
  assert.ok(result.findings.some((finding) => finding.id === 'cabin-timing-overlap' && /does not establish exposure or cause/.test(finding.summary)));
  assert.ok(result.findings.some((finding) => finding.id === 'cabin-sensor-verification' && finding.priority === 'verify'));
});

test('radiation assessment preserves data gaps as unknown without estimating a dose', () => {
  const result = evaluateAssessment({ scenarioId: 'radiation', observations: [], contexts: [], now: NOW, missionEvents: [
    { id: 'RAD-GAP', at: NOW, scenarioId: 'radiation', kind: 'exposure', title: 'Radiation record gap', detail: 'Unknown interval remains unknown', provenance: 'Synthetic replay', synthetic: true },
  ] });
  assert.equal(result.findings[0].id, 'radiation-record-gap');
  assert.match(result.findings[0].summary, /does not estimate exposure/);
});

test('assessment rule configuration controls the minimum personal-history requirement', () => {
  const workspace = makeScenarioWorkspace('recovery');
  const result = evaluateAssessment({ scenarioId: 'recovery', observations: workspace.observations, contexts: workspace.contexts,
    missionEvents: workspace.events, now: NOW, rules: { referenceDays: 14, currentDays: 3, minimumComparableDays: 15, cabinOverlapHours: 6 } });
  assert.ok(result.missingEvidence.some((item) => item.includes('needs at least 15 days')));
  assert.equal(result.findings.some((item) => item.id === 'combined-personal-shift'), false);
});

test('reaction comparisons require matching versions and input methods', () => {
  const session = (id, input = 'pointer', version = 'aster-rst-demo-1', interrupted = false, responsesMs = [280, 310]) => ({
    id, scenarioId: 'recovery', version, input, startedAt: NOW, completedAt: NOW, durationMs: 60_000,
    responsesMs, missed: 0, premature: 0, interrupted,
  });
  const matches = comparableReactionSessions([
    session('same'), session('keyboard', 'keyboard'), session('old-version', 'pointer', 'aster-rst-demo-0'),
    session('interrupted', 'pointer', 'aster-rst-demo-1', true), session('no-response', 'pointer', 'aster-rst-demo-1', false, []),
  ], 'aster-rst-demo-1', 'pointer');
  assert.deepEqual(matches.map((item) => item.id), ['same']);
  assert.equal(reactionMedian([280, 320]), 300);
  assert.equal(reactionMedian([]), null);
});

test('radiation workspace preserves NASA RadLab instrument provenance as external context', () => {
  const workspace = makeScenarioWorkspace('radiation');
  const records = workspace.radiationReadings.filter((item) => !item.synthetic);
  assert.equal(records.length, 4);
  assert.equal(records[0].source, RADLAB_EXCERPT.source);
  assert.equal(records[0].spacecraft, 'ISS');
  assert.equal(records[0].unit, 'μGy/hour');
  assert.equal(records[0].at, '2022-04-01T23:00:00');
  assert.equal(records[0].instrument, 'DosTel2');
  assert.equal(records[0].value, 10.2160856666667);
  assert.equal(records[0].sourceUrl, RADLAB_EXCERPT.sourceUrl);
  const packet = JSON.stringify(workspaceForExport(workspace, false));
  assert.match(packet, /NASA Open Science Data Repository · RadLab API/);
  assert.match(packet, /NASA-RADLAB-ISS-20220401-230000-DOSTEL2/);
  assert.match(packet, /timestamp%3C2022-04-02T01:05/);
});
