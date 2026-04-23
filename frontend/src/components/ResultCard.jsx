import { useState } from "react";
import SubjectInsightCard from "./SubjectInsightCard";

const cx = (...a) => a.filter(Boolean).join(" ");

// ── helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.ceil((new Date(dateStr) - today) / 86400000);
  return diff;
}

function urgencyBadge(days) {
  if (days === null || days === undefined) return null;
  if (days < 0)  return { bg: "#F1F5F9", text: "#94A3B8", label: "Past"       };
  if (days <= 3) return { bg: "#FEF2F2", text: "#DC2626", label: `${days}d`   };
  if (days <= 7) return { bg: "#FFFBEB", text: "#D97706", label: `${days}d`   };
  return               { bg: "#F0FDF4", text: "#16A34A", label: `${days}d`   };
}

const GRADE_META = {
  O:   { color: "#7C3AED", bg: "#F5F3FF", label: "Outstanding"   },
  "A+":{ color: "#0369A1", bg: "#EFF6FF", label: "Excellent"     },
  A:   { color: "#0369A1", bg: "#EFF6FF", label: "Very Good"     },
  "B+":{ color: "#0891B2", bg: "#ECFEFF", label: "Good"          },
  B:   { color: "#059669", bg: "#F0FDF4", label: "Above Average" },
  C:   { color: "#D97706", bg: "#FFFBEB", label: "Average"       },
  D:   { color: "#DC2626", bg: "#FEF2F2", label: "Below Average" },
  F:   { color: "#991B1B", bg: "#FEF2F2", label: "Fail"          },
};

