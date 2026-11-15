import { ArrowRight, Sparkles, X } from 'lucide-react';
import { GradientIcon } from './GradientIcon';

export type Page = 'log' | 'measurements' | 'investigations' | 'care' | 'history' | 'reference' | 'medical' | 'settings';

const MAIN_NAV: Array<{ id: Page; label: string }> = [
  { id: 'log', label: 'Home' },
  { id: 'measurements', label: 'My readings' },
  { id: 'investigations', label: 'Health reviews' },
  { id: 'care', label: 'Care plan' },
  { id: 'history', label: 'History' },
];

const SECONDARY_NAV: Array<{ id: Page; label: string }> = [
  { id: 'reference', label: 'Help & sources' },
  { id: 'medical', label: 'Medical support' },
  { id: 'settings', label: 'Settings' },
];

export function AsterMark() {
  return <svg className="aster-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.8 19 13l10.2 3-10.2 3L16 29.2 13 19 2.8 16 13 13 16 2.8Z" fill="currentColor" /><circle cx="24.5" cy="6.5" r="1.7" fill="currentColor" /></svg>;
}

export function MissionNavigation({ activePage, mobileOpen, onNavigate, onClose, onOpenPresenter }: {
  activePage: Page;
  mobileOpen: boolean;
  onNavigate: (page: Page) => void;
  onClose: () => void;
  onOpenPresenter: () => void;
}) {
  return <>
    <aside className={`aster-sidebar ${mobileOpen ? 'aster-sidebar-open' : ''}`}>
      <div className="aster-brand"><span className="aster-brand-icon"><AsterMark /></span><span><strong>Aster</strong><small>CREW HEALTH</small></span>
        <button type="button" className="icon-button mobile-nav-close" aria-label="Close navigation" onClick={onClose}><X size={18} /></button>
      </div>
      <nav className="aster-nav" aria-label="Mission workspace">{MAIN_NAV.map(({ id, label }) => <button type="button" key={id} onClick={() => onNavigate(id)} className={activePage === id ? 'active' : ''} aria-current={activePage === id ? 'page' : undefined}><GradientIcon name={id}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><nav className="aster-nav secondary-nav" aria-label="Help and preferences">{SECONDARY_NAV.map(({id,label})=><button key={id} onClick={()=>onNavigate(id)} aria-current={activePage===id?'page':undefined} className={activePage===id?'active':''}><GradientIcon name={id} size={20}/><span>{label}</span></button>)}</nav><button type="button" className="sidebar-presenter" onClick={onOpenPresenter}><Sparkles size={15} /><span>Presenter controls</span><ArrowRight size={14} /></button></div>
    </aside>
    {mobileOpen && <button className="aster-nav-backdrop" aria-label="Close navigation" onClick={onClose} />}
  </>;
}
