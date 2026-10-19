"use client";

import { useState } from "react";
import type { ToothChart, ToothMark } from "@/lib/types";
import { LOWER_PERM, LOWER_TEMP, SURF_NAME, SURF_TOOLS, UPPER_PERM, UPPER_TEMP, WHOLE_TOOLS } from "@/lib/clinic";

const SURF_COLOR: Record<string, string> = Object.fromEntries(SURF_TOOLS.map((t) => [t.v, t.c]));
const WHOLE_COLOR: Record<string, string> = Object.fromEntries(WHOLE_TOOLS.map((t) => [t.v, t.c]));
const CELL = 42;
const GAP = 20;
const SZ = 30;

/** Superficies de un diente: arriba es vestibular en la boca superior y lingual en la inferior; mesial siempre mira al centro. */
function faces(tooth: string) {
  const upper = ["1", "2", "5", "6"].includes(tooth[0]);
  const left = ["1", "4", "5", "8"].includes(tooth[0]);
  return { top: upper ? "V" : "L", bottom: upper ? "L" : "V", left: left ? "D" : "M", right: left ? "M" : "D" };
}
const SHAPES: Record<"top" | "bottom" | "left" | "right", string> = {
  top: `0,0 ${SZ},0 ${SZ - 8},8 8,8`,
  bottom: `0,${SZ} ${SZ},${SZ} ${SZ - 8},${SZ - 8} 8,${SZ - 8}`,
  left: `0,0 8,8 8,${SZ - 8} 0,${SZ}`,
  right: `${SZ},0 ${SZ - 8},8 ${SZ - 8},${SZ - 8} ${SZ},${SZ}`,
};

function Tooth({ tooth, x, y, mark, selected, labelTop, onSurface, onNumber, onWhole, readOnly }: {
  tooth: string; x: number; y: number; mark?: ToothMark; selected: boolean; labelTop: boolean;
  onSurface: (face: string) => void; onNumber: () => void; onWhole: () => void; readOnly: boolean;
}) {
  const f = faces(tooth);
  const s = mark?.s ?? {};
  const w = mark?.w;
  const fill = (face: string) => (s[face] ? SURF_COLOR[s[face]] : "#ffffff");
  const stroke = "#495057";
  const zone = (key: "top" | "bottom" | "left" | "right") => (
    <polygon key={key} points={SHAPES[key]} fill={fill(f[key])} stroke={stroke} strokeWidth={1} className={readOnly ? undefined : "odo__zone"} onClick={(e) => { e.stopPropagation(); onSurface(f[key]); }}>
      <title>{`Diente ${tooth} · ${SURF_NAME[f[key]]}${s[f[key]] ? `: ${s[f[key]]}` : ""}`}</title>
    </polygon>
  );
  return (
    <g transform={`translate(${x},${y})`} className={w === "ausente" || w === "extraido" ? "odo__gone" : undefined}>
      <text x={SZ / 2} y={labelTop ? -6 : SZ + 15} textAnchor="middle" className={`odo__num${selected ? " is-sel" : ""}`} onClick={onNumber} role="button" aria-label={`Diente ${tooth}`}>{tooth}</text>
      <rect x={-3} y={-3} width={SZ + 6} height={SZ + 6} rx={5} fill="none" stroke={selected ? "#1c7ed6" : "transparent"} strokeWidth={2} />
      <g className={readOnly ? undefined : "odo__tooth"} onClick={onWhole}>
        {zone("top")}{zone("bottom")}{zone("left")}{zone("right")}
        <rect x={8} y={8} width={SZ - 16} height={SZ - 16} fill={fill("O")} stroke={stroke} strokeWidth={1} className={readOnly ? undefined : "odo__zone"} onClick={(e) => { e.stopPropagation(); onSurface("O"); }}>
          <title>{`Diente ${tooth} · oclusal${s.O ? `: ${s.O}` : ""}`}</title>
        </rect>
      </g>
      {w === "corona" ? <rect x={-1} y={-1} width={SZ + 2} height={SZ + 2} rx={6} fill="none" stroke={WHOLE_COLOR.corona} strokeWidth={3.5} pointerEvents="none" /> : null}
      {w === "endodoncia" ? <line x1={SZ / 2} y1={-1} x2={SZ / 2} y2={SZ + 1} stroke={WHOLE_COLOR.endodoncia} strokeWidth={3.5} pointerEvents="none" /> : null}
      {w === "puente" ? <line x1={-4} y1={SZ / 2} x2={SZ + 4} y2={SZ / 2} stroke={WHOLE_COLOR.puente} strokeWidth={3.5} pointerEvents="none" /> : null}
      {w === "fractura" ? <polyline points={`2,3 10,13 6,17 15,${SZ / 2 + 3} 11,${SZ / 2 + 8} ${SZ - 3},${SZ - 3}`} fill="none" stroke={WHOLE_COLOR.fractura} strokeWidth={2.5} pointerEvents="none" /> : null}
      {w === "implante" ? <g pointerEvents="none"><circle cx={SZ / 2} cy={SZ / 2} r={8} fill={WHOLE_COLOR.implante} /><text x={SZ / 2} y={SZ / 2 + 4} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>I</text></g> : null}
      {w === "extraido" || w === "ausente" ? <g pointerEvents="none" stroke={WHOLE_COLOR[w]} strokeWidth={3} strokeLinecap="round"><line x1={1} y1={1} x2={SZ - 1} y2={SZ - 1} /><line x1={SZ - 1} y1={1} x2={1} y2={SZ - 1} /></g> : null}
      {mark?.n ? <circle cx={SZ + 1} cy={1} r={4.5} fill="#f59f00" stroke="#fff" strokeWidth={1} pointerEvents="none"><title>{mark.n}</title></circle> : null}
    </g>
  );
}

