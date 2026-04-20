from datetime import date
from ingest import query_syllabus


def build_prompt(analysis_result: dict, collection_name: str | None = None) -> str:
    student_name    = analysis_result["student_name"]
    grade           = analysis_result["grade"]
    overall_pct     = analysis_result["overall_percentage"]
    std_dev         = analysis_result["std_deviation"]
    subject_results = analysis_result["subject_results"]

    weak_subjects   = [s for s in subject_results if s["classification"] == "Weak"]
    avg_subjects    = [s for s in subject_results if s["classification"] == "Average"]
    strong_subjects = [s for s in subject_results if s["classification"] == "Strong"]

    # --- RAG: retrieve syllabus chunks for weak/average areas ---
    syllabus_context = ""
    if collection_name and (weak_subjects or avg_subjects):
        query_terms = " ".join(
            f"{s['name']} {' '.join(s.get('units', []))}"
            for s in (weak_subjects + avg_subjects)
        )
        chunks = query_syllabus(query_terms, collection_name, n_results=5)
        if chunks:
            syllabus_context = "\n\nRELEVANT SYLLABUS CONTENT:\n" + "\n---\n".join(chunks)

    # --- Exam timetable: auto-calc days_left if missing, sort safely ---
    timetable = analysis_result.get("timetable", [])
    today = date.today()

    for entry in timetable:
        if entry.get("days_left") is None and entry.get("exam_date"):
            try:
                entry["days_left"] = (date.fromisoformat(entry["exam_date"]) - today).days
            except ValueError:
                entry["days_left"] = 999

    # Sort: soonest first, None goes last
    timetable_sorted = sorted(timetable, key=lambda x: x.get("days_left") or 999)

    if timetable_sorted:
        exam_lines = "\n".join(
            f"  • {e['subject']}: {e['exam_date']} ({e.get('days_left', '?')} days away)"
            for e in timetable_sorted
        )
        exam_section = f"\nUPCOMING EXAMS (today is {today.isoformat()}):\n{exam_lines}"
    else:
        exam_section = "\nNo exam timetable provided."

    # --- Per-subject breakdown ---
    subject_lines = "\n".join(
        f"  • {s['name']}: {s['total']:.1f}% — {s['classification']}"
        for s in subject_results
    )

    # --- Weak component details ---
    weak_component_lines = []
    for s in subject_results:
        for c in s.get("components", []):
            if c.get("pct", 100) < 60:
                weak_component_lines.append(
                    f"  • {s['name']} › {c['label']} ({c.get('unit_covered', '')}): "
                    f"{c['raw_score']}/{c['max_score']} = {c['pct']}%"
                )

    weak_components_section = (
        "\nWEAK COMPONENTS (scored below 60%):\n" + "\n".join(weak_component_lines)
        if weak_component_lines else ""
    )

    # --- Map subject name → exam days left for priority ordering ---
    exam_map = {e["subject"]: e.get("days_left") or 999 for e in timetable_sorted}

    # Sort subjects by urgency (soonest exam first), then by weakness
    classification_order = {"Weak": 0, "Average": 1, "Strong": 2}
    subjects_by_priority = sorted(
        subject_results,
        key=lambda s: (
            exam_map.get(s["name"], 999),
            classification_order.get(s["classification"], 3)
        )
    )

    def exam_suffix(s):
        days = exam_map.get(s["name"])
        return f", exam in {days} days" if days and days < 999 else ""

    priority_lines = "\n".join(
        f"  {i+1}. {s['name']} — {s['classification']} ({s['total']:.1f}%){exam_suffix(s)}"
        for i, s in enumerate(subjects_by_priority[:5])
    )

    prompt = f"""You are a warm, knowledgeable academic coach helping a student improve.

STUDENT PROFILE:
  Name: {student_name}
  Overall Grade: {grade} ({overall_pct:.1f}%)
  Score Consistency (std dev): {std_dev:.1f} {"(highly inconsistent — needs balanced study)" if std_dev > 20 else "(fairly consistent)"}

SUBJECT PERFORMANCE:
{subject_lines}
{weak_components_section}
SUBJECTS RANKED BY PRIORITY (exam urgency + weakness):
{priority_lines}
{exam_section}{syllabus_context}

YOUR TASK — write a personalised study report with these exact sections:

1. STRENGTHS (1-2 sentences): What is the student doing well?

2. PRIORITY STUDY ORDER: List ALL subjects in order of urgency (soonest exam first).
   For each subject write:
   - Subject name + days until exam
   - Current score + classification
   - 2-3 specific topics to focus on from that subject

3. WEAK COMPONENTS TO FIX: For any component scored below 60%, name the exact topic and give one targeted tip.

4. DAILY STUDY PLAN: A simple day-by-day plan for the next 7 days based on the exam dates above.

5. MOTIVATION (1 sentence): Personal, warm, use the student's name.

Rules:
- Be SPECIFIC — use subject names, unit names, component labels from the data above.
- Prioritize by DAYS LEFT to exam, not just score.
- Keep total under 450 words.
- Warm mentor tone, not robotic.
"""
    return prompt