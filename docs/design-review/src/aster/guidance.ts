import type { Metric, Followup } from '../domain.ts';
import { compareToPersonalBaseline, type ScenarioId, type ScenarioWorkspace } from './domain.ts';

export type ReviewActionKind = 'measurement' | 'check-in' | 'inspect' | 'schedule' | 'review-result' | 'wait' | 'summary' | 'reaction' | 'reopen';
export type ReviewAction = { id: string; kind: ReviewActionKind; label: string; reason: string; metric?: Metric; taskId?: string; optional?: boolean };
export type ReviewGuidance = { title: string; summary: string; next: ReviewAction; supportingIds: string[]; questions: string[]; optional: ReviewAction[] };
export const REVIEW_NAMES: Record<ScenarioId, string> = { recovery: 'Sleep & recovery', cabin: 'Cabin air & symptoms', radiation: 'Radiation records' };

export function inspectionItems(scenario: ScenarioId, workspace: ScenarioWorkspace, now: string) {
  const rows = scenario === 'cabin' ? workspace.cabinReadings : workspace.radiationReadings.filter(r => r.synthetic);
  const latest = [...rows].filter(r => Date.parse(r.at) <= Date.parse(now)).sort((a,b) => b.at.localeCompare(a.at))[0];
  const items = scenario === 'cabin'
    ? [['source', 'Check which cabin sensor supplied this reading'], ['time', 'Check its timestamp against the symptom report'], ['quality', 'Check signal quality; leave uncertain readings marked for verification']]
    : [['source', 'Check the instrument and original timestamp'], ['units', 'Check the original units; these are not personal dose'], ['gaps', 'Identify missing intervals and keep them marked as unknown']];
  return items.map(([id, label]) => ({ id: `${scenario}:${latest?.id ?? 'missing'}:${id}`, label }));
}

export function selectGuidance(scenario: ScenarioId, workspace: ScenarioWorkspace, now: string): ReviewGuidance {
  const time = Date.parse(now);
  const investigation = workspace.investigations.find(i => i.scenarioId === scenario);
  const skipped = workspace.reviewProgress?.skipped ?? [];
  const tasks = workspace.tasks.filter(t => t.episodeId === investigation?.id && t.status === 'open');
  const options: ReviewAction[] = [
    { id:'context', kind:'check-in', label:'Describe how you feel', reason:'Your own description can add context that a measurement cannot.', optional:true },
    ...(scenario === 'recovery' ? [{ id:'reaction', kind:'reaction' as const, label:'Try a 60-second reaction check', reason:'Record response timing as additional context. This is not a validated fitness test.', optional:true }] : []),
    { id:'summary', kind:'summary', label:'Prepare review summary', reason:'Save an editable summary on this device for later review.', optional:true },
  ];
  const guidance: ReviewGuidance = { title: REVIEW_NAMES[scenario], summary:'', next:{id:'schedule',kind:'schedule',label:'Plan a follow-up',reason:'Choose when to check these records again.'}, supportingIds:[], questions:[], optional:options.filter(o => !skipped.includes(o.id)) };
  const ready = tasks.find(t => t.resultId);
  const pending = tasks.find(t => !t.resultId);
  if (scenario === 'recovery') {
    const comparisons = (['heart','sleep'] as const).map(metric => compareToPersonalBaseline(metric,workspace.observations,now));
    guidance.supportingIds = comparisons.flatMap(c => c.recentIds);
    guidance.summary = comparisons.every(c => c.state === 'shifted') ? 'Sleep and resting pulse have both changed from your usual readings. The readings do not tell us why.'
      : comparisons.some(c => c.state === 'insufficient') ? 'There are not enough matching readings to compare sleep and resting pulse reliably yet.'
      : comparisons.some(c => c.state === 'verify') ? 'A reading needs checking before we can use it in a comparison.'
      : comparisons.some(c => c.state === 'shifted') ? 'One reading has changed from your usual pattern. Review the change alongside how you feel.'
      : 'Recent sleep and resting pulse are within your previous pattern. This comparison is not a medical assessment.';
    for (const c of comparisons) {
      if (c.state === 'insufficient') guidance.questions.push(`${c.metric === 'heart' ? 'Pulse' : 'Sleep'} needs more readings taken in matching conditions.`);
      if (c.state === 'verify') guidance.questions.push(`${c.metric === 'heart' ? 'Pulse' : 'Sleep'}: check the value, unit, and collection method.`);
    }
    for (const c of comparisons) {
      const latest = workspace.observations.filter(o => o.metric === c.metric).sort((a,b)=>b.at.localeCompare(a.at))[0];
      const age = latest ? time-Date.parse(latest.at) : Infinity;
      const sameDay = latest?.at.slice(0,10) === now.slice(0,10);
      if (!latest || c.state === 'verify' || age > 86400000 || age < 0 || !Number.isFinite(age) || (c.state === 'insufficient' && !sameDay)) {
        guidance.next = {id:`measure-${c.metric}`,kind:'measurement',metric:c.metric,label:c.metric==='heart'?'Record resting pulse':'Record your sleep',reason:latest?.quality==='verify'?'The last reading needs verification; take a new reading and confirm how it was collected.':!latest?'A reading is missing. Add one before comparing changes.':'A current reading taken in matching conditions will help us check this change.'};
        return withClosed(guidance,investigation?.status);
      }
    }
  } else {
    const records = scenario === 'cabin' ? workspace.cabinReadings : workspace.radiationReadings.filter(r=>r.synthetic);
    const visible = records.filter(r=>Date.parse(r.at)<=time).sort((a,b)=>b.at.localeCompare(a.at));
    guidance.supportingIds = visible.map(r=>r.id);
    guidance.summary = scenario === 'cabin' ? 'A cabin air reading and a symptom report occurred near the same time. This does not establish what caused the symptom.' : 'Review what the radiation instrument recorded and where readings are missing. These records do not measure your personal dose.';
    if (!visible.length) guidance.questions.push('No current instrument record is available. Missing data remains unknown.');
    if (visible[0]?.quality === 'verify') guidance.questions.push('The latest sensor reading needs verification. Recording a review does not make the signal reliable.');
    if (visible[0] && time-Date.parse(visible[0].at)>86400000) guidance.questions.push('The latest instrument reading is more than a day old. It cannot describe current conditions.');
    if (scenario === 'radiation') guidance.questions.push('Missing intervals cannot be used to estimate exposure. Historical NASA records describe a different instrument and mission.');
    const missingCheck = inspectionItems(scenario,workspace,now).some(i=>!workspace.reviewProgress?.inspections[i.id]);
    if (missingCheck) {
      guidance.next={id:'inspect',kind:'inspect',label:scenario==='cabin'?'Check the cabin reading':'Check the instrument records',reason:'Confirm the source, timing, and limitations before drawing conclusions.'};
      return withClosed(guidance,investigation?.status);
    }
    if (scenario==='cabin' && !workspace.contexts.some(c=>c.kind==='symptom' && Date.parse(c.at)<=time)) {
      guidance.next={id:'symptom',kind:'check-in',label:'Describe your symptoms',reason:'Record your own experience so it can be reviewed alongside the sensor timing.'};
      return withClosed(guidance,investigation?.status);
    }
  }
  if (ready) guidance.next={id:'review-result',kind:'review-result',taskId:ready.id,label:'Review the follow-up',reason:'A follow-up result is available. Compare it with what was recorded before.'};
  else if (pending) guidance.next={id:'pending',kind:Date.parse(pending.due)<=time?'check-in':'wait',taskId:pending.id,label:Date.parse(pending.due)<=time?'Record the follow-up':'View planned follow-up',reason:`Your next check is planned for ${pending.due.replace('T',' ').slice(0,16)} UTC.`,...(scenario==='recovery' && Date.parse(pending.due)<=time ? {kind:'measurement' as const,metric:'heart' as const}: {})};
  return withClosed(guidance,investigation?.status);
}

