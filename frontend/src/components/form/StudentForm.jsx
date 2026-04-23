import { useState } from "react";
import subjects from "../../data/subjects";
import { analyseStudent } from "../../lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Tiny design-system helpers (no Tailwind dependency on class-variance-authority)
// ─────────────────────────────────────────────────────────────────────────────
const cx = (...a) => a.filter(Boolean).join(" ");

function Field({ label, children, className = "" }) {
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      className={cx(
        "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800",
        "placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300",
        "focus:border-indigo-400 transition-all",
        className
      )}
      {...props}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentForm({ onResult, onLoading }) {
  const [studentId,   setStudentId]   = useState("");
  const [studentName, setStudentName] = useState("");
  const [collection,  setCollection]  = useState("syllabus_cs2024");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // scores[subject_id] = ["", "", ...]  one entry per component
  const [scores, setScores] = useState(() => {
    const init = {};
    subjects.forEach((s) => {
      init[s.subject_id] = s.components.map(() => "");
    });
    return init;
  });

  // timetable[subject_id] = "YYYY-MM-DD"
  const [timetable, setTimetable] = useState(() => {
    const t = {};
    subjects.forEach((s) => { t[s.subject_id] = ""; });
    return t;
  });

  const setScore = (subjectId, idx, val) =>
    setScores((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId].map((v, i) => (i === idx ? val : v)),
    }));

  const handleSubmit = async () => {
    setError("");
    if (!studentId.trim() || !studentName.trim()) {
      setError("Please enter your Student ID and Full Name before analysing.");
      return;
    }

    const payload = {
      collection_name: collection.trim() || "syllabus_default",
      student_id:   studentId.trim(),
      student_name: studentName.trim(),
      subjects: subjects.map((s) => ({
        subject_id: s.subject_id,
        name:       s.name,
        units:      s.units,
        components: s.components.map((comp, i) => ({
          label:        comp.label,
          raw_score:    parseFloat(scores[s.subject_id][i]) || 0,
          max_score:    comp.max_score,
          converts_to:  comp.converts_to,
          unit_covered: comp.unit_covered,
        })),
      })),
      timetable: subjects.map((s) => ({
        subject_id: s.subject_id,          // FastAPI TimetableEntry expects subject_id
        exam_date:  timetable[s.subject_id] || "",
      })).filter((t) => t.exam_date),      // only send entries with a date
    };

    try {
      setLoading(true);
      if (onLoading) onLoading(true);
      const data = await analyseStudent(payload);
      if (typeof onResult === "function") onResult(data);
    } catch (err) {
      setError(err.message || "Analysis failed. Is the Python server running on :8000?");
    } finally {
      setLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Info row ── */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Student ID">
          <TextInput
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g. AP22110010001"
          />
        </Field>
        <Field label="Full Name">
          <TextInput
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="e.g. Arjun Sharma"
          />
        </Field>
      </div>

      {/* ── Subject cards ── */}
      {subjects.map((subj) => {
        const maxMarks = subj.components.reduce((s, c) => s + c.converts_to, 0);
        return (
          <div
            key={subj.subject_id}
            className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden"
            style={{ borderTop: `3px solid ${subj.color}` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-4 pt-3 pb-2">
              <div>
                <div className="text-sm font-semibold text-slate-800">{subj.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{subj.subject_id}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Exam Date
                  </span>
                  <input
                    type="date"
                    value={timetable[subj.subject_id] || ""}
                    onChange={(e) =>
                      setTimetable((prev) => ({ ...prev, [subj.subject_id]: e.target.value }))
                    }
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  />
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ background: subj.color + "15", color: subj.color }}
                >
                  {maxMarks} marks
                </span>
              </div>
            </div>

            {/* Units chips */}
            <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
              {subj.units.map((unit, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-full border"
                  style={{
                    background:   subj.color + "10",
                    borderColor:  subj.color + "35",
                    color:        subj.color,
                  }}
                >
                  {unit}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-50 mx-4" />

            {/* Components */}
            <div className="px-4 py-3 space-y-3">
              {subj.components.map((comp, i) => {
                const val       = scores[subj.subject_id][i] ?? "";
                const raw       = parseFloat(val) || 0;
                const converted = comp.max_score > 0
                  ? ((raw / comp.max_score) * comp.converts_to).toFixed(1)
                  : "0.0";
                const isOver = raw > comp.max_score;
                const pct    = comp.max_score > 0 ? Math.min(100, (raw / comp.max_score) * 100) : 0;

                return (
                  <div key={i}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-700">{comp.label}</span>
                        <span className="text-[11px] text-slate-400 ml-2">{comp.unit_covered}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={comp.max_score}
                          placeholder="0"
                          value={val}
                          onChange={(e) => setScore(subj.subject_id, i, e.target.value)}
                          className={cx(
                            "w-16 h-8 text-center text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all",
                            isOver
                              ? "border-red-300 bg-red-50 text-red-700 focus:ring-red-200"
                              : "border-slate-200 bg-white text-slate-800 focus:ring-indigo-200"
                          )}
                        />
                        <span className="text-xs text-slate-400 w-8">/{comp.max_score}</span>
                        <span
                          className="text-xs font-semibold w-16 text-right"
                          style={{ color: subj.color }}
                        >
                          → {converted}/{comp.converts_to}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: subj.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={cx(
          "w-full h-11 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200",
          loading
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white shadow-md shadow-indigo-200"
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
           
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>

            Analysing performance…
          </span>
        ) : (
          " Analyse Performance"
        )}
      </button>
    </div>
  );
}