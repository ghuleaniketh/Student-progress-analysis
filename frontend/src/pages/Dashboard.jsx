import { useState, useRef } from "react";
import StudentForm    from "../components/form/StudentForm";
import ResultCard     from "../components/ResultCard";
import AIFeedbackPanel from "../components/Aifeedbackpanel";

const cx = (...a) => a.filter(Boolean).join(" ");

const TABS = [
  { id: "form",   label: "Form",    title: "Enter Marks"         },
  { id: "result", label: "Results", title: "Performance Analysis" },
];

export default function Dashboard() {
  const [result,       setResult]       = useState(null);
  const [activeTab,    setActiveTab]    = useState("form");
  const [loading,      setLoading]      = useState(false);
  const resultPanelRef = useRef(null);

  const handleResult = (data) => {
    setResult(data);
    setActiveTab("result");
    setTimeout(() => resultPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  return (
    
    <div
      className="min-h-screen"
      style={{ background: "#F5F4F1", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Top navbar ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
            >
              S
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 leading-none">
                Student Performance Analyser
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                SRM University AP · Sem IV · CSE · 2025–26
              </div>
            </div>
          </div>

          {result && (
            <div
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#EFF6FF", color: "#1D4ED8" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {result.student_name} · Grade {result.grade}
            </div>
          )}
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasNotif = tab.id === "result" && result && activeTab !== "result";
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    "relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all border-b-2",
                    isActive
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                  {hasNotif && (
                    <span className="absolute top-2 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-[1280px] mx-auto px-6 py-6">

        {/* FORM TAB */}
        {activeTab === "form" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Enter Student Marks</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fill in scores for each component, set exam dates, then hit Analyse.
                  </p>
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Analysing…
                  </div>
                )}
              </div>
              <StudentForm onResult={handleResult} onLoading={setLoading} />
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="text-sm font-bold text-slate-700 mb-3">How it works</div>
                {[
                  ["1", "Fill in marks", "Enter raw scores for each component of every subject."],
                  ["2", "Set exam dates", "Add your exam timetable for urgency-sorted study tips."],
                  ["3", "Analyse", "Python backend calculates scores and generates an AI study plan via Sarvam-M."],
                  ["4", "Review + Listen", "See priority topics, subject cards, and listen to the AI plan."],
                ].map(([num, title, desc]) => (
                  <div key={num} className="flex gap-3 mb-4 last:mb-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ background: "#6366F1" }}
                    >
                      {num}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">{title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESULT TAB */}
        {activeTab === "result" && (
          <div ref={resultPanelRef}>
            {result ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Performance Analysis</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Generated by Python analyser + Sarvam-M AI
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("form")}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    New Analysis
                  </button>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
                  {/* Left: scores, topics, recommendations, subject breakdown */}
                  <ResultCard data={result} hideFeedback />
                  {/* Right: AI Study Plan — sticky so it stays visible while scrolling */}
                  {result.personalized_feedback && (
                    <div className="sticky top-20">
                      <AIFeedbackPanel text={result.personalized_feedback} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <h3 className="text-lg font-bold text-slate-700 mb-2">No results yet</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-xs">
                  Fill in the form and click Analyse Performance to see your personalised report here.
                </p>
                <button
                  onClick={() => setActiveTab("form")}
                  className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                >
                  Go to Form
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}