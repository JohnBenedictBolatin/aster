import { ArrowRight, ChevronLeft, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { AsterSnapshot, ScenarioId, ScenarioWorkspace } from './domain';
import { GradientIcon } from './GradientIcon';
import { inspectionItems, REVIEW_NAMES, selectGuidance, type ReviewAction, type ReviewGuidance } from './guidance';

export const reviewDate = (at:string) => new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(at))+' UTC';
const KEYS:ScenarioId[]=['recovery','cabin','radiation'];

export function ReviewOverview({snapshot,home,onOpen}:{snapshot:AsterSnapshot;home:boolean;onOpen:(key:ScenarioId)=>void}) {
  const rows=KEYS.map(key=>({key,workspace:snapshot.workspaces[key],now:key===snapshot.activeScenario?snapshot.scenarioNow:snapshot.scenarioTimes[key]}));
  const current=rows.filter(r=>r.workspace.investigations.find(i=>i.scenarioId===r.key)?.status!=='closed');
  const closed=rows.filter(r=>!current.includes(r));
  const tasks=rows.flatMap(r=>r.workspace.tasks.filter(t=>t.episodeId===`INV-${r.key}` && t.status==='open').map(task=>({...r,task}))).sort((a,b)=>a.task.due.localeCompare(b.task.due));
  const activity=rows.flatMap(r=>r.workspace.events.filter(e=>e.scenarioId===r.key && Date.parse(e.at)<=Date.parse(r.now)).map(event=>({...r,event}))).sort((a,b)=>b.event.at.localeCompare(a.event.at));
  const cards=(items:typeof rows)=>items.map(({key,workspace,now})=>{
    const g=selectGuidance(key,workspace,now);
    return <article className="home-review" key={key}><GradientIcon name={key} size={44} glass/><div><h2>{g.title}</h2><p>{g.summary}</p><span className="home-next">Next: {g.next.label.toLowerCase()}</span></div><button className="secondary-button" onClick={()=>onOpen(key)}>Open review <ArrowRight size={15}/></button></article>;
  });
  return <><header className="page-title-row"><h1>{home?'Home':'Health reviews'}</h1></header>
    <section className="home-section"><h2>{home?'What needs your attention':'Current reviews'}</h2>{current.length?cards(current):<p className="empty-message">No open reviews. You can add a reading or reopen a saved review.</p>}</section>
    {tasks.length>0 && <section className="home-section"><h2>Follow-ups</h2>{tasks.map(({key,task,now})=><button key={`${key}-${task.id}`} className="home-event" onClick={()=>onOpen(key)}><span><strong>{REVIEW_NAMES[key]}</strong><span>{task.title}</span></span><span>{task.resultId?'Result ready to review':Date.parse(task.due)<=Date.parse(now)?'Due now':'Planned'}<time>{reviewDate(task.due)}</time></span><ArrowRight size={16}/></button>)}</section>}
    {home?<section className="home-section"><h2>Recent activity</h2>{activity.slice(0,5).map(({key,event})=><button className="home-event" key={`${key}-${event.id}`} onClick={()=>onOpen(key)}><span><strong>{event.title}</strong><span>{REVIEW_NAMES[key]}</span></span><time>{reviewDate(event.at)}</time><ArrowRight size={16}/></button>)}{!activity.length&&<p className="empty-message">Your saved actions will appear here.</p>}</section>
      :closed.length>0&&<section className="home-section"><h2>Completed reviews</h2>{cards(closed)}</section>}
  </>;
}

export function GuidedReview({scenario,workspace,now,guidance,onAction,onBack,onSkip,onRestore,onInspect,inspectionOpen,onInspectionOpen,children,followups,onClose,onReopen}: {
  scenario:ScenarioId;workspace:ScenarioWorkspace;now:string;guidance:ReviewGuidance;onAction:(action:ReviewAction)=>void;
  onBack:()=>void;onSkip:(id:string)=>void;onRestore:()=>void;onInspect:(id:string)=>void;inspectionOpen:boolean;onInspectionOpen:(open:boolean)=>void;
  children:ReactNode;followups:ReactNode;onClose:()=>void;onReopen:()=>void;
}) {
  const closed=workspace.investigations.find(i=>i.scenarioId===scenario)?.status==='closed';
  const checks=inspectionItems(scenario,workspace,now);
  const inspectionRef=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{if(inspectionOpen) inspectionRef.current?.scrollIntoView({block:'nearest',behavior:'instant'});},[inspectionOpen]);
  return <><button className="quiet-link review-back" onClick={onBack}><ChevronLeft size={16}/>All health reviews</button>
    <header className="review-heading"><GradientIcon name={scenario} size={48} glass/><div><h1>{guidance.title}</h1><span>{closed?'Closed · saved for later':'Open review'}</span></div></header>
    <div className="guided-layout"><div className="guided-main"><section className="review-summary"><h2>What changed?</h2><p>{guidance.summary}</p></section>
    {guidance.questions.length>0&&<section className="review-questions"><h2>What is still unclear?</h2><ul>{guidance.questions.map(q=><li key={q}>{q}</li>)}</ul></section>}
    <section className="guided-next"><h2>{closed?'Continue this review':'Your next step'}</h2><p>{guidance.next.reason}</p><button className="primary-button" onClick={()=>onAction(guidance.next)}>{guidance.next.label}<ArrowRight size={16}/></button></section>
    {scenario!=='recovery'&&<details className="review-disclosure" ref={inspectionRef} open={inspectionOpen} onToggle={e=>onInspectionOpen(e.currentTarget.open)}><summary>Check the instrument <span>Source, timing, and missing data</span></summary><p>Record what you inspected. This does not repair a sensor or remove a data gap.</p><div className="review-checklist">{checks.map(item=><label key={item.id}><input type="checkbox" checked={!!workspace.reviewProgress?.inspections[item.id]} onChange={()=>onInspect(item.id)}/><span>{item.label}</span></label>)}</div></details>}
    {children}
    {followups}
    <aside className="guided-side">
    {!closed&&<details className="review-disclosure other-actions"><summary>Other actions <span>Optional tools for this review</span></summary>{guidance.optional.map(action=><div className="optional-action" key={action.id}><button className="text-button" onClick={()=>onAction(action)}>{action.label}<ArrowRight size={14}/></button><p>{action.reason}</p>{['context','reaction'].includes(action.id)&&<button className="quiet-link" onClick={()=>onSkip(action.id)}>Skip for this review</button>}</div>)}
      {!!workspace.reviewProgress?.skipped.length&&<button className="quiet-link" onClick={onRestore}>Show skipped options</button>}
      <button className="text-button" onClick={()=>onAction({id:'schedule-extra',kind:'schedule',label:'Plan another follow-up',reason:''})}>Plan a follow-up</button>
    </details>}
    <details className="review-disclosure"><summary>Finish or reopen <span>Keep a record of your decision</span></summary><p>Closing saves this review. It does not mean a health concern is resolved or cancel any pending follow-ups.</p><button className="secondary-button" onClick={closed?onReopen:onClose}>{closed?'Reopen review':'Close this review'}</button></details>
    </aside></div></div></>;
}

export function AsterDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className="aster-dialog" aria-label={title} onCancel={onClose} onClick={event=>{if(event.target===ref.current)onClose();}}><div><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label={`Close ${title}`}><X size={18}/></button></header>{children}</div></dialog>;
}
