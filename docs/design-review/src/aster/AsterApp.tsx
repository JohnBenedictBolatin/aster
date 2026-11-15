import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarClock, Check, CircleHelp,
  HeartPulse, Info, Menu, Radio,
  Save, Signal, X,
} from 'lucide-react';
const AnatomyViewer = lazy(() => import('../AnatomyViewer').then((module) => ({ default: module.AnatomyViewer })));
import type { ContextEntry, Followup, Metric, Observation } from '../domain';
import { EVIDENCE, METRICS, METRIC_ORDER, RULE_VERSION, SCENARIOS, SCENARIO_NOW, compareToPersonalBaseline, createInitialSnapshot, id, makeScenarioWorkspace, type AsterSnapshot, type BaselineComparison, type CabinReading, type Handoff, type InvestigationStatus, type MissionEvent, type MissionEventKind, type ScenarioId, type ScenarioWorkspace } from './domain';
import { privateMaterialForHandoff, workspaceForExport } from './export';
import { evaluateAssessment } from './assessment';
import { ReactionCheck } from './ReactionCheck';
import { loadWorkspace, saveWorkspace, type StorageMode } from './storage';
import { TrendChart } from './TrendChart';
import { useHeartRateMonitor } from '../useHeartRateMonitor';
import { bodyTargetForMetric } from '../assessment';
import { AsterMark, MissionNavigation, type Page } from './MissionNavigation';
import { PresenterDrawer, type PresenterBranch } from './PresenterDrawer';
import { GradientIcon, selectionGradientStyle } from './GradientIcon';
import { ObservationDetails, Pill, SectionHeading } from './PresentationPrimitives';
import { CabinPanel, EvidenceRows, RadiationPanel, type NavigatorEvidence } from './InvestigationEvidence';
import { anatomyManifest } from '../anatomyManifest';
import { UrgentGuidance } from './UrgentGuidance';
import { AsterDialog, GuidedReview, ReviewOverview, reviewDate } from './GuidedReview';
import { attachFollowupResults, inspectionItems, matchingTask, REVIEW_NAMES, selectGuidance, type ReviewAction } from './guidance';
import './aster.css';

type Feedback = { title: string; body: string } | null;
const statusText: Record<InvestigationStatus, string> = {
  open: 'Needs review', 'awaiting-measurement': 'Waiting for a check',
  'awaiting-reassessment': 'Ready for reassessment', 'ready-for-review': 'Ready for review', closed: 'Closed',
};
const SCENARIO_IDS: ScenarioId[] = ['recovery', 'cabin', 'radiation'];

function stamp(value: string, withTime = true) {
  const at = new Date(value);
  if (!Number.isFinite(at.valueOf())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'UTC',
  }).format(at) + ' UTC';
}

function signed(value: number, precision: number) {
  const rounded = Number(value.toFixed(precision));
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function phaseDay(now: string, start: string) {
  const date = new Date(now);
  const [year, month, day] = start.split('-').map(Number);
  return Math.max(1, Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(year, month - 1, day)) / 86_400_000) + 1);
}

function createEvent(scenarioId: ScenarioId, kind: MissionEventKind, at: string, title: string, detail: string, provenance: string, synthetic = true): MissionEvent {
  return { id: id('EVENT'), scenarioId, kind, at, title, detail, provenance, synthetic };
}

function evolveScenarioClock(snapshot: AsterSnapshot, at: string): AsterSnapshot {
  const scenarioId = snapshot.activeScenario;
  const workspace = snapshot.workspaces[scenarioId];
  const received = workspace.handoffs.filter((handoff) => handoff.status === 'transmitted' && handoff.deliverAt
    && Date.parse(handoff.deliverAt) <= Date.parse(at));
  const nextWorkspace: ScenarioWorkspace = {
    ...workspace,
    handoffs: workspace.handoffs.map((handoff) => received.some((item) => item.id === handoff.id)
      ? { ...handoff, status: 'received' } : handoff),
    events: received.length ? [...workspace.events, ...received.map((handoff) => createEvent(scenarioId, 'handoff', handoff.deliverAt!,
      'Handoff received', 'The configured one-way delivery time elapsed.', 'Presenter-controlled communication state'))] : workspace.events,
  };
  return { ...snapshot, scenarioNow: at, scenarioTimes: { ...snapshot.scenarioTimes, [scenarioId]: at },
    workspaces: { ...snapshot.workspaces, [scenarioId]: nextWorkspace } };
}

function metricValue(observation: Observation): string {
  if (observation.metric === 'bp') return `${observation.value}/${observation.secondary ?? '—'} ${observation.unit}`;
  if (observation.metric === 'sleep') return `${Number(observation.value).toFixed(1)} h`;
  return `${observation.value}${observation.unit ? ` ${observation.unit}` : ''}`;
}

function missionEventsForScenario(scenarioId: ScenarioId, workspace: ScenarioWorkspace, nowMs: number): MissionEvent[] {
  const list: MissionEvent[] = [...workspace.events];
  const fixtureDays = new Map<string, Observation[]>();
  for (const item of workspace.observations.filter((record) => record.id.startsWith('FIXTURE-'))) {
    const day = item.at.slice(0, 10);
    fixtureDays.set(day, [...(fixtureDays.get(day) ?? []), item]);
  }
  for (const [day, records] of fixtureDays) {
    const ordered = records.sort((a, b) => a.at.localeCompare(b.at));
    const labels: Metric[] = ['heart', 'sleep', 'bp', 'temperature', 'glucose', 'mood'];
    const detail = labels.map((metric) => ordered.find((record) => record.metric === metric))
      .filter((record): record is Observation => !!record).map((record) => `${METRICS[record.metric].short} ${metricValue(record)}`).join(' · ');
    list.push({ id: `TIMELINE-DAY-${scenarioId}-${day}`, at: ordered.at(-1)!.at, scenarioId, kind: 'measurement', title: 'Daily readings',
      detail, provenance: 'Daily crew records', synthetic: true });
  }
  for (const item of workspace.observations.filter((record) => !record.id.startsWith('FIXTURE-'))) {
    const alreadyListed = workspace.events.some((entry) => entry.kind === 'measurement' && entry.at === item.at);
    if (!alreadyListed) list.push({ id: `TIMELINE-${item.id}`, at: item.at, scenarioId, kind: 'measurement', title: METRICS[item.metric].short,
      detail: metricValue(item), provenance: item.provenance?.label ?? item.source, synthetic: item.synthetic });
  }
  for (const item of workspace.contexts) {
    const alreadyListed = workspace.events.some((entry) => entry.at === item.at && (entry.kind === 'check-in' || entry.kind === 'workload'));
    if (!alreadyListed) list.push({ id: `TIMELINE-${item.id}`, at: item.at, scenarioId, kind: 'check-in', title: item.kind, detail: item.value,
      provenance: item.synthetic ? 'Crew check-in' : 'Crew-entered', synthetic: item.synthetic });
  }
  return list.filter((item) => Date.parse(item.at) <= nowMs).sort((a, b) => b.at.localeCompare(a.at));
}

function followupStatus(task: Followup, now: string) {
  if (task.status === 'complete') return 'Reviewed';
  if (task.resultId) return 'Result ready to review';
  return Date.parse(task.due) <= Date.parse(now) ? 'Due now' : 'Planned';
}

function changeCopy(metric: Metric, comparison: BaselineComparison) {
  if (comparison.state === 'insufficient') return `Insufficient history · ${comparison.explanation}`;
  if (comparison.state === 'verify') return 'This record needs a source or measurement-condition check before comparison.';
  if (comparison.state === 'within-history') return 'These readings are within your previous pattern. This is not a medical assessment.';
  if (comparison.change === null) return comparison.explanation;
  const precision = metric === 'sleep' || metric === 'temperature' ? 1 : 0;
  const label = metric === 'heart' ? 'Resting pulse' : METRICS[metric].short;
  const direction = comparison.recentMedian !== null && comparison.median !== null
    ? comparison.recentMedian < comparison.median ? 'below' : 'above' : 'different from';
  return `${label} is ${direction} your usual range (${signed(comparison.change, precision)} ${comparison.unit} from the previous middle value).`;
}

function freshnessLabel(observation: Observation, now: string) {
  const age = Date.parse(now) - Date.parse(observation.at);
  if (!Number.isFinite(age) || age < 0) return 'Check the recorded time';
  if (age > 24 * 60 * 60 * 1_000) return 'Older reading · check again';
  return 'Recent reading';
}

