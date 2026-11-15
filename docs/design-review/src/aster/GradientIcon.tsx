import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Metric } from '../domain';

export type GradientIconName = Metric | 'log' | 'measurements' | 'investigations' | 'care' | 'history' | 'reference' | 'medical' | 'settings' | 'recovery' | 'cabin' | 'radiation';

// Category colors identify a measurement, never its health status.
export const METRIC_COLORS: Record<Metric, string> = {
  heart: '#ff929f', sleep: '#b9a2ff', bp: '#80bfff',
  temperature: '#ffb578', glucose: '#7ae3bd', mood: '#f8a0d8',
};
const palettes: Record<GradientIconName, [string, string, string]> = {
  heart: ['#ffd0a0', '#ff718f', '#bc57b3'], sleep: ['#e7cbff', '#ad94ff', '#676bd9'],
  bp: ['#a5ecff', '#73b3ff', '#7771e6'], temperature: ['#ffe49d', '#ffa66c', '#ed7095'],
  glucose: ['#c7ffd9', '#65dfbb', '#56a6c4'], mood: ['#ffd0df', '#f494cf', '#a57ce5'],
  log: ['#b4f4ff', '#8ca8ff', '#bc8dea'], measurements: ['#baffdf', '#6edcc4', '#688ee7'],
  investigations: ['#ffe1ad', '#ff9eae', '#b78cf4'], reference: ['#d9caff', '#ae9aff', '#74cbea'],
  care: ['#c8ffd9', '#72dfbf', '#729de7'], history: ['#cce7ff', '#8db9f4', '#ad91e8'],
  medical: ['#ffd2d8', '#f58a9c', '#9f8dec'], settings: ['#c5e4ff', '#9fa9e5', '#c397d9'],
  recovery: ['#ffd0a0', '#ff718f', '#ac7af4'],
  cabin: ['#c7ffe7', '#64d9cf', '#7d92f5'], radiation: ['#ffe7a3', '#f7aa84', '#c189ed'],
};

export function selectionGradientStyle(name: GradientIconName): CSSProperties {
  const [light, middle, dark] = palettes[name];
  return {
    '--selection-gradient': `linear-gradient(120deg, ${light}, ${middle} 52%, ${dark})`,
    '--selection-middle': middle,
    '--selection-glow': `color-mix(in srgb, ${middle} 22%, transparent)`,
  } as CSSProperties;
}

