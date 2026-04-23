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

    prompt = f"""You are a warm, experienced teacher speaking directly to your student in a natural, conversational tone — like a one-on-one mentoring session. Do NOT use bullet points, numbered lists, markdown symbols, asterisks, hashes, or dashes. Write in flowing paragraphs as if you are talking to the student face to face.

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

YOUR TASK — speak to {student_name} like their teacher. Write 4-5 natural paragraphs covering:

First paragraph: Tell them what they are doing well and acknowledge their effort.

Second paragraph: Walk them through which subjects need the most attention right now and why, mentioning specific topics they should focus on. If exam dates are available, mention the urgency naturally.

Third paragraph: Talk about the specific components where they scored below 60 percent. Be specific about which topic and give them one clear practical tip for each — like a teacher would say it in a classroom.

Fourth paragraph: Give them a realistic 7-day study plan spoken naturally, not as a list. For example say something like: spend the first two days on this subject focusing on these topics, then move on to the next.

Final paragraph: End with a warm, personal motivational message using their name.

Rules:
- NO bullet points, NO numbered lists, NO markdown, NO symbols like asterisks or hashes.
- Write entirely in plain flowing sentences as if speaking aloud.
- Be specific — use subject names, unit names, component labels from the data above.
- Keep total under 450 words.
"""
    return prompt