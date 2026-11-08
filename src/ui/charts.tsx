// Plain SVG and HTML charts. Blue is income or the main series, orange is spending; the pair passes colour-blind checks.
import React, { useMemo, useRef, useState } from 'react';

export const CHART_BLUE = '#1d5fd1';
export const CHART_ORANGE = '#eb6834';

export interface Series { name: string; color: string; values: number[] }

const niceMax = (n: number) => {
  if (n <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(n));
  const unit = n / pow;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return step * pow;
};

const shortAmount = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${(n / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`;
  if (abs >= 100000) return `${(n / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${Math.round(n)}`;
};

/** Grouped columns on one baseline. Hover any column for the exact figures. */
export const ColumnChart: React.FC<{ labels: string[]; series: Series[]; format: (n: number) => string; height?: number; ariaLabel: string }> = ({ labels, series, format, height = 220, ariaLabel }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const width = 720;
  const pad = { top: 10, right: 8, bottom: 24, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = useMemo(() => niceMax(Math.max(0, ...series.flatMap(s => s.values))), [series]);
  const slot = plotW / Math.max(1, labels.length);
  const gap = 2;
  const barW = Math.min(24, (slot * 0.72 - gap * (series.length - 1)) / series.length);
  const groupW = barW * series.length + gap * (series.length - 1);
  const y = (v: number) => pad.top + plotH - (Math.max(0, v) / max) * plotH;
  const ticks = [0, 0.5, 1].map(t => t * max);

  const column = (x: number, top: number, w: number, color: string, key: string) => {
    const h = pad.top + plotH - top;
    if (h <= 0) return null;
    const r = Math.min(4, h, w / 2);
    return <path key={key} d={`M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${top + h}Z`} fill={color} />;
  };

  return (
    <div>
      {series.length > 1 && (
        <div className="flex gap-4 mb-1">
          {series.map(s => (
            <span key={s.name} className="flex items-center gap-1.5 hint"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</span>
          ))}
        </div>
      )}
      <div
        ref={box} className="relative"
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const r = box.current?.getBoundingClientRect();
          if (r) setPointer({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block" role="img" aria-label={ariaLabel}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#64748b">{shortAmount(t)}</text>
            </g>
          ))}
          {labels.map((label, i) => {
            const x0 = pad.left + slot * i + (slot - groupW) / 2;
            return (
              <g key={label}>
                {hover === i && <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH} fill="#f1f5f9" />}
                {series.map((s, si) => column(x0 + si * (barW + gap), y(s.values[i] ?? 0), barW, s.color, `${label}-${s.name}`))}
                <text x={pad.left + slot * i + slot / 2} y={height - 7} textAnchor="middle" fontSize={11} fill="#64748b">{label}</text>
                <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH + pad.bottom} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="absolute z-10 pointer-events-none bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-[0.8571rem] whitespace-nowrap"
            style={{ left: Math.min(pointer.x + 12, (box.current?.clientWidth ?? 400) - 190), top: Math.max(0, pointer.y - 60) }}
          >
            <div className="font-semibold mb-0.5">{labels[hover]}</div>
            {series.map(s => (
              <div key={s.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />{s.name}</span>
                <span className="font-medium tabular-nums">{format(s.values[hover] ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Ranked horizontal bars with the value in text beside each: easy to read and needs no axis. */
export const BarList: React.FC<{ rows: { label: string; value: number; href?: string; marker?: number }[]; format: (n: number) => string; color?: string; onRow?: (href: string) => void }> = ({ rows, format, color = CHART_ORANGE, onRow }) => {
  const max = Math.max(1, ...rows.map(r => Math.max(r.value, r.marker ?? 0)));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map(r => {
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="truncate font-medium text-slate-700">{r.label}</span>
              <span className="tabular-nums font-semibold shrink-0">{format(r.value)}</span>
            </div>
            <div className="h-2 rounded bg-slate-100 relative">
              <div className="h-2 rounded" style={{ width: `${(Math.max(0, r.value) / max) * 100}%`, background: color }} />
              {r.marker !== undefined && <div className="absolute -top-0.5 w-0.5 h-3 bg-slate-500" style={{ left: `${(r.marker / max) * 100}%` }} title={`Budget ${format(r.marker)}`} />}
            </div>
          </>
        );
        return r.href && onRow
          ? <button key={r.label} onClick={() => onRow(r.href!)} className="text-left cursor-pointer hover:opacity-80">{content}</button>
          : <div key={r.label}>{content}</div>;
      })}
    </div>
  );
};