export default function AsterApp() {
  const [snapshot, setSnapshot] = useState<AsterSnapshot | null>(null);
  const snapshotRef = useRef<AsterSnapshot | null>(null);
  const saveChain = useRef(Promise.resolve());
  const playbackRef = useRef('');
  const [storageMode, setStorageMode] = useState<StorageMode>('opening');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<Page>('log');
  const [selectedMetric, setSelectedMetric] = useState<Metric>('heart');
  const [selectedRecordId, setSelectedRecordId] = useState('FIXTURE-heart-16');
  const [selectedTimelineId, setSelectedTimelineId] = useState('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('RAD-16');
  const [showPresenter, setShowPresenter] = useState(false);
  const [runningClock, setRunningClock] = useState(false);
  const [liveClock, setLiveClock] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [anatomyOpen, setAnatomyOpen] = useState(false);
  const [entryChoiceOpen, setEntryChoiceOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [followupDue, setFollowupDue] = useState('');
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [entryTaskId, setEntryTaskId] = useState<string | undefined>();
  const [deviceCaptureOpen, setDeviceCaptureOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [entryKind, setEntryKind] = useState<'measurement' | 'check-in' | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeExportNotes, setIncludeExportNotes] = useState(false);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [handoffDraft, setHandoffDraft] = useState('');
  const [newNote, setNewNote] = useState('');
  const [checkInText, setCheckInText] = useState('');
  const [formError, setFormError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const liveMonitor = useHeartRateMonitor();
  const [baselineMetric, setBaselineMetric] = useState<Metric>('heart');

  const enqueueSave = useCallback((next: AsterSnapshot) => {
    setSaving(true);
    saveChain.current = saveChain.current.catch(() => undefined).then(async () => {
      const mode = await saveWorkspace(next);
      setStorageMode(mode);
      setSaving(false);
    }).catch(() => { setStorageMode('error'); setSaving(false); });
  }, []);

  const commitSnapshot = useCallback((update: (current: AsterSnapshot) => AsterSnapshot) => {
    const current = snapshotRef.current;
    if (!current) return;
    const next = update(current);
    snapshotRef.current = next;
    setSnapshot(next);
    enqueueSave(next);
  }, [enqueueSave]);

  useEffect(() => {
    let active = true;
    void loadWorkspace().then(({ snapshot: saved, mode }) => {
      if (!active) return;
      const value = saved ?? createInitialSnapshot();
      snapshotRef.current = value;
      setSnapshot(value);
      setStorageMode(mode);
      setShowPresenter(value.settings.presenterOpen);
      setLiveClock(value.scenarioNow);
      playbackRef.current = value.scenarioNow;
      if (!saved) enqueueSave(value);
    }).catch(() => {
      if (!active) return;
      const value = createInitialSnapshot();
      snapshotRef.current = value;
      setSnapshot(value);
      setStorageMode('error');
      setLiveClock(value.scenarioNow);
      playbackRef.current = value.scenarioNow;
    });
    return () => { active = false; };
  }, [enqueueSave]);

  useEffect(() => {
    if (!runningClock || !snapshot) return;
    const timer = window.setInterval(() => {
      const next = new Date(Date.parse(playbackRef.current) + 1_000).toISOString();
      playbackRef.current = next;
      setLiveClock(next);
    }, 1_000);
    const saveTimer = window.setInterval(() => commitSnapshot((current) => evolveScenarioClock(current, playbackRef.current)), 10_000);
    return () => { window.clearInterval(timer); window.clearInterval(saveTimer); };
  }, [runningClock, !!snapshot, commitSnapshot]);

  const viewSnapshot = snapshot && liveClock ? { ...snapshot, scenarioNow: liveClock } : snapshot;
  const scenarioId = viewSnapshot?.activeScenario ?? 'recovery';
  const scenario = SCENARIOS[scenarioId];
  const workspace = viewSnapshot?.workspaces[scenarioId];
  const investigation = workspace?.investigations.find((item) => item.id === `INV-${scenarioId}`);
  const scenarioTime = viewSnapshot?.scenarioNow ?? '';
  const nowMs = Date.parse(scenarioTime);
  const activePage = page;
  const baselineMemo = useMemo(() => workspace ? Object.fromEntries((['heart', 'sleep', 'bp', 'temperature', 'glucose', 'mood'] as Metric[])
    .map((metric) => [metric, compareToPersonalBaseline(metric, workspace.observations, scenarioTime)])) as Record<Metric, BaselineComparison> : null,
  [workspace, scenarioTime]);

  const commitWorkspace = useCallback((update: (current: ScenarioWorkspace, snapshot: AsterSnapshot) => ScenarioWorkspace) => {
    commitSnapshot((current) => ({ ...current,
      workspaces: { ...current.workspaces, [current.activeScenario]: update(current.workspaces[current.activeScenario], current) },
    }));
  }, [commitSnapshot]);

  const setScenario = useCallback((nextScenario: ScenarioId) => {
    setRunningClock(false);
    setSelectedMetric('heart');
    setBaselineMetric('heart');
    setSelectedRecordId('FIXTURE-heart-16');
    setFeedback(null);
    setPage('investigations');
    setReviewOpen(true); setInspectionOpen(false); setEntryTaskId(undefined); setReviewTaskId(null);
    const previousTime = playbackRef.current || scenarioTime;
    const nextTime = snapshotRef.current?.scenarioTimes[nextScenario] ?? scenarioTime;
    playbackRef.current = nextTime;
    commitSnapshot((current) => ({ ...current, activeScenario: nextScenario, scenarioNow: nextTime,
      scenarioTimes: { ...current.scenarioTimes, [current.activeScenario]: previousTime } }));
    setLiveClock(nextTime);
  }, [commitSnapshot, scenarioTime]);

  const changeReviewStatus = (closed: boolean) => {
    commitWorkspace((current, snapshotNow) => ({ ...current,
      investigations: current.investigations.map(item => item.scenarioId === snapshotNow.activeScenario ? { ...item, status: closed ? 'closed' : 'open', lastUpdatedAt: snapshotNow.scenarioNow } : item),
      events: [...current.events, createEvent(snapshotNow.activeScenario, 'action', snapshotNow.scenarioNow, closed ? 'Review closed' : 'Review reopened', closed ? 'Saved by the crew member; this does not certify recovery.' : 'The crew member reopened this review.', 'Crew action')],
    }));
    setFeedback({ title: closed ? 'Review saved and closed' : 'Review reopened', body: closed ? 'Your readings and any pending follow-ups are kept.' : 'Continue from the existing records.' });
  };

  const saveMeasurement = useCallback((form: HTMLFormElement) => {
    if (!workspace || !scenarioTime) return;
    const data = new FormData(form);
    const metric = data.get('metric') as Metric;
    const raw = String(data.get('value') ?? '').trim();
    const secondaryRaw = String(data.get('secondary') ?? '').trim();
    const context = String(data.get('context') ?? '').trim();
    if (!METRICS[metric] || !raw || !context) { setFormError('Enter a value and choose the conditions used for this reading.'); return; }
    const numeric = metric === 'mood' ? raw : Number(raw);
    if (typeof numeric === 'number' && (!Number.isFinite(numeric) || numeric < 0)) { setFormError('Enter a valid, non-negative reading.'); return; }
    const observation: Observation = {
      id: id('CREW'), metric, value: numeric, secondary: secondaryRaw ? Number(secondaryRaw) : undefined,
      unit: METRICS[metric].unit, at: scenarioTime, method: String(data.get('method') || 'Crew-entered reading'), context,
      note: String(data.get('note') || '').trim(), source: 'Crew-entered record', synthetic: true,
      dataset: 'demo', quality: String(data.get('method') || '').trim() && context ? 'usable' : 'verify',
      guidanceVersion: 'Aster scenario rules v1', missionPhase: snapshot?.settings.phase ?? 'Transit',
      provenance: { kind: 'manual', label: 'Crew entered' },
    };
    const task = matchingTask(workspace, scenarioId, observation, entryTaskId);
    commitWorkspace((current, snapshotNow) => ({ ...current,
      observations: [...current.observations, observation],
      tasks: task ? current.tasks.map((item) => item.id === task.id ? { ...item, resultId: observation.id } : item) : current.tasks,
      investigations: current.investigations.map((item) => item.scenarioId === snapshotNow.activeScenario
        ? { ...item, status: item.status === 'closed' ? 'closed' : task ? 'ready-for-review' : item.status, lastUpdatedAt: snapshotNow.scenarioNow } : item),
      events: [...current.events, createEvent(snapshotNow.activeScenario, 'measurement', snapshotNow.scenarioNow,
        `${METRICS[metric].short} recorded`, `${metricValue(observation)} · ${observation.method} · ${context}`, 'Crew-entered record')],
    }));
    setSelectedMetric(metric);
    setBaselineMetric(metric);
    setSelectedRecordId(observation.id);
    setEntryKind(null);
    setPage('investigations'); setReviewOpen(true); setEntryTaskId(undefined);
    setFormError('');
    setFeedback({ title: 'Reading saved', body: 'The new value is now included in the mission timeline. Review whether its source and conditions match earlier readings.' });
  }, [workspace, scenarioTime, scenarioId, entryTaskId, commitWorkspace, snapshot]);

  const saveContext = useCallback((form: HTMLFormElement) => {
    if (!workspace || !scenarioTime) return;
    const data = new FormData(form);
    const value = String(data.get('value') ?? '').trim();
    if (!value) { setFormError('Add a brief check-in or symptom description.'); return; }
    const kind = String(data.get('kind') ?? 'crew check-in');
    const entry: ContextEntry = { id: id('CTX'), kind, value, at: scenarioTime, note: String(data.get('note') ?? '').trim(),
      dataset: 'demo', synthetic: true, episodeId: `INV-${scenarioId}`, private: true };
    const task = matchingTask(workspace, scenarioId, entry, entryTaskId);
    commitWorkspace((current, snapshotNow) => ({ ...current, contexts: [...current.contexts, entry],
      tasks: task ? current.tasks.map((item) => item.id === task.id ? { ...item, resultId: entry.id } : item) : current.tasks,
      investigations: current.investigations.map((item) => item.scenarioId === snapshotNow.activeScenario
        ? { ...item, status: item.status === 'closed' ? 'closed' : task ? 'ready-for-review' : item.status, lastUpdatedAt: snapshotNow.scenarioNow } : item),
      events: [...current.events, { ...createEvent(snapshotNow.activeScenario, 'check-in', snapshotNow.scenarioNow,
        kind === 'symptom' ? 'Crew symptom check-in' : 'Crew check-in', value, 'Private local crew check-in'), private: true }],
    }));
    setEntryKind(null);
    setFormError('');
    setCheckInText(''); setEntryTaskId(undefined); setPage('investigations'); setReviewOpen(true);
    setFeedback({ title: 'Check-in recorded', body: 'The entry is linked to this investigation. You can revise or add context from the timeline.' });
  }, [workspace, scenarioTime, scenarioId, entryTaskId, commitWorkspace]);


  const savedReading = workspace?.observations.find((item) => item.id === selectedRecordId && item.metric === selectedMetric)
    ?? workspace?.observations.filter((item) => item.metric === selectedMetric).sort((a, b) => b.at.localeCompare(a.at))[0];
  const activeMetric = baselineMetric;
  const activeComparison = baselineMemo?.[activeMetric];
  const recentPoints = workspace?.observations.filter((item) => item.metric === activeMetric
    && typeof item.value === 'number' && Number.isFinite(item.value)
    && Date.parse(item.at) <= nowMs && Date.parse(item.at) >= nowMs - 17 * 86_400_000)
    .sort((a, b) => a.at.localeCompare(b.at)) ?? [];

  const events = useMemo(() => workspace ? missionEventsForScenario(scenarioId, workspace, nowMs) : [], [workspace, scenarioId, nowMs]);
  const historyRows = useMemo(() => viewSnapshot ? SCENARIO_IDS.flatMap((key) => {
    const at = key === viewSnapshot.activeScenario ? viewSnapshot.scenarioNow : viewSnapshot.scenarioTimes[key];
    return missionEventsForScenario(key, viewSnapshot.workspaces[key], Date.parse(at)).map((event) => ({ scenarioId: key, event }));
  }).sort((a, b) => b.event.at.localeCompare(a.event.at)) : [], [viewSnapshot]);

  const assessment = useMemo(() => evaluateAssessment({
    scenarioId, observations: workspace?.observations ?? [], contexts: workspace?.contexts ?? [],
    missionEvents: workspace?.events ?? [], now: scenarioTime,
  }), [scenarioId, workspace, scenarioTime]);

  const navigatorEvidence = useMemo<NavigatorEvidence[]>(() => {
    if (!workspace) return [];
    if (scenarioId === 'recovery') {
      const rows = (['heart', 'sleep'] as Metric[]).flatMap((metric) => {
        const comparison = baselineMemo?.[metric];
        const ids = new Set([...(comparison?.referenceIds ?? []), ...(comparison?.recentIds ?? [])]);
        const records = workspace.observations.filter((item) => ids.has(item.id));
        const reviewStart = Math.floor(nowMs / 86_400_000) * 86_400_000 - 2 * 86_400_000;
        const reference = records.filter((item) => Date.parse(item.at) < reviewStart).sort((a, b) => b.at.localeCompare(a.at))[0];
        const recent = records.filter((item) => Date.parse(item.at) >= reviewStart).sort((a, b) => b.at.localeCompare(a.at))[0];
        return [reference, recent].filter((item): item is Observation => !!item).map((item) => ({
          id: item.id, at: item.at, title: METRICS[item.metric].short, detail: `${metricValue(item)} · ${item.context} · ${item.method}`,
          observationId: item.id,
        }));
      });
      return rows.sort((a, b) => a.at.localeCompare(b.at));
    }
    if (scenarioId === 'cabin') {
      const records: NavigatorEvidence[] = workspace.cabinReadings.filter((item) => Date.parse(item.at) <= nowMs).map((item) => ({
        id: item.id, at: item.at, title: `Cabin reading · ${item.value} ${item.unit}`, detail: `${item.instrument} · ${item.quality === 'verify' ? 'needs verification' : 'Recorded'}`,
        eventId: events.find((event) => event.kind === 'environment' && event.at === item.at)?.id,
      }));
      const symptoms = events.filter((item) => item.scenarioId === scenarioId && item.kind === 'check-in').slice(0, 2).map((item) => ({
        id: item.id, at: item.at, title: item.title, detail: item.detail, eventId: item.id,
      }));
      return [...records.map((item) => ({ ...item, id: `evidence-${item.id}` })), ...symptoms].sort((a, b) => a.at.localeCompare(b.at)).slice(-4);
    }
    const records: NavigatorEvidence[] = workspace.radiationReadings.filter((item) => item.synthetic || Date.parse(item.at) <= nowMs).map((item) => ({
      id: `evidence-${item.id}`, at: item.at, title: `Instrument record · ${item.value.toFixed(2)} ${item.unit}`,
      detail: `${item.spacecraft ? `${item.spacecraft} · ` : ''}${item.instrument} · ${item.synthetic ? 'Mission record' : 'Historical NASA RadLab reference · not personal dose'}${item.quality === 'verify' ? ' · needs verification' : ''}`,
      instrumentId: item.id, timeLabel: item.synthetic ? stamp(item.at) : `${item.at} · source timestamp`,
      eventId: events.find((event) => event.kind === 'exposure' && event.at === item.at)?.id,
    }));
    const gaps = events.filter((item) => item.scenarioId === scenarioId && item.kind === 'exposure' && /gap|missing/i.test(`${item.title} ${item.detail}`)).map((item) => ({
      id: item.id, at: item.at, title: item.title, detail: item.detail, eventId: item.id,
    }));
    return [...records, ...gaps].sort((a, b) => a.at.localeCompare(b.at));
  }, [workspace, scenarioId, baselineMemo, nowMs, events]);

  const queueHandoff = () => {
    if (!workspace) return;
    const summary = handoffDraft.trim() || `${scenario.title}. ${scenario.lead}`;
    const handoff: Handoff = { id: id('HANDOFF'), scenarioId, status: 'queued', queuedAt: scenarioTime,
      deliverAt: null, privateNotes: includeNotes ? privateMaterialForHandoff(workspace, newNote) : '', includePrivateNotes: includeNotes, summary };
    commitWorkspace((current, snapshotNow) => ({ ...current, handoffs: [handoff, ...current.handoffs],
      events: [...current.events, createEvent(snapshotNow.activeScenario, 'handoff', snapshotNow.scenarioNow,
        'Handoff saved to local queue', 'Draft saved locally.', 'Local-only handoff')],
    }));
    setFeedback({ title: 'Handoff queued locally', body: 'Advance the mission clock to update delivery status.' });
  };

  const simulateDelivery = () => {
    const handoff = workspace?.handoffs.find((item) => item.scenarioId === scenarioId && item.status === 'queued');
    if (!handoff) return;
    const delay = snapshot?.settings.linkDelayMinutes ?? 12;
    const transmitAt = new Date(nowMs + delay * 60_000).toISOString();
    commitWorkspace((current, snapshotNow) => ({ ...current, handoffs: current.handoffs.map((item) => item.id === handoff.id
      ? { ...item, status: 'transmitted', deliverAt: transmitAt } : item),
      events: [...current.events, createEvent(snapshotNow.activeScenario, 'handoff', snapshotNow.scenarioNow,
        'Handoff marked transmitted', `One-way link delay · ${delay} minutes.`, 'Presenter-controlled communication state')],
    }));
    setFeedback({ title: 'Handoff in transit', body: `Advance mission time by ${delay} minutes to show receipt.` });
  };

  const advanceClock = (milliseconds: number) => {
    setRunningClock(false);
    const advanced = new Date(nowMs + milliseconds).toISOString();
    playbackRef.current = advanced;
    setLiveClock(advanced);
    commitSnapshot((current) => evolveScenarioClock(current, advanced));
    setFeedback({ title: 'Mission clock advanced', body: `${stamp(advanced)}. Events, reminders, and handoff delivery use mission time.` });
  };

  const presenterBranch = (branch: PresenterBranch) => {
    if (!workspace) return;
    const eventTitle: Record<typeof branch, string> = {
      recovery: 'Crew follow-up recorded', persistent: 'Follow-up still differs from personal history',
      'sensor-error': 'Sensor contact lost', 'cabin-clear': 'Environmental follow-up recorded',
      'cabin-sensor': 'Cabin sensor requires verification', 'radiation-gap': 'Radiation data gap recorded',
      'radiation-record': 'Radiation instrument event recorded', 'missing-evidence': 'Follow-up evidence unavailable',
    };
    const at = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();
    if (branch === 'missing-evidence') {
      const hasOpenFollowup = workspace.tasks.some((item) => item.episodeId === `INV-${scenarioId}` && item.status === 'open');
      const task: Followup | undefined = hasOpenFollowup ? undefined : {
        id: id('TASK'), kind: 'routine', episodeId: `INV-${scenarioId}`,
        title: scenarioId === 'recovery' ? 'Record a comparable recovery follow-up' : scenarioId === 'cabin' ? 'Review the sensor and symptom timeline' : 'Review instrument coverage and data gaps',
        due: new Date(nowMs + 6 * 60 * 60 * 1000).toISOString(), createdAt: scenarioTime, status: 'open', dataset: 'demo', synthetic: true,
      };
      commitWorkspace((current, snapshotNow) => ({ ...current,
        tasks: task ? [...current.tasks, task] : current.tasks,
        investigations: current.investigations.map((item) => item.id === `INV-${scenarioId}`
          ? { ...item, status: 'awaiting-measurement', lastUpdatedAt: at } : item),
        events: [...current.events, createEvent(snapshotNow.activeScenario, 'action', at, eventTitle[branch],
          'No new follow-up measurement or record is available. The task remains open and the previous evidence is preserved without treating it as current.', 'Presenter-controlled missing-evidence branch')],
      }));
      playbackRef.current = at;
      setLiveClock(at);
      commitSnapshot((current) => evolveScenarioClock(current, at));
      setFeedback({ title: 'Follow-up evidence is missing', body: 'No new reading was added. The investigation is waiting for a measurement and the follow-up remains open.' });
      return;
    }
    if (scenarioId === 'recovery') {
      const values = branch === 'recovery' ? { heart: 72, sleep: 7.2 } : { heart: 87, sleep: 4.2 };
      if (branch === 'sensor-error') {
        const sample: Observation = { id: id('REPLAY'), metric: 'heart', value: 64, unit: 'bpm', at, method: 'Bluetooth heart-rate monitor',
          context: 'At rest · seated', note: 'Signal contact was not detected.', source: 'Heart-rate sensor · contact lost', synthetic: true,
          dataset: 'demo', quality: 'verify', guidanceVersion: 'Aster scenario rules v1', missionPhase: snapshot?.settings.phase ?? 'Transit',
          provenance: { kind: 'scenario-branch', label: 'Presenter-selected sensor fault' } };
        commitWorkspace((current, snapshotNow) => ({ ...current, observations: [...current.observations, sample],
          investigations: current.investigations.map((item) => item.id === `INV-${scenarioId}`
            ? { ...item, status: 'awaiting-measurement', lastUpdatedAt: at } : item),
          events: [...current.events, createEvent(snapshotNow.activeScenario, 'measurement', at, eventTitle[branch], 'The measurement is marked for verification and is excluded from the personal reference comparison.', 'Presenter-controlled branch')],
        }));
      } else {
        commitWorkspace((current, snapshotNow) => {
          const additions: Observation[] = ([['heart', values.heart, 8], ['sleep', values.sleep, 6]] as const).map(([metric, value, hour]) => ({
            id: id('REPLAY'), metric, value, unit: METRICS[metric].unit, at, method: metric === 'heart' ? 'Crew self-measurement' : 'Crew check-in',
            context: metric === 'heart' ? 'At rest · seated' : 'Main sleep period', note: '', source: 'Presenter-selected scenario outcome',
            synthetic: true, dataset: 'demo', quality: 'usable', guidanceVersion: 'Aster scenario rules v1', missionPhase: snapshotNow.settings.phase,
            provenance: { kind: 'scenario-branch', label: 'Presenter-selected alternate outcome', recordedHourUtc: hour },
          } as Observation));
          const nextClock = at;
          return { ...current, observations: [...current.observations, ...additions],
            events: [...current.events, createEvent(snapshotNow.activeScenario, 'measurement', at, eventTitle[branch],
              `Follow-up outcome · pulse ${values.heart} bpm · sleep ${values.sleep.toFixed(1)} h. Assessment still uses personal history.`, 'Presenter-controlled branch')],
            investigations: current.investigations.map((item) => item.id === `INV-${scenarioId}`
              ? { ...item, status: 'awaiting-reassessment', lastUpdatedAt: nextClock } : item),
          };
        });
      }
    } else if (scenarioId === 'cabin') {
      const reading: CabinReading = { id: id('CABIN-REPLAY'), at, value: branch === 'cabin-clear' ? 740 : 2050,
        unit: 'ppm', instrument: branch === 'cabin-sensor' ? 'Cabin CO₂ sensor · contact uncertain' : 'Cabin CO₂ sensor',
        quality: branch === 'cabin-sensor' ? 'verify' : 'usable', synthetic: true };
      commitWorkspace((current, snapshotNow) => ({ ...current, cabinReadings: [...current.cabinReadings, reading],
        investigations: current.investigations.map((item) => item.id === `INV-${scenarioId}`
          ? { ...item, status: branch === 'cabin-sensor' ? 'awaiting-measurement' : 'awaiting-reassessment', lastUpdatedAt: at } : item),
        events: [...current.events, createEvent(snapshotNow.activeScenario, 'environment', at, eventTitle[branch],
          `${reading.value} ppm · ${reading.instrument}`, 'Presenter-controlled scenario branch')],
      }));
    } else {
      commitWorkspace((current, snapshotNow) => ({ ...current,
        investigations: current.investigations.map((item) => item.id === `INV-${scenarioId}`
          ? { ...item, status: branch === 'radiation-gap' ? 'awaiting-measurement' : 'awaiting-reassessment', lastUpdatedAt: at } : item),
        events: [...current.events, createEvent(snapshotNow.activeScenario, 'exposure', at, eventTitle[branch],
          branch === 'radiation-gap' ? 'The missing interval remains unknown; no dose is inferred from the gap.'
            : 'Instrument, timestamp, and unit stay attached; no personal dose is inferred.', 'Presenter-controlled scenario branch')],
        radiationReadings: branch === 'radiation-gap' ? current.radiationReadings : [...current.radiationReadings,
          { id: id('RAD-REPLAY'), at, value: 0.36, unit: 'µGy/h', instrument: 'Dosimeter', quality: 'usable', synthetic: true }],
      }));
    }
    playbackRef.current = at;
    setLiveClock(at);
    commitSnapshot((current) => evolveScenarioClock(current, at));
    commitWorkspace(current=>attachFollowupResults(current,scenarioId,at));
    setFeedback({ title: 'Follow-up outcome loaded', body: 'New evidence added. Earlier observations remain intact.' });
  };

  const resetScenario = () => {
    if (!window.confirm(`Reset ${SCENARIOS[scenarioId].label.toLowerCase()} to its starting observations? Live readings and other investigations will be preserved.`)) return;
    const fresh = makeScenarioWorkspace(scenarioId);
    const resetAt = new Date(SCENARIO_NOW).toISOString();
    playbackRef.current = resetAt;
    setLiveClock(resetAt);
    setRunningClock(false);
    commitSnapshot((current) => ({ ...current, scenarioNow: resetAt, scenarioTimes: { ...current.scenarioTimes, [scenarioId]: resetAt },
      workspaces: { ...current.workspaces, [scenarioId]: fresh } }));
    setSelectedRecordId('FIXTURE-heart-16');
    setSelectedMetric('heart');
    setBaselineMetric('heart');
    setReactionOpen(false);
    setFeedback({ title: 'Scenario reset', body: 'The selected scenario has returned to its reproducible starting point.' });
  };

  const saveCrewNote = () => {
    if (!newNote.trim()) return;
    const note = newNote.trim();
    commitWorkspace((current, snapshotNow) => ({ ...current,
      contexts: [...current.contexts, { id: id('CTX'), kind: 'crew note', value: note, at: snapshotNow.scenarioNow,
        note: '', dataset: 'demo', synthetic: true, episodeId: `INV-${snapshotNow.activeScenario}` }],
      events: [...current.events, { ...createEvent(snapshotNow.activeScenario, 'check-in', snapshotNow.scenarioNow,
        'Crew note recorded', note, 'Private local crew note'), private: true }],
    }));
    setNewNote('');
    setFeedback({ title: 'Private note saved', body: 'The note stays on this device. It will be included in a handoff only if you explicitly choose to include private notes.' });
  };

  const exportMission = () => {
    if (!viewSnapshot || !workspace || !investigation) return;
    const exportWorkspace = workspace ? workspaceForExport(workspace, includeExportNotes) : null;
    const packet = { product: 'Aster', scenario: scenarioId, recordSet: 'scenario', createdAt: scenarioTime,
      guidance: 'Review health concerns with mission-approved procedures.',
      privacy: { privateTextIncluded: includeExportNotes, policy: includeExportNotes ? 'User opted in for this export' : 'Private notes and check-in text omitted by default' },
      ruleVersion: RULE_VERSION, assessment, investigation: exportWorkspace?.investigations.find((item) => item.id === investigation.id) ?? investigation,
      comparisons: baselineMemo, workspace: exportWorkspace,
      observations: exportWorkspace?.observations ?? [], context: exportWorkspace?.contexts ?? [],
      events: exportWorkspace?.events ?? [], tasks: exportWorkspace?.tasks ?? [],
      handoff: exportWorkspace?.handoffs[0] ?? null,
      evidence: includeEvidence ? EVIDENCE.filter((item) => item.appliesTo.includes(scenarioId)) : undefined,
    };
    const body = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Aster mission handoff</title><style>
      :root{color-scheme:dark}body{margin:36px;background:#080808;color:#eee;font:16px/1.6 'Segoe UI',Arial,sans-serif}main{max-width:940px;margin:auto;padding:32px;border:1px solid #303030;background:#121212}h1,h2{color:#fff}a{color:#ddd}small,.muted{color:#aaa}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #303030;padding:9px;text-align:left;vertical-align:top}.notice{border:1px solid #474747;padding:13px;margin:18px 0}</style><main>
      <p class="muted">ASTER · ${escapeMarkup(scenario.label.toUpperCase())}</p><h1>${escapeMarkup(scenario.title)}</h1>
      <p>${escapeMarkup(scenario.brief)}</p><p class="notice">Review health concerns with mission-approved procedures.</p>
      <p><strong>Investigation status:</strong> ${escapeMarkup(statusText[investigation.status])} · <strong>Rule version:</strong> Personal baseline ${escapeMarkup(RULE_VERSION.split('-').at(-1) ?? 'v1')}</p>
      <h2>Baseline comparison</h2><table><tr><th>Indicator</th><th>Personal reference median</th><th>Recent median</th><th>Observations</th><th>Finding</th></tr>${(['heart', 'sleep', 'bp', 'temperature', 'glucose'] as Metric[]).map((metric) => { const data = baselineMemo?.[metric]; return `<tr><td>${escapeMarkup(METRICS[metric].label)}</td><td>${data?.median ?? 'Insufficient data'} ${escapeMarkup(data?.unit ?? '')}</td><td>${data?.recentMedian ?? 'Not available'} ${escapeMarkup(data?.unit ?? '')}</td><td>${data?.count ?? 0} reference days · ${data?.recentCount ?? 0} recent</td><td>${escapeMarkup(data?.explanation ?? 'Not assessed')}</td></tr>`; }).join('')}</table>
      <h2>Assessment output</h2><ul>${assessment.findings.map((finding) => `<li><strong>${escapeMarkup(finding.title)}</strong> · ${escapeMarkup(finding.summary)} · ${finding.supportingRecordIds.length} supporting records</li>`).join('')}</ul>
      <h3>Evidence gaps</h3><ul>${assessment.missingEvidence.map((item) => `<li>${escapeMarkup(item)}</li>`).join('')}</ul>
      <h3>Suggested review steps</h3><ul>${assessment.workflowSteps.map((item) => `<li>${escapeMarkup(item)}</li>`).join('')}</ul>
      <h2>Measurements and context</h2><table><tr><th>Recorded</th><th>Entry</th><th>Method, source, conditions, provenance</th>${includeExportNotes ? '<th>Note</th>' : ''}</tr>${exportWorkspace?.observations.map((item) => `<tr><td>${escapeMarkup(stamp(item.at))}</td><td>${escapeMarkup(METRICS[item.metric].label)} · ${escapeMarkup(metricValue(item))}</td><td>${escapeMarkup(item.method)} · ${escapeMarkup(item.source)} · ${escapeMarkup(item.context)} · ${escapeMarkup(item.provenance?.label ?? (item.synthetic ? 'Scenario record' : 'Device record'))}</td>${includeExportNotes ? `<td>${escapeMarkup(item.note)}</td>` : ''}</tr>`).join('') ?? ''}${exportWorkspace?.contexts.map((item) => `<tr><td>${escapeMarkup(stamp(item.at))}</td><td>${escapeMarkup(item.kind)} · ${escapeMarkup(item.value)}</td><td>Crew context</td>${includeExportNotes ? `<td>${escapeMarkup(item.note)}</td>` : ''}</tr>`).join('') ?? ''}</table>
      <h2>Environment and instrument records</h2><table><tr><th>Source timestamp</th><th>Record</th><th>Origin and provenance</th></tr>${exportWorkspace?.cabinReadings.map((item) => `<tr><td>${escapeMarkup(item.at)}</td><td>Cabin sensor · ${item.value} ${escapeMarkup(item.unit)}</td><td>${escapeMarkup(item.instrument)} · ${item.synthetic ? 'Scenario record' : 'External reference'}</td></tr>`).join('') ?? ''}${exportWorkspace?.radiationReadings.map((item) => `<tr><td>${escapeMarkup(item.at)}</td><td>${escapeMarkup(item.value.toString())} ${escapeMarkup(item.unit)}</td><td>${escapeMarkup(item.spacecraft ?? 'Mission instrument')} · ${escapeMarkup(item.instrument)} · ${escapeMarkup(item.source ?? 'Dosimeter record')} · ${item.synthetic ? 'Mission record' : `NASA RadLab Portal ${escapeMarkup(item.portalVersion ?? '')} · retrieved ${escapeMarkup(item.retrievedAt ?? '')} · not personal dose`}${item.sourceUrl ? ` · <a href="${escapeMarkup(item.sourceUrl)}">source query</a>` : ''}</td></tr>`).join('') ?? ''}</table>
      <h2>Mission timeline</h2><table><tr><th>Recorded</th><th>Event</th><th>Detail and provenance</th></tr>${exportWorkspace?.events.slice().sort((a, b) => a.at.localeCompare(b.at)).map((item) => `<tr><td>${escapeMarkup(stamp(item.at))}</td><td>${escapeMarkup(item.title)}</td><td>${escapeMarkup(item.detail)} · ${escapeMarkup(item.provenance)}</td></tr>`).join('') ?? ''}</table>
      <h2>Follow-up actions</h2><ul>${exportWorkspace?.tasks.map((item) => `<li>${escapeMarkup(item.title)} · ${escapeMarkup(item.status)} · due ${escapeMarkup(stamp(item.due))}</li>`).join('') ?? ''}</ul>
      ${includeEvidence ? `<h2>Sources</h2><ul>${EVIDENCE.filter((item) => item.appliesTo.includes(scenarioId)).map((item) => `<li><a href="${escapeMarkup(item.url)}">${escapeMarkup(item.publisher)} · ${escapeMarkup(item.title)}</a></li>`).join('')}</ul>` : ''}
      <p class="muted">${escapeMarkup(scenario.label)} · ${escapeMarkup(stamp(scenarioTime))} · private text ${includeExportNotes ? 'included by explicit one-export choice' : 'excluded by default'}.</p></main></html>`;
    const blob = new Blob([body], { type: 'text/html;charset=utf-8' });
    download(blob, `aster-${scenarioId}-handoff.html`);
    download(new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' }), `aster-${scenarioId}-handoff.json`);
    setIncludeExportNotes(false);
    setFeedback({ title: 'Handoff exports prepared', body: 'A readable HTML summary and a provenance-preserving JSON record were saved. Nothing was sent.' });
  };

  if (reactionOpen && snapshot) return <ReactionCheck scenarioId={scenarioId} previousSessions={workspace?.reactionSessions ?? []} urgentOpen={urgentOpen} onUrgent={() => setUrgentOpen(true)} onCloseUrgent={() => setUrgentOpen(false)} onClose={() => setReactionOpen(false)} onFinish={(session) => {
    commitWorkspace((current, snapshotNow) => ({ ...current, reactionSessions: [session, ...current.reactionSessions],
      events: [...current.events, createEvent(snapshotNow.activeScenario, 'reaction', snapshotNow.scenarioNow,
        'Reaction-time check complete', `${session.responsesMs.length} responses · ${session.missed} missed · ${session.premature} premature · ${session.durationMs / 1000} seconds · ${session.input} input`,
        `Aster reaction check · v1 · ${session.input} input`) ],
    }));
  }} />;

  const navigate = (destination: Page) => { setPage(destination); setReviewOpen(false); setMobileNavOpen(false); setFeedback(null); setSearch(''); };
  const openCareTask = (key: ScenarioId, taskId: string) => {
    if (key !== scenarioId) setScenario(key);
    else { setPage('investigations'); setReviewOpen(true); }
    setReviewTaskId(taskId);
  };
  const openHistoryEvent = (key: ScenarioId, event: MissionEvent) => {
    const target = viewSnapshot?.workspaces[key];
    if (!target) return;
    let record = target.observations.find((item) => event.id === `TIMELINE-${item.id}`);
    const dayPrefix = `TIMELINE-DAY-${key}-`;
    if (!record && event.id.startsWith(dayPrefix)) {
      const day = event.id.slice(dayPrefix.length);
      const dayRecords = target.observations.filter((item) => item.at.startsWith(day));
      record = dayRecords.find((item) => item.metric === selectedMetric)
        ?? dayRecords.find((item) => item.metric === 'heart') ?? dayRecords[0];
    }
    if (!record && event.kind === 'measurement') {
      const sameTime = target.observations.filter((item) => item.at === event.at);
      record = sameTime.find((item) => item.metric === selectedMetric) ?? sameTime[0];
    }
    if (key !== scenarioId) setScenario(key);
    setSelectedTimelineId(event.id);
    if (record) {
      setSelectedMetric(record.metric); setBaselineMetric(record.metric); setSelectedRecordId(record.id);
      setReviewOpen(false); setPage('measurements');
    } else { setReviewOpen(true); setPage('investigations'); }
  };
  const observePoint = (recordId: string) => {
    const found = workspace?.observations.find((item) => item.id === recordId);
    setSelectedRecordId(recordId);
    if (found) {
      setSelectedMetric(found.metric);
      setBaselineMetric(found.metric);
      const dayEvent = found.id.startsWith('FIXTURE-') ? `TIMELINE-DAY-${scenarioId}-${found.at.slice(0, 10)}` : undefined;
      const event = events.find((item) => item.kind === 'measurement' && item.at === found.at);
      setSelectedTimelineId(dayEvent ?? event?.id ?? `TIMELINE-${found.id}`);
    }
  };
  const selectMetric = (metric: Metric) => {
    setSelectedMetric(metric);
    setBaselineMetric(metric);
    const latest = workspace?.observations.filter((item) => item.metric === metric).sort((a, b) => b.at.localeCompare(a.at))[0];
    if (latest) setSelectedRecordId(latest.id);
  };
  const inspectTimelineEvent = (item: MissionEvent) => {
    setSelectedTimelineId(item.id);
    let record = workspace?.observations.find((observation) => item.id === `TIMELINE-${observation.id}`);
    if (!record && item.id.startsWith('TIMELINE-DAY-')) {
      const day = item.id.slice(-10);
      const rows = workspace?.observations.filter((observation) => observation.at.startsWith(day)) ?? [];
      record = rows.find((observation) => observation.metric === baselineMetric)
        ?? rows.find((observation) => observation.metric === 'heart') ?? rows[0];
    }
    if (record) observePoint(record.id);
  };
  const inspectNavigatorEvidence = (item: NavigatorEvidence) => {
    if (item.observationId) { observePoint(item.observationId); setPage('measurements'); }
    else if (item.eventId) { setSelectedTimelineId(item.eventId); setPage('investigations'); setReviewOpen(true); }
    else if (item.instrumentId) { setSelectedInstrumentId(item.instrumentId); setPage('investigations'); setReviewOpen(true); }
  };
  const handleMissionForm = (form: HTMLFormElement, event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (entryKind === 'measurement') saveMeasurement(form); else if (entryKind === 'check-in') saveContext(form); };

  const addReviewTask = (dueValue: string) => {
    if (!workspace) return;
    const due = new Date(`${dueValue}Z`);
    if (!Number.isFinite(due.valueOf()) || due.valueOf() <= nowMs) { setFormError('Choose a time after the current mission time.'); return; }
    const task: Followup = { id: id('TASK'), kind: 'routine', episodeId: `INV-${scenarioId}`,
      title: scenarioId === 'recovery' ? 'Recheck a comparable resting reading and review sleep' : scenarioId === 'cabin' ? 'Review the cabin sensor and symptom timeline' : 'Review dosimeter source, units, and data gaps',
      due: due.toISOString(), createdAt: scenarioTime, status: 'open', dataset: 'demo', synthetic: true };
    commitWorkspace((current, snapshotNow) => ({ ...current, tasks: [...current.tasks, task],
      investigations: current.investigations.map((item) => item.id === `INV-${scenarioId}`
        ? { ...item, status: 'awaiting-reassessment', lastUpdatedAt: snapshotNow.scenarioNow } : item),
      events: [...current.events, createEvent(snapshotNow.activeScenario, 'action', snapshotNow.scenarioNow, 'Follow-up planned', task.title, 'Crew action')],
    }));
    setScheduleOpen(false); setFormError('');
    setFeedback({ title: 'Follow-up saved', body: 'The task is linked to this investigation and remains open until its outcome is reviewed.' });
  };

  const completeFollowup = (task: Followup) => {
    if (!task.resultId || task.status === 'complete') return;
    commitWorkspace((current, snapshotNow) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id
        ? { ...item, status: 'complete', completedAt: snapshotNow.scenarioNow } : item),
      investigations: current.investigations.map((item) => item.id === `INV-${scenarioId}`
        ? { ...item, status: item.status === 'closed' ? 'closed' : 'ready-for-review', lastUpdatedAt: snapshotNow.scenarioNow } : item),
      events: [...current.events, createEvent(snapshotNow.activeScenario, 'action', snapshotNow.scenarioNow,
        'Follow-up result reviewed', 'Task completion is recorded separately from investigation closure.', 'Crew review action')],
    }));
    setReviewTaskId(null);
    setFeedback({ title: 'Follow-up task completed', body: 'The result is saved for investigation review. The concern remains open until you decide to close it.' });
  };

  const markInspection = (key: string) => {
    commitWorkspace((current, snapshotNow) => {
      const progress = current.reviewProgress ?? { version: 1 as const, skipped: [], inspections: {} };
      const checked = !progress.inspections[key];
      const label = inspectionItems(snapshotNow.activeScenario, current, snapshotNow.scenarioNow).find(item => item.id === key)?.label ?? 'Instrument check';
      return { ...current, reviewProgress: { ...progress, inspections: { ...progress.inspections, [key]: checked } },
        events: [...current.events, createEvent(snapshotNow.activeScenario, 'action', snapshotNow.scenarioNow, checked ? 'Instrument check recorded' : 'Instrument check reopened', label, 'Crew action')] };
    });
  };
  const skipOption = (option: string) => commitWorkspace(current => ({ ...current, reviewProgress: { version: 1, inspections: current.reviewProgress?.inspections ?? {}, skipped: [...new Set([...(current.reviewProgress?.skipped ?? []), option])] } }));
  const restoreOptions = () => commitWorkspace(current => ({ ...current, reviewProgress: { version: 1, inspections: current.reviewProgress?.inspections ?? {}, skipped: [] } }));

  const onAnatomyMetric = (metric: string | null) => {
    if (metric && (METRIC_ORDER as string[]).includes(metric)) {
      selectMetric(metric as Metric);
      setAnatomyOpen(false); navigate('measurements');
    }
  };
  const onAnatomyStructure = (structureId: string) => {
    const structure = anatomyManifest.find((item) => item.id === structureId);
    if (structure?.id === 'lungs') {
      setAnatomyOpen(false); setScenario('cabin');
      setFeedback({ title: 'Cabin environment investigation opened', body: 'The linked cabin sensor and symptom records are available for review. Aster does not assess lung function.' });
      return;
    }
    if (!structure?.metricKeys.length) {
      setFeedback({ title: `${structure?.label ?? 'Structure'} · not assessed`, body: 'Aster has no linked measurement for this structure. The anatomy reference shows location only.' });
    }
  };

  if (!snapshot || !workspace || !investigation || !baselineMemo || !liveClock) {
    return <main className="aster-loading"><AsterMark /><p>Opening Aster’s local mission record…</p></main>;
  }

  const missionDay = phaseDay(scenarioTime, snapshot.settings.missionStart);
  const guidance = selectGuidance(scenarioId, workspace, scenarioTime);
  const openReview = (key: ScenarioId) => { if (key !== scenarioId) setScenario(key); else { setReviewOpen(true); setPage('investigations'); } setSearch(''); };
  const doReviewAction = (action: ReviewAction) => {
    setFormError(''); setEntryTaskId(action.taskId);
    if (action.kind === 'measurement') { if (action.metric) selectMetric(action.metric); setEntryKind('measurement'); }
    else if (action.kind === 'check-in') setEntryKind('check-in');
    else if (action.kind === 'inspect') setInspectionOpen(true);
    else if (action.kind === 'reaction') setReactionOpen(true);
    else if (action.kind === 'summary') setSupportOpen(true);
    else if (action.kind === 'reopen') changeReviewStatus(false);
    else if (action.kind === 'review-result' || action.kind === 'wait') setReviewTaskId(action.taskId ?? null);
    else if (action.kind === 'schedule') { setFollowupDue(new Date(nowMs + 6*3600000).toISOString().slice(0,16)); setScheduleOpen(true); }
  };
  const baseMetrics: Metric[] = ['heart', 'sleep', 'bp', 'temperature', 'glucose', 'mood'];
  const baseReadings = baseMetrics.map((metric) => workspace.observations.filter((item) => item.metric === metric).at(-1)).filter((item): item is Observation => !!item);
  const currentReviewTasks = workspace.tasks.filter((task) => task.episodeId === investigation.id && task.status === 'open').sort((a, b) => a.due.localeCompare(b.due));
  const careRows = viewSnapshot ? SCENARIO_IDS.flatMap((key) => {
    const at = key === viewSnapshot.activeScenario ? viewSnapshot.scenarioNow : viewSnapshot.scenarioTimes[key];
    return viewSnapshot.workspaces[key].tasks.filter((task) => Date.parse(task.createdAt) <= Date.parse(at))
      .map((task) => ({ scenarioId: key, task, now: at }));
  }).sort((a, b) => Number(a.task.status === 'complete') - Number(b.task.status === 'complete') || a.task.due.localeCompare(b.task.due)) : [];
  const openReviewCount = viewSnapshot ? SCENARIO_IDS.filter((key) => viewSnapshot.workspaces[key].investigations.some((item) => item.scenarioId === key && item.status !== 'closed')).length : 0;

  const viewedTask = workspace.tasks.find(t=>t.id===reviewTaskId);
  const taskObservation = workspace.observations.find(o=>o.id===viewedTask?.resultId);
  const taskContext = workspace.contexts.find(c=>c.id===viewedTask?.resultId);
  const taskInstrument = [...workspace.cabinReadings,...workspace.radiationReadings].find(r=>r.id===viewedTask?.resultId);
  const taskResult = taskObservation ? metricValue(taskObservation) : taskContext?.value ?? (taskInstrument ? `${taskInstrument.value} ${taskInstrument.unit}` : null);
  const earlierReading = taskObservation ? [...workspace.observations].filter(o=>o.metric===taskObservation.metric && o.at<taskObservation.at).sort((a,b)=>b.at.localeCompare(a.at))[0] : undefined;
  const liveCapture = (<section className="workspace-section live-wearable-section"><SectionHeading title="Live heart-rate monitor" detail="Optional · live readings stay in a separate record set" aside={liveMonitor?.latest ? <Pill kind={liveMonitor.status === 'connected' ? 'neutral' : 'attention'}>{liveMonitor.status === 'connected' && Date.now() - liveMonitor.latest.receivedAt < 10_000 ? 'Live signal' : 'Signal paused'}</Pill> : null}/>
            {liveMonitor.status === 'unsupported' || liveMonitor.status === 'disconnected' ? <div className="live-connect-row"><span><Radio size={17}/>{liveMonitor.error || 'Connect a Bluetooth heart-rate monitor in a browser that supports Web Bluetooth.'}</span><button type="button" className="secondary-button" disabled={liveMonitor.status === 'unsupported'} onClick={() => { void liveMonitor.connect(); }}><Signal size={15}/> {liveMonitor.status === 'unsupported' ? 'Unavailable' : 'Connect monitor'}</button></div>
              : <div className="live-connect-row"><span><HeartPulse size={17}/>{liveMonitor.deviceName || 'Heart-rate monitor'}{liveMonitor.latest ? ` · ${liveMonitor.latest.bpm} bpm · ${new Date(liveMonitor.latest.receivedAt).toLocaleTimeString()}` : ` · ${liveMonitor.status === 'connecting' ? 'Connecting' : liveMonitor.status === 'stale' ? 'Signal paused' : 'Waiting for signal'}`}{liveMonitor.latest?.sensorContact === 'not-detected' ? ' · Sensor contact not detected' : ''}</span>
                <div className="next-action-buttons">{liveMonitor.latest && <button type="button" className="secondary-button" onClick={() => {
                  const entry: Observation = { id: id('LIVE-HR'), metric: 'heart', value: liveMonitor.latest!.bpm, unit: 'bpm', at: new Date(liveMonitor.latest!.receivedAt).toISOString(), method: liveMonitor.deviceName ?? 'Bluetooth heart-rate monitor', context: 'Conditions not verified', note: '', source: 'Live Bluetooth reading', synthetic: false, dataset: 'personal', quality: 'verify', guidanceVersion: 'Aster Bluetooth adapter v1', provenance: { kind: 'device', label: 'Live Bluetooth measurement' } };
                  commitSnapshot((current) => ({ ...current, liveObservations: [entry, ...current.liveObservations] })); setFeedback({ title: 'Live reading kept separately', body: 'Saved to live records. Investigation history is unchanged.' });
                }}><Save size={14}/> Save reading</button>}
                <button type="button" className="text-button" onClick={() => { void liveMonitor.disconnect(); }}>Disconnect</button></div></div>}
          </section>);
  return <div className="aster-shell">
    <MissionNavigation activePage={activePage} mobileOpen={mobileNavOpen} onNavigate={navigate} onClose={() => setMobileNavOpen(false)} onOpenPresenter={() => {
      setShowPresenter(true);
      commitSnapshot((current) => ({ ...current, settings: { ...current.settings, presenterOpen: true } }));
    }}/>

    {urgentOpen && <UrgentGuidance onClose={() => setUrgentOpen(false)} />}

    <div className="aster-main">
      <header className="aster-topbar">
        <div className="aster-topbar-left"><button type="button" className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={19}/></button>
          <div className="mission-day"><span>MISSION DAY</span><strong>{String(missionDay).padStart(3, '0')}</strong><i aria-hidden="true"/></div>
          <time className="topbar-time" dateTime={scenarioTime}>{stamp(scenarioTime)}</time></div>
        <div className="aster-topbar-right"><div className={`storage-state ${storageMode === 'error' ? 'storage-error' : ''}`} role="status"><Save size={13}/>{saving ? 'Saving' : storageMode === 'desktop' ? 'On-device vault' : storageMode === 'error' ? 'Storage error' : storageMode === 'browser-fallback' ? 'Local fallback' : 'Saved locally'}</div>
          <button type="button" className="topbar-quiet urgent-entry" onClick={() => setUrgentOpen(true)} aria-label="Open urgent symptom guidance"><AlertTriangle size={15}/><span>Urgent concern</span></button>
          <button type="button" className="primary-button topbar-add" onClick={() => { setEntryChoiceOpen(true); setEntryTaskId(undefined); setFormError(''); }}><span>+ Add entry</span></button></div>
      </header>

      <main className="aster-content" key={activePage}>
        {feedback && <div className="aster-feedback" role="status"><Check size={17}/><div><strong>{feedback.title}</strong><span>{feedback.body}</span></div><button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}><X size={16}/></button></div>}

        {activePage === 'log' && <>
          <header className="page-title-row"><div><h1>Home</h1><p>Readings, reviews, and recent mission activity.</p></div><span className="scenario-stamp"><i aria-hidden="true"/>{scenario.label}</span></header>
          <section className="home-focus">
            <GradientIcon name={scenarioId} size={46} glass/>
            <div className="home-focus-copy"><div className="home-focus-meta"><Pill kind="neutral">{statusText[investigation.status]}</Pill><span>Current health review</span></div>
              <h2>{guidance.title}</h2><p>{guidance.summary}</p><span className="home-focus-next">Next step · {guidance.next.reason}</span></div>
            <div className="home-focus-actions"><button className="primary-button" onClick={()=>openReview(scenarioId)}>Continue review <ArrowRight size={15}/></button>
              <button className="text-button" onClick={()=>navigate('investigations')}>All reviews <span className="home-count">{openReviewCount}</span></button></div>
          </section>

          <section className="workspace-section home-readings-section">
            <SectionHeading title="Latest readings" detail="Select a reading to inspect its trend and collection details."
              aside={<button className="quiet-link" onClick={()=>navigate('measurements')}>All readings <ArrowRight size={14}/></button>}/>
            <div className="home-reading-grid">{baseMetrics.map((metric)=>{
              const reading=baseReadings.find(item=>item.metric===metric);
              const status=reading?.quality==='verify'?'Needs verification':reading?freshnessLabel(reading,scenarioTime):'No reading recorded';
              return <button key={metric} type="button" className={`home-reading-card ${selectedMetric===metric?'home-reading-selected':''}`} aria-pressed={selectedMetric===metric} style={selectionGradientStyle(metric)} onClick={()=>selectMetric(metric)}>
                <span className="home-reading-label"><GradientIcon name={metric} size={23}/>{METRICS[metric].short}</span>
                <strong className="instrument-value">{reading?metricValue(reading):'—'}</strong>
                <span className={`home-reading-status ${reading?.quality==='verify'?'attention':''}`}>{status}</span>
              </button>;
            })}</div>
          </section>

          <div className="home-dashboard-grid">
            <div className="home-main-column">
              <section className="workspace-section home-trend-section">
                <SectionHeading title={`${METRICS[selectedMetric].short} over time`} detail="Recent observations compared with your earlier pattern."/>
                {selectedMetric==='mood'
                  ? <p className="plain-note">Mood is a self-reported check-in, not an instrument reading. The selected entry and its context are available below.</p>
                  : <><p className="home-trend-summary">{activeComparison?changeCopy(selectedMetric,activeComparison):'No comparable history is available yet.'} This is a historical comparison, not a clinical range.</p>
                    {activeComparison&&<TrendChart comparison={activeComparison} points={recentPoints.map(item=>({id:item.id,at:item.at,value:Number(item.value),unit:item.unit}))} selectedId={selectedRecordId} onSelect={observePoint}/>}</>}
                {savedReading&&<details className="review-disclosure home-reading-details"><summary>Selected reading details<span>Method, source, time, and collection conditions</span></summary><ObservationDetails observation={savedReading}/></details>}
              </section>

              <section className="workspace-section home-activity-section" style={selectionGradientStyle('history')}>
                <SectionHeading title="Recent mission activity" detail="Saved readings, check-ins, and crew actions"
                  aside={<button className="quiet-link" onClick={()=>navigate('history')}>Full history <ArrowRight size={14}/></button>}/>
                {events.slice(0,6).map(item=><button key={item.id} type="button" className={`home-event ${selectedTimelineId===item.id?'home-event-selected':''}`} onClick={()=>inspectTimelineEvent(item)}>
                  <span><strong>{item.title}</strong><span>{item.detail}</span>{selectedTimelineId===item.id&&<small>Where this came from · {item.provenance}</small>}</span><time>{stamp(item.at)}</time><ArrowRight size={15}/>
                </button>)}
                {!events.length&&<p className="empty-message">No mission activity has been recorded for this review.</p>}
              </section>
            </div>

            <aside className="home-side-column">
              <section className="workspace-section anatomy-section home-anatomy-section">
                <SectionHeading title="Body reference" detail="Interactive anatomy · unmeasured systems remain unassessed"
                  aside={<button className="quiet-link" onClick={()=>setAnatomyOpen(true)}>Open explorer <ArrowRight size={14}/></button>}/>
                <div className="body-viewer-wrap home-body-viewer" style={selectionGradientStyle(selectedMetric)}><Suspense fallback={<p className="empty-message">Loading the body reference…</p>}>
                  <AnatomyViewer selectedMetric={selectedMetric} selectedStructure={bodyTargetForMetric(selectedMetric)??''} focusRequestKey={0}
                    reducedMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches} onMetric={onAnatomyMetric} onStructure={onAnatomyStructure} compact/>
                </Suspense></div>
                <p className="plain-note home-anatomy-note">The model shows location only. Its colors do not indicate health status.</p>
              </section>

              <section className="workspace-section home-followups-section">
                <SectionHeading title="Follow-ups" detail="Tasks saved for the current review"
                  aside={<button className="quiet-link" onClick={()=>navigate('care')}>Care plan <ArrowRight size={14}/></button>}/>
                {currentReviewTasks.slice(0,3).map(task=><button key={task.id} type="button" className="home-event" onClick={()=>openCareTask(scenarioId,task.id)}>
                  <span><strong>{followupStatus(task,scenarioTime)}</strong><span>{task.title}</span></span><span className="home-followup-time"><CalendarClock size={13}/>{reviewDate(task.due)}</span><ArrowRight size={15}/>
                </button>)}
                {!currentReviewTasks.length&&<p className="empty-message">No follow-up is scheduled for this review.</p>}
              </section>
            </aside>
          </div>
        </>}

        {activePage === 'measurements' && <>
          <header className="page-title-row"><h1>My readings</h1></header>
          <section className="workspace-section measurement-index"><div className="metric-index-tabs" role="tablist" aria-label="Health indicator">{baseMetrics.map((metric) => <button role="tab" type="button" aria-selected={selectedMetric === metric} key={metric} style={selectionGradientStyle(metric)} onClick={() => selectMetric(metric)}><GradientIcon name={metric}/>{METRICS[metric].short}</button>)}</div>
            <div className="selected-measurement"><div className="measurement-main"><div className="metric-overview"><div><span className="measurement-unit-label">{METRICS[selectedMetric].label}</span><h2>{savedReading ? metricValue(savedReading) : 'No record available'}</h2><p>{savedReading ? stamp(savedReading.at) : 'Record a value to begin a comparison.'}</p></div><Pill kind={savedReading?.quality === 'verify' || (!!savedReading && freshnessLabel(savedReading, scenarioTime) !== 'Recent reading') ? 'attention' : 'quiet'}>{savedReading?.quality === 'verify' ? 'Needs verification' : savedReading ? freshnessLabel(savedReading, scenarioTime) : 'No measurement'}</Pill></div>
              {selectedMetric !== 'mood' && activeComparison && <details className="review-disclosure"><summary>View trend<span>Compare recorded values over time</span></summary><TrendChart comparison={activeComparison} points={recentPoints.map((item) => ({ id: item.id, at: item.at, value: Number(item.value), unit: item.unit }))} selectedId={selectedRecordId} onSelect={observePoint}/></details>}
              {selectedMetric === 'bp' && <p className="measurement-chart-note">Chart shows systolic pressure; both values remain in each record.</p>}
              {savedReading && <ObservationDetails observation={savedReading}/>}
              {bodyTargetForMetric(selectedMetric)&&<button className="quiet-link" onClick={()=>setAnatomyOpen(true)}>Explore body</button>}
              <details className="review-disclosure comparison-panel"><summary>Compare with your usual readings<span>Previous range and matching days</span></summary><p>{changeCopy(selectedMetric, baselineMemo[selectedMetric])}</p>{baselineMemo[selectedMetric].median !== null && <div className="comparison-facts"><span><small>Usual middle value</small><strong>{baselineMemo[selectedMetric].median} {baselineMemo[selectedMetric].unit}</strong></span><span><small>Previous range</small><strong>{baselineMemo[selectedMetric].low ?? '—'}–{baselineMemo[selectedMetric].high ?? '—'} {baselineMemo[selectedMetric].unit}</strong></span><span><small>Days with matching readings</small><strong>{baselineMemo[selectedMetric].count}/14</strong></span></div>}</details>
              <details className="record-details collection-guide"><summary>Collection guide</summary><p>{METRICS[selectedMetric].meaning} {METRICS[selectedMetric].why}</p><ol className="guide-steps"><li>{METRICS[selectedMetric].how}</li><li>Record the actual method and conditions used. Mismatches do not count as comparable history.</li><li>{METRICS[selectedMetric].cannot}</li></ol>
              <button type="button" className="quiet-link" onClick={() => navigate('reference')}>Open supporting sources <ArrowRight size={14}/></button></details>
            </div><aside className="recent-readings"><SectionHeading title="Recent records"/>{workspace.observations.filter((item) => item.metric === selectedMetric).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 18).map((item) => <button key={item.id} type="button" onClick={() => observePoint(item.id)} aria-pressed={selectedRecordId === item.id} style={selectionGradientStyle(selectedMetric)}><span><strong>{metricValue(item)}</strong><small>{item.context} · {item.method}</small></span><time>{stamp(item.at)}</time>{item.quality === 'verify' && <Pill kind="attention">Needs verification</Pill>}</button>)}
              {workspace.observations.filter((item) => item.metric === selectedMetric).length === 0 && <p className="empty-message">No measurements recorded for this indicator.</p>}</aside></div></section>
          {snapshot.liveObservations.length > 0 && <section className="workspace-section live-records-list"><SectionHeading title="Saved live records" detail="Separately stored · conditions need review"/>{snapshot.liveObservations.map((item) => <div key={item.id}><strong>{metricValue(item)}</strong><span>{stamp(item.at)} · {item.method} · {item.quality === 'verify' ? 'Needs verification' : 'Recorded'}</span></div>)}</section>}
        </>}

        {activePage === 'care' && <>
          <header className="page-title-row"><div><h1>Care plan</h1><p>Follow-up tasks from all health reviews.</p></div><button className="secondary-button" onClick={()=>navigate('investigations')}>Open health reviews <ArrowRight size={15}/></button></header>
          <section className="workspace-section care-plan-section"><SectionHeading title="Open follow-ups" detail="Record a result when it is due, then review it with its original concern."/>
            {careRows.filter(({task})=>task.status==='open').map(({scenarioId:key,task,now})=><button key={`${key}-${task.id}`} type="button" className="care-plan-row" onClick={()=>openCareTask(key,task.id)}>
              <GradientIcon name={key} size={24}/><span><strong>{task.title}</strong><small>{SCENARIOS[key].label} · {followupStatus(task,now)}</small></span>
              <span className="care-plan-due"><CalendarClock size={14}/>{reviewDate(task.due)}</span><ArrowRight size={16}/>
            </button>)}
            {!careRows.some(({task})=>task.status==='open')&&<p className="empty-message">No open follow-ups. A health review can suggest one when a later check would help.</p>}
          </section>
          <section className="workspace-section care-plan-section"><SectionHeading title="Completed follow-ups" detail="A reviewed result is recorded separately from closing its health review."/>
            {careRows.filter(({task})=>task.status==='complete').map(({scenarioId:key,task,now})=><button key={`${key}-${task.id}`} type="button" className="care-plan-row completed" onClick={()=>openCareTask(key,task.id)}>
              <GradientIcon name={key} size={24}/><span><strong>{task.title}</strong><small>{SCENARIOS[key].label} · {followupStatus(task,now)}</small></span>
              <span className="care-plan-due"><CalendarClock size={14}/>{reviewDate(task.completedAt??task.due)}</span><ArrowRight size={16}/>
            </button>)}
            {!careRows.some(({task})=>task.status==='complete')&&<p className="empty-message">Reviewed follow-ups will appear here.</p>}
          </section>
        </>}

        {activePage === 'history' && <>
          <header className="page-title-row"><div><h1>Mission history</h1><p>Readings, check-ins, and actions across health reviews.</p></div></header>
          <section className="workspace-section history-section" style={selectionGradientStyle('history')}><SectionHeading title={`${historyRows.length} recorded events`} detail="Select an entry to inspect where it came from and open its linked record or review."/>
            {historyRows.map(({scenarioId:key,event})=><details className="history-row" key={`${key}-${event.id}`}>
              <summary><time>{stamp(event.at)}</time><span><strong>{event.title}</strong><small>{event.detail}</small></span><span className="history-scenario">{SCENARIOS[key].label}</span></summary>
              <div className="history-row-details"><p>{event.detail}</p><small>Where this came from · {event.provenance}</small>
                <button className="quiet-link" onClick={()=>openHistoryEvent(key,event)}>Open linked record or review <ArrowRight size={14}/></button>
              </div>
            </details>)}
            {!historyRows.length&&<p className="empty-message">Mission events will appear here after a reading, check-in, or review action is saved.</p>}
          </section>
        </>}

        {activePage === 'investigations' && (!reviewOpen ? <ReviewOverview snapshot={viewSnapshot!} home={false} onOpen={openReview}/> :
          <GuidedReview scenario={scenarioId} workspace={workspace} now={scenarioTime} guidance={guidance} onAction={doReviewAction} onBack={()=>setReviewOpen(false)} onSkip={skipOption} onRestore={restoreOptions} onInspect={markInspection} inspectionOpen={inspectionOpen} onInspectionOpen={setInspectionOpen} onClose={()=>changeReviewStatus(true)} onReopen={()=>changeReviewStatus(false)}
            followups={workspace.tasks.filter(t=>t.episodeId===investigation.id).length>0 && <section className="review-followups"><h2>Follow-ups</h2>{workspace.tasks.filter(t=>t.episodeId===investigation.id).map(task=><button key={task.id} className="followup-link" onClick={()=>setReviewTaskId(task.id)}><strong>{task.status==='complete'?'Reviewed':task.resultId?'Result ready':Date.parse(task.due)<=nowMs?'Due now':'Planned'}</strong><span>{reviewDate(task.due)}</span><ArrowRight size={14}/></button>)}</section>}>
            {scenarioId==='recovery' && <div className="review-readings">{(['heart','sleep'] as Metric[]).map(metric=>{const reading=baseReadings.find(r=>r.metric===metric);return <div key={metric}><GradientIcon name={metric}/><span>{METRICS[metric].short}</span><strong className="instrument-value">{reading?metricValue(reading):'No reading'}</strong><small>{reading ? reading.quality==='verify'?'Needs verification':freshnessLabel(reading,scenarioTime):'Add a reading to begin'}</small></div>;})}</div>}
            <details className="review-disclosure"><summary>{scenarioId==='recovery'?'Trends and readings':'Instrument readings'}<span>{scenarioId==='recovery'?'Compare recent readings with your usual pattern':'Inspect timestamps, units, and source records'}</span></summary>
              {scenarioId==='recovery'?<><div className="metric-toggle" style={selectionGradientStyle(selectedMetric)}><button aria-pressed={selectedMetric==='heart'} style={selectionGradientStyle('heart')} onClick={()=>selectMetric('heart')}>Pulse</button><button aria-pressed={selectedMetric==='sleep'} style={selectionGradientStyle('sleep')} onClick={()=>selectMetric('sleep')}>Sleep</button></div>{activeComparison&&<TrendChart comparison={activeComparison} points={recentPoints.map(item=>({id:item.id,at:item.at,value:Number(item.value),unit:item.unit}))} selectedId={selectedRecordId} onSelect={observePoint}/>}<p className="plain-note">Your usual pattern is a historical comparison, not a clinical reference range.</p>{savedReading&&<ObservationDetails observation={savedReading}/>}<button className="quiet-link" onClick={()=>setAnatomyOpen(true)}>Explore body</button></>
                :scenarioId==='cabin'?<CabinPanel readings={workspace.cabinReadings} now={scenarioTime}/>:<RadiationPanel readings={workspace.radiationReadings} now={scenarioTime} selectedId={selectedInstrumentId} onSelect={setSelectedInstrumentId}/>}
            </details>
            <details className="review-disclosure"><summary>Review history<span>Readings, saved actions, and follow-ups</span></summary><div className="mission-timeline">{events.filter(item=>item.scenarioId===scenarioId).map(item=><button key={item.id} className={`timeline-event ${selectedTimelineId===item.id?'timeline-event-selected':''}`} onClick={()=>inspectTimelineEvent(item)}><span className="timeline-entry"><strong>{item.title}</strong><span>{item.detail}</span>{selectedTimelineId===item.id&&<small>{item.provenance}</small>}</span><time>{stamp(item.at)}</time></button>)}</div></details>
            <details className="review-disclosure"><summary>Why this suggestion?<span>Supporting observations and source notes</span></summary><EvidenceRows items={navigatorEvidence} onSelect={inspectNavigatorEvidence}/><p className="plain-note">{scenario.lead}</p><button className="quiet-link" onClick={()=>navigate('reference')}>Read source notes <ArrowUpRight size={14}/></button><details className="record-details"><summary>Comparison method and rule version</summary><p>{assessment.ruleVersion}</p>{assessment.findings.map(f=><p key={f.id}>{f.summary}</p>)}{scenarioId==='recovery'&&<p>Uses at least 7 matching daily readings from the 14 days before the current 3-day window. Units, method, conditions, and mission phase must match.</p>}{Object.keys(workspace.checklist).length>0&&<details><summary>Earlier checklist records</summary>{Object.entries(workspace.checklist).map(([label,done])=><p key={label}>{done?'Recorded':'Not marked'} · {label}</p>)}</details>}</details></details>
          </GuidedReview>)}

        {activePage === 'reference' && <>
          <header className="page-title-row"><div><h1>Help &amp; sources</h1></div></header>

          <button className="secondary-button explore-body" onClick={()=>setAnatomyOpen(true)}>Explore body</button><div className="reference-content-grid">            <section className="workspace-section source-catalog"><SectionHeading title="Source library" detail={`${EVIDENCE.filter((item) => item.appliesTo.includes(scenarioId)).length} sources related to ${scenario.label.toLowerCase()}`}/>
              <label className="source-search"><CircleHelp size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sources and topics" aria-label="Search the source library"/></label>
              <div className="source-list">{EVIDENCE.filter((item) => item.appliesTo.includes(scenarioId) && (!search || `${item.title} ${item.publisher} ${item.summary}`.toLowerCase().includes(search.toLowerCase()))).map((item) => <details key={item.id} className="source-disclosure"><summary><span className="source-publisher">{item.publisher}</span><span>{item.title}</span></summary><p>{item.summary}</p><a href={item.url} target="_blank" rel="noreferrer">Open source page <ArrowUpRight size={13}/></a></details>)}
                {EVIDENCE.filter((item) => item.appliesTo.includes(scenarioId) && (!search || `${item.title} ${item.publisher} ${item.summary}`.toLowerCase().includes(search.toLowerCase()))).length === 0 && <p className="empty-message">No sources match “{search}”.</p>}</div>
              <p className="source-scope-note plain-note">Aster is an independent demonstration. These references provide research context; they do not endorse Aster or validate its demonstration rules.</p>
            </section></div>
          <section className="workspace-section domain-limits"><SectionHeading title="What Aster can and cannot assess" detail="Hazards can interact; each finding still needs its own evidence"/><div className="hazard-grid">{[
            ['Radiation', 'No personal dosimeter record is connected. Each instrument reading retains its own source, timestamp, and unit.'],
            ['Isolation and confinement', 'Optional sleep, mood, and workload check-ins describe self-report. They are not a behavioral-health assessment.'],
            ['Distance from Earth', 'Aster can create a local handoff draft. It cannot contact ground support or promise a reply.'],
            ['Gravity fields', 'Heart-rate observations do not measure bone or muscle change. Anatomy describes location only.'],
            ['Hostile or closed environments', 'No live environmental or immune sensors are connected.'],
            ['Coverage', 'Aster’s six readings cover only a small part of the health risks studied in spaceflight. Unmeasured areas remain unassessed, not normal.'],
          ].map(([title, description]) => <article key={title}><span>{title}</span><p>{description}</p></article>)}</div></section>
        </>}

        {activePage === 'medical' && <>
          <header className="page-title-row"><div><h1>Medical support</h1><p>Urgent guidance and an editable summary for the current review.</p></div></header>
          <section className="medical-support-grid">
            <article className="medical-support-block"><GradientIcon name="medical" size={46} glass/><div><span className="support-eyebrow">Always available</span><h2>Urgent health concern</h2>
              <p>Follow the mission-approved medical plan and notify a crewmate or medical support now. Do not wait for Aster or a sensor result.</p>
              <button className="primary-button" onClick={()=>setUrgentOpen(true)}>Open urgent guidance <ArrowRight size={15}/></button></div></article>
            <article className="medical-support-block"><GradientIcon name="investigations" size={46} glass/><div><span className="support-eyebrow">Current review · {scenario.label}</span><h2>Prepare a review summary</h2>
              <p>Aster can save an editable summary on this device. It does not contact a clinician or promise a response time.</p>
              <button className="secondary-button" onClick={()=>setSupportOpen(true)}>Prepare summary <ArrowRight size={15}/></button></div></article>
          </section>
        </>}

        {activePage === 'settings' && <>
          <header className="page-title-row"><div><h1>Settings</h1></div></header>
          <div className="settings-grid"><section className="workspace-section"><SectionHeading title="Mission context" detail="Applies to mission-day calculation and new records"/><label className="settings-field">Mission start date<input type="date" value={snapshot.settings.missionStart} onChange={(event) => commitSnapshot((current) => ({ ...current, settings: { ...current.settings, missionStart: event.target.value } }))}/></label>
              <label className="settings-field">Mission phase<input value={snapshot.settings.phase} onChange={(event) => commitSnapshot((current) => ({ ...current, settings: { ...current.settings, phase: event.target.value } }))} maxLength={40}/></label>

            </section><section className="workspace-section"><SectionHeading title="Data and privacy" detail="Aster runs with local records; no account or cloud service is configured"/><div className="settings-status"><span>Current storage</span><strong>{storageMode === 'desktop' ? 'SQLite on this device' : storageMode === 'error' ? 'Unable to confirm storage' : 'IndexedDB on this device'}</strong><p>{storageMode === 'browser-fallback' ? 'IndexedDB was unavailable; the browser fallback is active.' : 'Observation history, workspaces, and notes are stored locally.'}</p></div>
              <label className="export-option export-next-option"><input type="checkbox" checked={includeExportNotes} onChange={(event) => setIncludeExportNotes(event.target.checked)}/><span>Include private text in the next export</span><small>Off by default · this choice resets after export.</small></label>
              <button type="button" className="secondary-button" onClick={exportMission}><ArrowDownToLine size={15}/> Export current investigation</button>
            </section><section className="workspace-section"><SectionHeading title="About Aster"/><p>Aster brings together crew measurements, mission context, and follow-up for a clearer review.</p></section></div>
        </>}
      </main>
    </div>

    {entryChoiceOpen&&<AsterDialog title="Add entry" onClose={()=>setEntryChoiceOpen(false)}><p className="plain-note">Add to {REVIEW_NAMES[scenarioId]}. You can open another health review first to add an entry there.</p><div className="entry-choices"><button onClick={()=>{setEntryChoiceOpen(false);setEntryKind('measurement');}}><GradientIcon name="measurements"/><span><strong>Add a reading</strong><small>Pulse, sleep, blood pressure, temperature, glucose, or mood</small></span><ArrowRight size={16}/></button><button onClick={()=>{setEntryChoiceOpen(false);setEntryKind('check-in');}}><GradientIcon name="mood"/><span><strong>Describe how you feel</strong><small>Symptoms, fatigue, workload, or another observation</small></span><ArrowRight size={16}/></button></div></AsterDialog>}
    {anatomyOpen&&<AsterDialog title="Explore body" onClose={()=>setAnatomyOpen(false)}><p className="plain-note">Select a structure to find related readings. This model shows location, not health status.</p><div className="body-explorer" style={selectionGradientStyle(selectedMetric)}><Suspense fallback={<p>Loading body reference…</p>}><AnatomyViewer selectedMetric={selectedMetric} selectedStructure={bodyTargetForMetric(selectedMetric)??''} focusRequestKey={0} reducedMotion={window.matchMedia('(prefers-reduced-motion: reduce)').matches} onMetric={onAnatomyMetric} onStructure={onAnatomyStructure} compact={false}/></Suspense></div>{feedback&&<p role="status">{feedback.body}</p>}</AsterDialog>}
    {scheduleOpen&&<AsterDialog title="Plan a follow-up" onClose={()=>setScheduleOpen(false)}><form className="entry-form" onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get('due');addReviewTask(typeof value==='string'?value:'');}}><p>Choose when to check {REVIEW_NAMES[scenarioId].toLowerCase()} again.</p><label className="settings-field">Follow-up time (mission UTC)<input name="due" type="datetime-local" required value={followupDue} onChange={e=>setFollowupDue(e.target.value)} min={new Date(nowMs+60000).toISOString().slice(0,16)}/></label><p className="plain-note">Current mission time: {stamp(scenarioTime)}. This saves a reminder; it does not add new readings.</p>{formError&&<p role="alert">{formError}</p>}<button className="primary-button" type="submit">Save follow-up</button></form></AsterDialog>}
    {viewedTask&&<AsterDialog title="Follow-up" onClose={()=>setReviewTaskId(null)}><h3>{viewedTask.title}</h3><p>Planned for {reviewDate(viewedTask.due)}</p>{taskResult?<><section className="result-comparison"><div><span>Recorded result</span><strong>{taskResult}</strong></div>{earlierReading&&<div><span>Previous reading · {stamp(earlierReading.at)}</span><strong>{metricValue(earlierReading)}</strong></div>}</section><p className="plain-note">Review the result alongside its collection conditions. Recording or reviewing a result does not close the health review.</p>{taskObservation&&<ObservationDetails observation={taskObservation}/>}<button className="primary-button" disabled={viewedTask.status==='complete'} onClick={()=>completeFollowup(viewedTask)}>{viewedTask.status==='complete'?'Result reviewed':'Mark result reviewed'}</button></>:<><p>No follow-up result has been recorded yet.</p><button className="primary-button" onClick={()=>{setEntryTaskId(viewedTask.id);if(scenarioId==='recovery')selectMetric('heart');setReviewTaskId(null);setEntryKind(scenarioId==='recovery'?'measurement':'check-in');}}>Record follow-up</button></>}</AsterDialog>}

    {showPresenter && <PresenterDrawer scenarioId={scenarioId} workspace={workspace} runningClock={runningClock}
      linkDelayMinutes={snapshot.settings.linkDelayMinutes} onLinkDelay={(minutes)=>commitSnapshot(current=>({...current,settings:{...current.settings,linkDelayMinutes:minutes}}))} onClose={() => {
        setShowPresenter(false);
        commitSnapshot((current) => ({ ...current, settings: { ...current.settings, presenterOpen: false } }));
      }} onToggleClock={() => {
        const next = !runningClock;
        setRunningClock(next);
        if (!next) commitSnapshot((current) => evolveScenarioClock(current, playbackRef.current));
      }} onAdvanceClock={advanceClock} onScenario={setScenario} onBranch={presenterBranch} onReset={resetScenario}
      onSimulateDelivery={simulateDelivery} onMarkReviewed={(handoffId) => commitWorkspace((current, snapshotNow) => ({
        ...current, handoffs: current.handoffs.map((item) => item.id === handoffId ? { ...item, status: 'reviewed' } : item),
        events: [...current.events, createEvent(snapshotNow.activeScenario, 'handoff', snapshotNow.scenarioNow,
          'Review marked', 'Ground review state selected by presenter.', 'Presenter-controlled handoff state')],
      }))} />}

    {supportOpen && <AsterDialog title="Prepare review summary" onClose={()=>setSupportOpen(false)}>
      <div className="handoff-notice"><Info size={16}/> Saved locally; no message is sent.</div>
      <label className="settings-field">Investigation summary<textarea rows={4} value={handoffDraft} onChange={(event) => setHandoffDraft(event.target.value)} placeholder={`${scenario.title}. ${scenario.lead}`}/></label>
      <label className="settings-field">Optional private note<textarea rows={2} value={newNote} onChange={(event) => setNewNote(event.target.value)} placeholder="Add a private note (optional)"/></label>
      <label className="export-option"><input type="checkbox" checked={includeNotes} onChange={(event) => setIncludeNotes(event.target.checked)}/><span>Include private notes and check-ins</span><small>Off by default; selected text stays in this local handoff.</small></label>
      <label className="export-option"><input type="checkbox" checked={includeEvidence} onChange={(event) => setIncludeEvidence(event.target.checked)}/><span>Include cited NASA background sources</span><small>Sources provide context for this investigation.</small></label>
      <div className="handoff-preview"><strong>Included preview</strong><span>{workspace.observations.length} observations · {workspace.contexts.length} context entries · {workspace.events.length} mission events · {includeEvidence ? EVIDENCE.filter((item) => item.appliesTo.includes(scenarioId)).length : 0} sources</span><small>{includeNotes ? 'Private notes and self-reports selected for this local handoff.' : 'Private notes and self-reports omitted by default.'}</small><small>Timeline range · {stamp(workspace.observations[0]?.at ?? scenarioTime)} to {stamp(scenarioTime)}</small></div>
      <footer><button type="button" className="text-button" onClick={() => setSupportOpen(false)}>Cancel</button><button type="button" className="secondary-button" onClick={saveCrewNote} disabled={!newNote.trim()}>Save private note</button><button type="button" className="primary-button" onClick={() => { queueHandoff(); setSupportOpen(false); }}><Save size={14}/> Save draft locally</button></footer>
    </AsterDialog>}

    {entryKind && <AsterDialog title={entryKind==='measurement'?'Add a reading':'Describe how you feel'} onClose={()=>setEntryKind(null)}><p className="plain-note">For {REVIEW_NAMES[scenarioId]} · {stamp(scenarioTime)}</p>
      <form className="entry-form" onSubmit={(event) => handleMissionForm(event.currentTarget, event)}>
        {entryKind === 'measurement' ? <>
          <p className="entry-guidance">{METRICS[selectedMetric].how}</p>
          <label className="settings-field">Health indicator<select name="metric" value={selectedMetric} onChange={(event) => selectMetric(event.target.value as Metric)}>{METRIC_ORDER.map((metric) => <option value={metric} key={metric}>{METRICS[metric].label}</option>)}</select></label>
          {selectedMetric === 'bp' ? <div className="input-pair"><label className="settings-field">Systolic · mmHg<input name="value" type="number" min="1" max="350" required/></label><label className="settings-field">Diastolic · mmHg<input name="secondary" type="number" min="1" max="250" required/></label></div>
            : selectedMetric === 'mood' ? <label className="settings-field">Self-description<select name="value" defaultValue="" required><option value="" disabled>Select how you feel</option>{['Very low', 'Low', 'Okay', 'Good', 'Very good'].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
              : <label className="settings-field">{METRICS[selectedMetric].short} · {METRICS[selectedMetric].unit}<input name="value" type="number" step="any" min="0" required placeholder="Enter a measured value" autoFocus/></label>}
          <label className="settings-field">How was it measured?<input name="method" required placeholder="For example, your device or measurement method"/><small>Use the actual method; matching methods help compare readings fairly.</small></label>
          <label className="settings-field">When and under what conditions?<select name="context" defaultValue="" required><option value="" disabled>Choose the conditions used</option>{METRICS[selectedMetric].contextOptions.filter((item) => item !== 'Not recorded').map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
          <label className="settings-field">Optional note<textarea name="note" rows={2} placeholder="Add a detail that may help later review"/></label>
        </> : <>
          <label className="settings-field">What would you like to record?<select name="kind" defaultValue={scenarioId==='cabin'?'symptom':'check-in'}>{['check-in', 'symptom', 'workload', 'sleep quality', 'meal / hydration', 'exercise'].map((kind) => <option value={kind} key={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}</select></label>
          <label className="settings-field">What would you like to record?<textarea name="value" required rows={4} value={checkInText} onChange={(event) => setCheckInText(event.target.value)} placeholder="Use your own words. You may skip a sensitive check-in." autoFocus/></label>
          <label className="settings-field">Optional note<textarea name="note" rows={2} placeholder="Optional context"/></label>
          <p className="input-footnote">You can describe symptoms, fatigue, sleep quality, or anything else you noticed. Private by default; excluded from sharing unless you opt in.</p>
        </>}
        {entryKind==='measurement'&&selectedMetric==='heart'&&<details open={deviceCaptureOpen} onToggle={e=>setDeviceCaptureOpen(e.currentTarget.open)}><summary>Use a Bluetooth monitor instead</summary>{deviceCaptureOpen&&liveCapture}</details>}
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <footer><button type="button" className="text-button" onClick={() => setEntryKind(null)}>Cancel</button><button type="submit" className="primary-button"><Save size={15}/> Save record</button></footer>
      </form></AsterDialog>}

    {feedback && <div className="toast-stack" aria-live="polite" aria-atomic="true"><span>{feedback.title}</span></div>}
  </div>;
}

function escapeMarkup(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
