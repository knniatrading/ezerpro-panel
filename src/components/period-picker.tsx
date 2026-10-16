"use client";

import { PRESETS, labelDate, rangeOf, type Preset, type Range } from "@/lib/dates";

/** Selector de periodo: hoy, ayer, semana, mes o un rango a elección. */
export function PeriodPicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="period">
      <div className="seg" role="tablist" aria-label="Periodo">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={value.preset === p.id}
            className={value.preset === p.id ? "is-on" : ""}
            onClick={() => onChange(rangeOf(p.id as Preset, value))}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === "rango" ? (
        <div className="period__dates">
          <label>
            Desde
            <input type="date" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} />
          </label>
          <label>
            Hasta
            <input type="date" value={value.to} min={value.from} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} />
          </label>
        </div>
      ) : (
        <p className="period__label">
          {value.from === value.to ? labelDate(value.from) : `${labelDate(value.from)} – ${labelDate(value.to)}`}
        </p>
      )}
    </div>
  );
}