// ── Priority Topics ───────────────────────────────────────────────────────────
function PriorityTopics({ subjectResults, timetable }) {
  // Build timetable map: subject name → { exam_date, days_left }
  const ttMap = {};
  (timetable || []).forEach((t) => {
    const days = t.days_left ?? daysUntil(t.exam_date);
    // support both old shape (t.subject) and new shape (t.subject_id)
    const key = t.subject_id || t.subject;
    if (key) ttMap[key] = { exam_date: t.exam_date, days };
  });

  // Gather all recommendations from weak/average subjects sorted by urgency
  const items = [];
  (subjectResults || []).forEach((sub) => {
    const ttEntry = ttMap[sub.subject_id] || ttMap[sub.name];
    const days    = ttEntry?.days ?? null;
    const recs    = sub.recommendations || [];
    recs.forEach((rec) => {
      items.push({ subject: sub.name || sub.subject_id, rec, days, cls: sub.classification });
    });
  });

  // Sort: soonest exam first, then weakest first
  const clsOrder = { Weak: 0, Average: 1, Strong: 2 };
  items.sort((a, b) => {
    const da = a.days ?? 999, db = b.days ?? 999;
    if (da !== db) return da - db;
    return (clsOrder[a.cls] ?? 3) - (clsOrder[b.cls] ?? 3);
  });

  const top = items.slice(0, 5);
  if (top.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-1">
        No urgent items — keep up the great work! 🎉
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {top.map((item, i) => {
        const badge = urgencyBadge(item.days);
        const rankColor = i === 0 ? "#DC2626" : i === 1 ? "#D97706" : "#94A3B8";
        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl px-3 py-2.5"
            style={{ background: badge ? badge.bg : "#F8FAFC" }}
          >
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[11px] font-bold shrink-0 mt-0.5"
              style={{ background: rankColor }}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-slate-500 mb-0.5">{item.subject}</div>
              <div className="text-xs text-slate-700 leading-relaxed">{item.rec}</div>
            </div>
            {badge && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                style={{ background: badge.text + "20", color: badge.text }}
              >
                {badge.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AI Feedback block ─────────────────────────────────────────────────────────
function AIFeedback({ text }) {
  const [expanded,     setExpanded]     = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const audioRef = useRef(null);

  if (!text) return null;
  const lines   = text.split("\n").filter((l) => l.trim());
  const preview = lines.slice(0, 6).join("\n");
  const hasMore = lines.length > 6;

  const handleListen = async () => {
    // Stop current audio if playing
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    setAudioLoading(true);
    try {
      const form = new FormData();
      form.append("text", text);
      form.append("language", "en-IN");

      const res = await fetch("http://127.0.0.1:8000/voice/tts", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`TTS failed (${res.status})`);

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setAudioLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 p-5">

      {/* Header row */}
      <div className="flex items-center gap-2 mb-4">
        <div>
          <div className="text-sm font-bold text-indigo-800">AI Study Plan</div>
          <div className="text-[11px] text-indigo-400 mt-0.5">Generated by Sarvam-M</div>
        </div>

        {/* Listen button — prominent, right side */}
        <button
          onClick={handleListen}
          disabled={audioLoading}
          className={cx(
            "ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm",
            audioLoading
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : isPlaying
              ? "bg-red-500 hover:bg-red-600 text-white shadow-red-200"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
          )}
        >
          {audioLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Generating…
            </>
          ) : isPlaying ? (
            <>
              {/* Stop icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
              Stop
            </>
          ) : (
            <>
              {/* Speaker icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              Listen to Plan
            </>
          )}
        </button>
      </div>

      {/* Feedback text */}
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
        {expanded ? text : preview + (hasMore ? "…" : "")}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {expanded ? "Show less ↑" : "Read full plan ↓"}
        </button>
      )}
    </div>
  );
}


// ── Overall score ring ────────────────────────────────────────────────────────
function ScoreRing({ pct, color }) {
  const r    = 38;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width="100" height="100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8"/>
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 1.2s ease" }}
      />
      <text
        x="50" y="46"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight="700"
        fill={color}
      >
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ResultCard({ data, hideFeedback = false }) {
  if (!data) return null;

  const overall    = data.overall_percentage ?? data.overall ?? 0;
  const grade      = data.grade ?? "—";
  const name       = data.student_name ?? "";
  const subjects   = data.subject_results ?? [];
  const feedback   = data.personalized_feedback;
  const timetable  = data.timetable ?? [];
  const overallRec = data.overall_recommendations ?? [];
  const gMeta      = GRADE_META[grade] ?? { color: "#475569", bg: "#F8FAFC", label: grade };

  return (
    <div className="space-y-4">

      {/* ── Overview ── */}
      <div
        className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${gMeta.bg} 0%, white 65%)` }}
      >
        <div className="flex items-center gap-4 p-5">
          <ScoreRing pct={overall} color={gMeta.color} />
          <div className="flex-1 min-w-0">
            {name && (
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                Student
              </div>
            )}
            {name && (
              <div className="text-lg font-bold text-slate-800 truncate">{name}</div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: gMeta.bg, color: gMeta.color }}
              >
                Grade {grade}
              </span>
              <span className="text-xs text-slate-400">{gMeta.label}</span>
              {data.std_deviation !== undefined && (
                <span className="text-xs text-slate-400 ml-auto">
                  σ = {data.std_deviation.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subject quick bar */}
        {subjects.length > 0 && (
          <div className="flex border-t border-slate-100 divide-x divide-slate-100">
            {subjects.map((sub, i) => {
              const clr =
                sub.classification === "Strong" ? "#16A34A"
                : sub.classification === "Weak" ? "#DC2626"
                : "#D97706";
              return (
                <div key={i} className="flex-1 px-3 py-2 text-center min-w-0">
                  <div className="text-[10px] text-slate-400 truncate">
                    {(sub.name ?? sub.subject_id ?? "").split(" ").slice(-1)[0]}
                  </div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: clr }}>
                    {(sub.total ?? 0).toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Priority Topics ── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-slate-800">Priority Study Topics</h3>
          <span className="ml-auto text-[10px] text-slate-400">exam urgency order</span>
        </div>
        <PriorityTopics subjectResults={subjects} timetable={timetable} />
      </div>

      {/* ── Overall Recommendations ── */}
      {overallRec.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-bold text-amber-800">Overall Recommendations</h3>
          </div>
          {overallRec.map((rec, i) => (
            <div key={i} className="flex gap-2 text-xs text-amber-800 mb-1.5 last:mb-0 leading-relaxed">
              <span className="text-amber-500 font-bold shrink-0">›</span>
              {rec}
            </div>
          ))}
        </div>
      )}

      {/* ── Subject Breakdown ── */}
      {subjects.length > 0 && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
            Subject Breakdown
          </h3>
          {subjects.map((sub, i) => (
            <SubjectInsightCard key={sub.subject_id ?? i} result={sub} />
          ))}
        </div>
      )}

      {/* ── AI Feedback ── */}
      {feedback && !hideFeedback && <AIFeedback text={feedback} />}
    </div>
  );
}