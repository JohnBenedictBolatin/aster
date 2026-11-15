import { ArrowRight, ArrowUpRight, Info, Orbit, Radio, Wind } from 'lucide-react';
import type { CabinReading, RadiationReading } from './domain';
import { Pill } from './PresentationPrimitives';

export type NavigatorEvidence = {
  id: string;
  at: string;
  title: string;
  detail: string;
  observationId?: string;
  eventId?: string;
  instrumentId?: string;
  timeLabel?: string;
};

function stamp(value: string, withTime = true) {
  const at = new Date(value);
  if (!Number.isFinite(at.valueOf())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: 'UTC',
  }).format(at) + ' UTC';
}

export function CabinPanel({ readings, now }: { readings: CabinReading[]; now: string }) {
  const rows = [...readings].filter((item) => Date.parse(item.at) <= Date.parse(now)).sort((a, b) => b.at.localeCompare(a.at));
  return <div className="instrument-records"><p>Cabin sensor readings · ppm</p>{rows.map((reading) => <div key={reading.id}><div><Wind size={16}/><strong>{reading.value.toLocaleString()} {reading.unit}</strong><Pill kind={reading.quality === 'verify' ? 'attention' : 'quiet'}>{reading.quality === 'verify' ? 'Verify source' : 'Recorded'}</Pill></div><span>{stamp(reading.at)} · {reading.instrument}</span></div>)}</div>;
}

export function EvidenceRows({ items, onSelect }: { items: NavigatorEvidence[]; onSelect: (item: NavigatorEvidence) => void }) {
  return <section className="navigator-records" aria-label="Supporting scenario records">
    <h3>Supporting records</h3>
    {items.length ? items.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item)}>
      <span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.timeLabel ?? stamp(item.at)}</time><ArrowRight size={13}/>
    </button>) : <p className="empty-message">No supporting records are available in this time window.</p>}
  </section>;
}

export function RadiationPanel({ readings, now, selectedId, onSelect }: { readings: RadiationReading[]; now: string; selectedId: string; onSelect: (id: string) => void }) {
  const rows = readings.filter((item) => item.synthetic || Date.parse(item.at) <= Date.parse(now));
  const scenarioRows = rows.filter((item) => item.synthetic).sort((a, b) => b.at.localeCompare(a.at));
  const historicalRows = rows.filter((item) => !item.synthetic).sort((a, b) => a.at.localeCompare(b.at));
  const hasGap = scenarioRows.some((row, index) => index > 0 && Date.parse(scenarioRows[index - 1].at) - Date.parse(row.at) > 86_400_000);
  return <div className="instrument-records">
    <div className="radiation-source-note"><Radio size={16}/><p>Historical ISS records are shown separately from mission readings; they are not personal dose. <a href="https://visualization.osdr.nasa.gov/radlab/gui/data-api/" target="_blank" rel="noreferrer">About NASA RadLab</a></p></div>
    {scenarioRows.map((reading) => <button type="button" className={`instrument-reading ${selectedId === reading.id ? 'instrument-reading-selected' : ''}`} aria-pressed={selectedId === reading.id} key={reading.id} onClick={() => onSelect(reading.id)}><span><Orbit size={16}/><strong>{reading.value.toFixed(2)} {reading.unit}</strong><Pill kind={reading.quality === 'verify' ? 'attention' : 'quiet'}>{reading.quality === 'verify' ? 'Verify source' : 'Mission reading'}</Pill></span><small>{stamp(reading.at)} · {reading.instrument}</small></button>)}
    {historicalRows.length > 0 && <section className="radlab-reference" aria-label="Historical NASA RadLab instrument records"><div><strong>Historical NASA reference · ISS</strong><small>Data and visualizations are courtesy of the RadLab Portal, Version {historicalRows[0].portalVersion}. Retrieved {stamp(historicalRows[0].retrievedAt ?? '')}. These source timestamps are shown as returned.</small></div>
      {historicalRows.map((reading) => <article className={selectedId === reading.id ? 'radlab-record-selected' : ''} key={reading.id}><button type="button" aria-pressed={selectedId === reading.id} onClick={() => onSelect(reading.id)}><strong>{reading.value} {reading.unit}</strong><span>{reading.at} · {reading.instrument} · {reading.spacecraft} · historical instrument record</span></button><a href={reading.sourceUrl} target="_blank" rel="noreferrer">Open the source query <ArrowUpRight size={12}/></a></article>)}
      <p>Archived ISS readings are instrument data, not personal dose or current exposure.</p>
      <details className="record-details"><summary>Related radiation-monitoring research</summary><p>The CSA describes continued development of CANS, a separate autonomous neutron instrument. It is not the NASA RadLab data shown here.</p><a href="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp" target="_blank" rel="noreferrer">Read the Canadian Space Agency source <ArrowUpRight size={12}/></a></details>
    </section>}
    {hasGap && <p className="data-gap"><Info size={14}/> Data gap visible · exposure during this interval remains unknown.</p>}

  </div>;
}
