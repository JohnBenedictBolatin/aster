import { Check, Clock3, RotateCcw, Signal, Sparkles, X } from 'lucide-react';
import { SCENARIOS, type ScenarioId, type ScenarioWorkspace, type Handoff } from './domain';
import { Pill, SectionHeading } from './PresentationPrimitives';

export type PresenterBranch = 'recovery' | 'persistent' | 'sensor-error' | 'missing-evidence' | 'cabin-clear' | 'cabin-sensor' | 'radiation-gap' | 'radiation-record';

function stamp(value: string) {
  const at = new Date(value);
  if (!Number.isFinite(at.valueOf())) return 'Time unavailable';
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(at)} UTC`;
}

export function PresenterDrawer({
  scenarioId, workspace, runningClock, linkDelayMinutes,
  onLinkDelay, onClose, onToggleClock, onAdvanceClock, onScenario, onBranch, onReset, onSimulateDelivery, onMarkReviewed,
}: {
  scenarioId: ScenarioId;
  workspace: ScenarioWorkspace;
  runningClock: boolean;
  linkDelayMinutes: number;
  onLinkDelay: (minutes: number) => void;
  onClose: () => void;
  onToggleClock: () => void;
  onAdvanceClock: (milliseconds: number) => void;
  onScenario: (scenario: ScenarioId) => void;
  onBranch: (branch: PresenterBranch) => void;
  onReset: () => void;
  onSimulateDelivery: () => void;
  onMarkReviewed: (handoffId: string) => void;
}) {
  return <div className="presenter-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="presenter-drawer" role="dialog" aria-modal="true" aria-labelledby="presenter-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <header><div><span className="drawer-icon"><Sparkles size={18}/></span><div><h2 id="presenter-title">Presenter controls</h2></div></div><button type="button" className="icon-button" aria-label="Close presenter controls" onClick={onClose}><X size={18}/></button></header>
      <section className="presenter-group"><SectionHeading title="Mission clock" detail="Changes scenario time only"/><div className="clock-controls"><button type="button" className="primary-button" onClick={onToggleClock}><Clock3 size={15}/>{runningClock ? 'Pause replay clock' : 'Run replay clock'}</button><button type="button" className="secondary-button" onClick={() => onAdvanceClock(60_000)}>+1 min</button><button type="button" className="secondary-button" onClick={() => onAdvanceClock(linkDelayMinutes * 60_000)}>+{linkDelayMinutes} min</button><button type="button" className="secondary-button" onClick={() => onAdvanceClock(86_400_000)}>+1 day</button></div></section>
      <section className="presenter-group"><SectionHeading title="Switch investigation"/><div className="presenter-scenarios">{(Object.keys(SCENARIOS) as ScenarioId[]).map((key) => <button type="button" className={scenarioId === key ? 'selected' : ''} key={key} onClick={() => onScenario(key)}>{SCENARIOS[key].label}{scenarioId === key && <Check size={14}/>}</button>)}</div></section>
      <section className="presenter-group"><SectionHeading title="Follow-up outcome" detail="Choose what happens next."/>
        <div className="presenter-branches"><button type="button" onClick={() => onBranch('missing-evidence')}><strong>No follow-up result received</strong><small>Advances one day without a new reading; leaves the task open</small></button></div>
        {scenarioId === 'recovery' ? <div className="presenter-branches"><button type="button" onClick={() => onBranch('recovery')}><strong>Values move toward personal history</strong><small>Adds a comparable day: pulse 72 bpm, sleep 7.2 h</small></button><button type="button" onClick={() => onBranch('persistent')}><strong>Pattern continues</strong><small>Adds a comparable day: pulse 87 bpm, sleep 4.2 h</small></button><button type="button" onClick={() => onBranch('sensor-error')}><strong>Sensor contact is lost</strong><small>Adds an unusable reading that requires verification</small></button></div>
          : scenarioId === 'cabin' ? <div className="presenter-branches"><button type="button" onClick={() => onBranch('cabin-clear')}><strong>Add a lower cabin reading</strong><small>Includes source and timestamp; does not close review</small></button><button type="button" onClick={() => onBranch('cabin-sensor')}><strong>Mark sensor contact uncertain</strong><small>Requires verification before comparison</small></button></div>
            : <div className="presenter-branches"><button type="button" onClick={() => onBranch('radiation-gap')}><strong>Keep a data gap open</strong><small>Unknown intervals stay unknown; no dose is calculated</small></button><button type="button" onClick={() => onBranch('radiation-record')}><strong>Add an instrument event</strong><small>Adds a timestamped dosimeter record</small></button></div>}
      </section>
      <section className="presenter-group"><SectionHeading title="Handoff status" detail="Delivery advances with mission time"/><label className="settings-field">One-way delay (minutes)<input type="number" min="1" max="180" value={linkDelayMinutes} onChange={event=>onLinkDelay(Math.max(1,Math.min(180,Number(event.target.value)||12)))}/></label>{workspace.handoffs.length === 0 ? <p className="empty-message">Create a handoff from the investigation to track its delivery stages.</p> : workspace.handoffs.map((handoff: Handoff) => <div className="handoff-stage" key={handoff.id}><span>{handoff.summary}</span><Pill kind={handoff.status === 'received' ? 'neutral' : 'quiet'}>{handoff.status}</Pill>
          {handoff.status === 'queued' && <button type="button" className="secondary-button" onClick={onSimulateDelivery}><Signal size={14}/> Advance link</button>}
          {handoff.status === 'transmitted' && <small>Delivery expected {handoff.deliverAt ? stamp(handoff.deliverAt) : 'when the mission clock advances'}.</small>}
          {handoff.status === 'received' && <button type="button" className="secondary-button" onClick={() => onMarkReviewed(handoff.id)}><Check size={14}/> Mark reviewed</button>}
        </div>)}</section>
      <footer><button type="button" className="danger-link" onClick={onReset}><RotateCcw size={14}/> Reset this investigation</button><span>Other investigations and live records are kept.</span></footer>
    </aside>
  </div>;
}
