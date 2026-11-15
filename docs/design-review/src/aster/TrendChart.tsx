import type { BaselineComparison } from './domain';
import type { CSSProperties } from 'react';
import { METRIC_COLORS } from './GradientIcon';
import { METRICS } from './domain';

type Point = { id: string; x: number; y: number; label: string; value: string; current: boolean; selected: boolean };

export function TrendChart({ comparison, points, selectedId, onSelect }: {
  comparison: BaselineComparison;
  points: Array<{ id: string; at: string; value: number; unit: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const values = points.map((point) => point.value);
  if (!points.length) return <div className="aster-trend-empty" role="status">No observations are available in this time window. Absence is not a normal reading.</div>;
  const bandVisible = comparison.state !== 'insufficient' && comparison.low !== null && comparison.high !== null;
  const lower = comparison.low ?? Math.min(...values);
  const upper = comparison.high ?? Math.max(...values);
  const minimum = Math.min(...values, ...(bandVisible ? [lower, upper] : [])) - 1;
  const maximum = Math.max(...values, ...(bandVisible ? [lower, upper] : [])) + 1;
  const range = Math.max(1, maximum - minimum);
  const chartWidth = 680;
  const chartHeight = 174;
  const padding = { left: 38, right: 14, top: 12, bottom: 25 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const y = (value: number) => padding.top + ((maximum - value) / range) * plotHeight;
  const x = (index: number) => padding.left + (points.length < 2 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const linePoints: Point[] = points.map((point, index) => ({
    id: point.id, x: x(index), y: y(point.value), label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(point.at)),
    value: `${Number(point.value.toFixed(1))} ${point.unit}`.trim(), current: index >= points.length - comparison.recentCount, selected: point.id === selectedId,
  }));
  const polyline = linePoints.map((point) => `${point.x},${point.y}`).join(' ');
  const bandTop = y(upper);
  const bandBottom = y(lower);
  const finalY = linePoints.at(-1)?.y;

  return <div className="aster-trend-wrap" style={{ '--series-color': METRIC_COLORS[comparison.metric] } as CSSProperties}>
    <svg className="aster-trend-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${comparison.metric} trend against the personal reference band`}>
      {bandVisible && <rect x={padding.left} y={bandTop} width={plotWidth} height={Math.max(0, bandBottom - bandTop)} className="trend-band" />}
      {[0, 1, 2].map((index) => {
        const value = maximum - (range * index / 2);
        const position = y(value);
        return <g key={index}><line x1={padding.left} x2={chartWidth - padding.right} y1={position} y2={position} className="trend-gridline" />
          <text x={padding.left - 8} y={position + 4} textAnchor="end" className="trend-axis-label trend-axis-value">{Number(value.toFixed(1))}</text></g>;
      })}
      {Number.isFinite(finalY) && <line x1={padding.left} x2={chartWidth - padding.right} y1={finalY} y2={finalY} className="trend-current-guide" />}
      {linePoints.length > 1 && <polyline points={polyline} className="trend-series" />}
      {linePoints.map((point) => <g key={point.id} className={`trend-point-group ${point.selected ? 'trend-point-selected' : ''}`} tabIndex={0} role="button"
        aria-label={`${point.label}, ${point.value}${point.current ? ', in the recent comparison window' : ''}`}
        onClick={() => onSelect(point.id)} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(point.id); }
        }}>
        <circle cx={point.x} cy={point.y} r={point.current ? 5 : 3.4} className={point.current ? 'trend-point trend-point-current' : 'trend-point'} />
        <circle cx={point.x} cy={point.y} r="12" fill="transparent" />
      </g>)}
      {[0, 1, 2, 3].map((index) => {
        const pointIndex = Math.round((points.length - 1) * index / 3);
        const point = linePoints[pointIndex];
        return point ? <text key={point.id} x={point.x} y={chartHeight - 7} textAnchor="middle" className="trend-axis-label">{point.label}</text> : null;
      })}
    </svg>
    <div className="trend-legend"><span><i className="legend-line" aria-hidden="true" />{METRICS[comparison.metric].short}</span>
      {bandVisible && <span><i className="legend-band" aria-hidden="true" />Prior 14-day personal reference</span>}
      <span><i className="legend-guide" aria-hidden="true" />Latest value</span></div>
  </div>;
}
