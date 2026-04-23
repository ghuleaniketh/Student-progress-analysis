import subjects from "../data/subjects";

const cx = (...a) => a.filter(Boolean).join(" ");

const CLASS_META = {
  Weak:    { bg: "#FEF2F2", color: "#DC2626", label: "Needs attention" },
  Average: { bg: "#FFFBEB", color: "#D97706", label: "On track"        },
  Strong:  { bg: "#F0FDF4", color: "#16A34A", label: "Performing well" },
};

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function SubjectInsightCard({ result }) {
  // Match by subject_id OR name (Python returns subject_id from the input)
  const cfg = subjects.find(
    (s) => s.subject_id === result.subject_id || s.name === result.name
  );

  const name       = result.name        ?? result.subject_id ?? "Unknown";
  const color      = cfg?.color         ?? "#6366F1";
  const comps      = cfg?.components    ?? [];
  const total      = result.total       ?? 0;
  const cls        = result.classification ?? "Average";
  const meta       = CLASS_META[cls]    ?? CLASS_META["Average"];
  const recs       = result.recommendations ?? [];
  const weakUnits  = result.weak_units  ?? [];

  return (
    <div
      className="rounded-xl border border-slate-100 bg-white shadow-sm mb-3 overflow-hidden"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
          {result.subject_id && result.subject_id !== name && (
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">{result.subject_id}</div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <div>
            <span className="text-xl font-bold" style={{ color }}>{total.toFixed(1)}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: meta.bg, color: meta.color }}
          >
            {cls}
          </span>
        </div>
      </div>

      {/* Total progress */}
      <div className="px-4 pb-3">
        <ProgressBar value={total} max={100} color={color} />
      </div>

      {/* Weak unit chips */}
      {weakUnits.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {weakUnits.map((unit, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600"
            >
              {unit}
            </span>
          ))}
        </div>
      )}

      {/* Component rows */}
      {result.components && result.components.length > 0 && (
        <div className="border-t border-slate-50">
          {result.components.map((comp, i) => {
            const cfg_comp  = comps[i];
            const converted = comp.converted_score ?? 0;
            const maxConv   = cfg_comp?.converts_to ?? comp.converts_to ?? 100;
            const pct       = maxConv > 0 ? Math.round((converted / maxConv) * 100) : comp.pct ?? 0;
            const isWeak    = pct < 60;

            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 font-medium">{comp.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{comp.unit_covered}</div>
                </div>
                <div className="text-right shrink-0 w-24">
                  <div className="text-xs font-semibold text-slate-600">
                    {converted.toFixed(1)}/{maxConv}
                  </div>
                  <div className="w-full mt-1">
                    <ProgressBar
                      value={converted}
                      max={maxConv}
                      color={isWeak ? "#FCA5A5" : color}
                    />
                  </div>
                </div>
                <span
                  className="text-[11px] font-bold w-10 text-right shrink-0"
                  style={{ color: isWeak ? "#DC2626" : "#16A34A" }}
                >
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div
          className="mx-4 mb-4 mt-1 px-4 py-3 rounded-xl"
          style={{ background: color + "0e", borderLeft: `3px solid ${color}` }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Study Tips
          </div>
          {recs.map((rec, i) => (
            <div key={i} className="flex gap-2 text-xs text-slate-600 mb-1.5 last:mb-0 leading-relaxed">
              <span style={{ color, fontWeight: 700, flexShrink: 0 }}>›</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}