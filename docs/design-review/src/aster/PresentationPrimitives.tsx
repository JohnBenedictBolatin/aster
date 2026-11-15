import type { ReactNode } from 'react';
import type { Observation } from '../domain';

export function Pill({ children, kind = 'neutral' }: { children: ReactNode; kind?: 'neutral' | 'attention' | 'danger' | 'quiet' }) {
  return <span className={`aster-pill aster-pill-${kind}`}>{children}</span>;
}

export function SectionHeading({ title, detail, aside }: { title: string; detail?: string; aside?: ReactNode }) {
  return <div className="aster-section-head"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{aside}</div>;
}

export function ObservationDetails({ observation }: { observation: Observation }) {
  return <details className="record-details" key={observation.id}>
    <summary>Record details</summary>
    <dl><div><dt>Recorded</dt><dd>{observation.at}</dd></div>
      <div><dt>Source</dt><dd>{observation.source}</dd></div>
      <div><dt>Method</dt><dd>{observation.method}</dd></div>
      <div><dt>Conditions</dt><dd>{observation.context}</dd></div>
      <div><dt>Mission phase</dt><dd>{observation.missionPhase || 'Not recorded'}</dd></div>
      <div><dt>Origin</dt><dd>{observation.provenance?.label ?? (observation.synthetic ? 'Scenario record' : 'Crew record')}</dd></div>
      <div><dt>Quality</dt><dd>{observation.quality === 'verify' ? 'Needs verification' : 'Recorded'}</dd></div>
      <div><dt>Rule version</dt><dd>{observation.guidanceVersion}</dd></div></dl>
  </details>;
}
