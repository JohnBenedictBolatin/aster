import { AlertTriangle, X } from 'lucide-react';

export function UrgentGuidance({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop urgent-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="urgent-modal" role="dialog" aria-modal="true" aria-labelledby="urgent-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <header><div><span className="urgent-icon"><AlertTriangle size={19}/></span><div><h2 id="urgent-title">Urgent health concern</h2><p>Always available · no sensor reading required</p></div></div><button type="button" className="icon-button" aria-label="Close urgent guidance" onClick={onClose}><X size={17}/></button></header>
    <p>On a real mission, follow the mission-approved urgent medical plan and notify a crewmate or medical support now. Do not wait for Aster, an investigation, or a sensor result.</p>
    <p className="urgent-limit">Aster cannot contact medical support.</p>
    <footer><button type="button" className="primary-button" onClick={onClose}>Understood</button></footer>
  </section></div>;
}