function withClosed(g:ReviewGuidance,status?:string):ReviewGuidance {
  return status==='closed'?{...g,next:{id:'reopen',kind:'reopen',label:'Reopen this review',reason:'The saved review is closed. You can reopen it if you want to continue.'}}:g;
}

export function matchingTask(workspace:ScenarioWorkspace,scenario:ScenarioId,record:{id:string;at:string;metric?:Metric;quality?:string},taskId?:string):Followup|undefined {
  if (record.quality==='verify') return undefined;
  if (scenario==='recovery' ? !['heart','sleep'].includes(record.metric ?? '') : !!record.metric) return undefined;
  return workspace.tasks.find(t=>t.episodeId===`INV-${scenario}` && t.status==='open' && !t.resultId && (!taskId || t.id===taskId) && Date.parse(record.at)>=Date.parse(t.createdAt));
}

/** A newly supplied presenter record may fulfill a pending follow-up, never a missing-data event. */
export function attachFollowupResults(workspace:ScenarioWorkspace,scenario:ScenarioId,at:string):ScenarioWorkspace {
  const candidates = scenario==='recovery' ? workspace.observations.filter(o=>['heart','sleep'].includes(o.metric) && o.quality!=='verify' && o.at===at)
    : (scenario==='cabin' ? workspace.cabinReadings : workspace.radiationReadings.filter(r=>r.synthetic)).filter(r=>r.at===at && r.quality!=='verify');
  let available = [...candidates];
  const tasks = workspace.tasks.map(task=>{
    if (task.status!=='open' || task.resultId || task.episodeId!==`INV-${scenario}`) return task;
    const record = available.find(r=>Date.parse(r.at)>=Date.parse(task.createdAt));
    if (!record) return task;
    available = available.filter(r=>r.id!==record.id);
    return {...task,resultId:record.id};
  });
  if (!tasks.some((t,i)=>t!==workspace.tasks[i])) return workspace;
  return {...workspace,tasks,investigations:workspace.investigations.map(i=>i.scenarioId===scenario && i.status!=='closed'?{...i,status:'ready-for-review',lastUpdatedAt:at}:i)};
}