function Arch({ teeth, y, upper, chart, sel, tool, onSurface, onNumber, onWhole, readOnly }: {
  teeth: string[]; y: number; upper: boolean; chart: ToothChart; sel: string | null; tool: string;
  onSurface: (t: string, face: string) => void; onNumber: (t: string) => void; onWhole: (t: string) => void; readOnly: boolean;
}) {
  void tool;
  const half = teeth.length / 2;
  const rows = teeth.map((t, i) => <Tooth key={t} tooth={t} x={i * CELL + (i >= half ? GAP : 0)} y={y} mark={chart[t]} selected={sel === t} labelTop={upper} readOnly={readOnly}
    onSurface={(face) => onSurface(t, face)} onNumber={() => onNumber(t)} onWhole={() => onWhole(t)} />);
  return <>{rows}</>;
}

/** Odontograma digital (numeración FDI). Elige una herramienta y toca las superficies o el diente. */
export function Odontogram({ chart, onChange, readOnly = false }: { chart: ToothChart; onChange?: (c: ToothChart) => void; readOnly?: boolean }) {
  const [tool, setTool] = useState<string>("caries");
  const [sel, setSel] = useState<string | null>(null);
  const hasTemp = Object.keys(chart).some((t) => /^[5-8][1-5]$/.test(t) && Number(t[0]) >= 5);
  const [showTemp, setShowTemp] = useState(hasTemp);

  const put = (tooth: string, fn: (m: ToothMark) => ToothMark) => {
    if (!onChange) return;
    const next = { ...chart };
    const m = fn({ ...(chart[tooth] ?? {}), s: { ...(chart[tooth]?.s ?? {}) } });
    if (m.s && !Object.keys(m.s).length) delete m.s;
    if (!m.w && !m.s && !m.n) delete next[tooth]; else next[tooth] = m;
    onChange(next);
  };
  const isSurf = SURF_TOOLS.some((t) => t.v === tool);
  const onSurface = (tooth: string, face: string) => {
    if (readOnly) return;
    setSel(tooth);
    if (tool === "borrar") return put(tooth, (m) => { if (m.s) delete m.s[face]; return m; });
    if (!isSurf) return;
    put(tooth, (m) => { m.s = { ...(m.s ?? {}) }; if (m.s[face] === tool) delete m.s[face]; else m.s[face] = tool; return m; });
  };
  const onWhole = (tooth: string) => {
    if (readOnly) return;
    setSel(tooth);
    if (tool === "borrar") return put(tooth, (m) => { delete m.w; return m; });
    if (isSurf) return;
    put(tooth, (m) => { if (m.w === tool) delete m.w; else m.w = tool; return m; });
  };
  const rowW = 16 * CELL + GAP;
  const rowWT = 10 * CELL + GAP;
  const H = showTemp ? 330 : 190;
  const W = Math.max(rowW, rowWT);
  const selMark = sel ? chart[sel] : undefined;
  const offT = (n: number) => (W - n) / 2;
  return (
    <div className="odo">
      {!readOnly ? (
        <div className="odo__tools" role="group" aria-label="Herramientas del odontograma">
          {SURF_TOOLS.map((t) => <button type="button" key={t.v} className={`odo__tool${tool === t.v ? " is-on" : ""}`} aria-pressed={tool === t.v} onClick={() => setTool(t.v)}><i style={{ background: t.c }} />{t.l}</button>)}
          <span className="odo__sep" aria-hidden="true" />
          {WHOLE_TOOLS.map((t) => <button type="button" key={t.v} className={`odo__tool${tool === t.v ? " is-on" : ""}`} aria-pressed={tool === t.v} onClick={() => setTool(t.v)}><i style={{ background: t.c }} />{t.l}</button>)}
          <span className="odo__sep" aria-hidden="true" />
          <button type="button" className={`odo__tool${tool === "borrar" ? " is-on" : ""}`} aria-pressed={tool === "borrar"} onClick={() => setTool("borrar")}><i style={{ background: "#fff", border: "1px solid #868e96" }} />Borrar</button>
        </div>
      ) : null}
      {!readOnly ? <p className="field__hint">{isSurf ? "Toca la superficie del diente que quieres marcar (el centro es la cara de masticación)." : tool === "borrar" ? "Toca una superficie o el diente para quitar la marca." : "Toca el diente para marcarlo. Vuelve a tocarlo para quitar la marca."}</p> : null}
      <div className="odo__scroll">
        <svg viewBox={`-10 -22 ${W + 20} ${H}`} role="img" aria-label="Odontograma" className="odo__svg">
          <text x={W / 2} y={-10} textAnchor="middle" className="odo__cap">Arriba</text>
          <g transform={`translate(${offT(rowW)},8)`}><Arch teeth={UPPER_PERM} y={0} upper chart={chart} sel={sel} tool={tool} onSurface={onSurface} onNumber={setSel} onWhole={onWhole} readOnly={readOnly} /></g>
          <line x1={W / 2} y1={-4} x2={W / 2} y2={96} stroke="#ced4da" strokeDasharray="3 3" />
          <g transform={`translate(${offT(rowW)},66)`}><Arch teeth={LOWER_PERM} y={0} upper={false} chart={chart} sel={sel} tool={tool} onSurface={onSurface} onNumber={setSel} onWhole={onWhole} readOnly={readOnly} /></g>
          {showTemp ? (
            <>
              <text x={W / 2} y={137} textAnchor="middle" className="odo__cap">Dentición temporal</text>
              <g transform={`translate(${offT(rowWT)},160)`}><Arch teeth={UPPER_TEMP} y={0} upper chart={chart} sel={sel} tool={tool} onSurface={onSurface} onNumber={setSel} onWhole={onWhole} readOnly={readOnly} /></g>
              <g transform={`translate(${offT(rowWT)},218)`}><Arch teeth={LOWER_TEMP} y={0} upper={false} chart={chart} sel={sel} tool={tool} onSurface={onSurface} onNumber={setSel} onWhole={onWhole} readOnly={readOnly} /></g>
            </>
          ) : null}
        </svg>
      </div>
      <div className="odo__foot">
        <label className="check"><input type="checkbox" checked={showTemp} onChange={(e) => setShowTemp(e.target.checked)} /> Mostrar dentición temporal (niños)</label>
        <span className="field__hint">Derecha del paciente a la izquierda de la imagen. Punto naranja: el diente tiene una nota.</span>
      </div>
      {sel ? (
        <div className="odo__sel">
          <b>Diente {sel}</b>
          <span className="field__hint">{selMark?.w ? selMark.w : "sin estado general"}{selMark?.s ? ` · ${Object.entries(selMark.s).map(([f, s]) => `${s} (${SURF_NAME[f]})`).join(", ")}` : ""}</span>
          {!readOnly ? (
            <div className="field"><label htmlFor="odo-note">Nota del diente</label>
              <input id="odo-note" type="text" maxLength={200} value={selMark?.n ?? ""} autoComplete="off" placeholder="Ej.: control en 3 meses" onChange={(e) => put(sel, (m) => { if (e.target.value) m.n = e.target.value; else delete m.n; return m; })} /></div>
          ) : selMark?.n ? <p>{selMark.n}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