function silhouette(name: GradientIconName): ReactNode {
  switch (name) {
    case 'heart': case 'recovery': return <path d="M16 27S3 19.5 3 11.4C3 4.3 12 2.8 16 9c4-6.2 13-4.7 13 2.4C29 19.5 16 27 16 27Z"/>;
    case 'sleep': return <path d="M25.9 19.8A12.1 12.1 0 0 1 12.2 4.1 12.4 12.4 0 1 0 27.9 19a12 12 0 0 1-2 .8Z"/>;
    case 'bp': return <><path d="M16 3C12 9 6 14.3 6 20a10 10 0 0 0 20 0C26 14.3 20 9 16 3Z"/><path d="m11 20 3-3 3 5 4-4" fill="none" stroke="#101521" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>;
    case 'temperature': return <><path d="M11 7a5 5 0 0 1 10 0v11a8 8 0 1 1-10 0V7Z"/><path d="M16 8v14m0 0h.01" stroke="#542f35" strokeWidth="2.5" strokeLinecap="round"/></>;
    case 'glucose': return <><path d="m16 2 12 7v14l-12 7L4 23V9L16 2Z"/><path d="M10 16h12m-6-6v12" fill="none" stroke="#123d36" strokeWidth="2.5" strokeLinecap="round"/></>;
    case 'mood': return <><circle cx="16" cy="16" r="13"/><path d="M10 19q6 8 12 0M11 11v2m10-2v2" fill="none" stroke="#472a4a" strokeWidth="2" strokeLinecap="round"/></>;
    case 'log': return <><path d="M6 4h20a2 2 0 0 1 2 2v22H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"/><path d="M9 5v22m5-17h8m-8 6h8m-8 6h5" stroke="#252b53" strokeWidth="2" strokeLinecap="round"/></>;
    case 'measurements': return <><rect x="3" y="5" width="26" height="22" rx="5"/><path d="M7 17h4l3-6 4 11 3-5h4" fill="none" stroke="#173e3d" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></>;
    case 'investigations': return <><path d="M6 3h15a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><circle cx="19" cy="19" r="7" stroke="#f4deff" strokeWidth="2"/><path d="m24 24 5 5" stroke="#cda1ef" strokeWidth="4" strokeLinecap="round"/><path d="M8 9h10M8 14h5" stroke="#623951" strokeWidth="2" strokeLinecap="round"/></>;
    case 'care': return <><path d="M8 4h12l5 5v18H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"/><path d="M20 4v6h5M11 15h9m-9 5h5" stroke="#17483b" strokeWidth="2" strokeLinecap="round"/><path d="m11 10 1.5 1.5L15 9" stroke="#17483b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>;
    case 'history': return <><circle cx="16" cy="17" r="11"/><path d="M16 11v7l4 2M7 7H3v4m0-4a14 14 0 0 1 23 2" stroke="#273851" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>;
    case 'reference': return <><path d="M3 5q7-3 13 1 6-4 13-1v22q-7-3-13 1-6-4-13-1V5Z"/><path d="M16 7v18M7 11l5 1m-5 5 5 1m8-6 5-1m-5 7 5-1" stroke="#3b365d" strokeWidth="1.8" strokeLinecap="round"/></>;
    case 'medical': return <><path d="M12 3h8a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path d="M16 9v12m-6-6h12" stroke="#522f42" strokeWidth="3.5" strokeLinecap="round"/></>;
    case 'settings': return <><path d="m13 2 6 0 1 4 4 2 4-1 3 5-3 3v3l3 3-3 5-4-1-4 2-1 4h-6l-1-4-4-2-4 1-3-5 3-3v-3l-3-3 3-5 4 1 4-2 1-4Z"/><circle cx="16" cy="16" r="5" fill="#202232"/></>;
    case 'cabin': return <><path d="M3 17 16 4l13 13v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V17Z"/><path d="M9 17h11q4 0 3-3m-14 8h8q4 0 3 3" fill="none" stroke="#1e4b53" strokeWidth="2" strokeLinecap="round"/></>;
    case 'radiation': return <><circle cx="16" cy="16" r="5"/><ellipse cx="16" cy="16" rx="14" ry="7" transform="rotate(-40 16 16)" fill="none" stroke="currentColor" strokeWidth="2.5"/><ellipse cx="16" cy="16" rx="14" ry="7" transform="rotate(40 16 16)" fill="none" stroke="currentColor" strokeWidth="2.5"/><circle cx="26" cy="7" r="3"/></>;
  }
}

export function GradientIcon({ name, size = 24, glass = false }: { name: GradientIconName; size?: number; glass?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [light, middle, dark] = palettes[name];
  return <svg className={`gradient-icon${glass ? ' gradient-icon-glass' : ''}`} width={size} height={size} viewBox={glass ? '0 0 48 48' : '0 0 32 32'} aria-hidden="true" focusable="false" style={{ '--icon-color': middle } as CSSProperties}>
    <defs>
      <linearGradient id={`${id}-color`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={light}/><stop offset=".5" stopColor={middle}/><stop offset="1" stopColor={dark}/></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".5"/><stop offset=".45" stopColor="#fff" stopOpacity=".12"/><stop offset="1" stopColor="#fff" stopOpacity=".04"/></linearGradient>
    </defs>
    {glass && <><circle cx="33" cy="14" r="12" fill={middle}/><circle cx="13" cy="34" r="9" fill={dark}/><rect x="5" y="7" width="36" height="36" rx="11" fill="#16141e" fillOpacity=".4"/><rect x="5" y="5" width="36" height="36" rx="11" fill={`url(#${id}-glass)`} stroke="#fff" strokeOpacity=".5" strokeWidth=".7"/></>}
    <g transform={glass ? 'translate(11 11) scale(.8)' : undefined} fill={`url(#${id}-color)`} color={middle}>{silhouette(name)}</g>
  </svg>;
}
