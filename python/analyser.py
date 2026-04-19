import numpy as np
import pandas as pd


# ── Helpers ──────────────────────────────────────────────────────────────────

def convert_score(raw: float, max_score: float, converts_to: float) -> float:
    if max_score == 0:
        return 0.0
    return round((raw / max_score) * converts_to, 2)


def get_grade(pct: float) -> str:
    if pct >= 90: return "O"
    if pct >= 80: return "A+"
    if pct >= 70: return "A"
    if pct >= 60: return "B+"
    if pct >= 50: return "B"
    return "F"


def classify_subject(total: float) -> str:
    if total >= 70: return "Strong"
    if total >= 50: return "Average"
    return "Weak"


# ── Unit-level recommendation engine ─────────────────────────────────────────

UNIT_TIPS = {
    "Unit I": "Revise basic probability — counting principles, axioms, Bayes' theorem.",
    "Unit II": "Practice problems on discrete/continuous distributions — Binomial, Poisson, Normal.",
    "Unit III": "Focus on joint distributions, CLT, and covariance concepts.",
    "Unit IV": "Revisit descriptive stats — mean/median/mode, skewness, Pearson's correlation.",
    "Unit V": "Practice linear regression and confidence interval problems.",
    "ER Model & Relational Model": "Revisit ER diagrams and relational schema conversion.",
    "SQL & Relational Algebra": "Practice SQL queries — joins, subqueries, aggregations.",
    "Normalization": "Study 1NF, 2NF, 3NF, BCNF with examples.",
    "Transactions & Concurrency": "Revise ACID properties, serializability, and locking protocols.",
    "Lab": "Redo lab exercises — focus on query writing and database design.",
    "Lab & Project": "Improve project documentation and test all SQL queries thoroughly.",
    "React": "Revisit React hooks (useState, useEffect) and component lifecycle.",
    "Node & Express": "Practice building REST APIs with Express and proper error handling.",
    "MongoDB": "Practise Mongoose schema design and CRUD operations.",
    "Auth & Security": "Revise JWT flow, bcrypt hashing, and middleware protection.",
    "Python Basics": "Revisit data types, loops, conditionals, and list comprehensions.",
    "Functions & OOP": "Practice defining classes, inheritance, and decorators.",
    "Libraries": "Explore NumPy, Pandas, and Matplotlib with hands-on exercises.",
    "Full Project": "Finalize your project structure and ensure all features are demonstrated.",
    "Data Structures": "Revise arrays, linked lists, stacks, queues, and trees.",
    "Algorithms": "Practice sorting, searching, and time complexity analysis.",
    "Problem Solving": "Solve at least 2 problems daily on LeetCode/HackerRank.",
    "Lab Practice": "Focus on implementing algorithms from scratch in the lab.",
    "All Units": "Comprehensive revision needed — cover all topics systematically.",
    "Unit I & II": "Focus on probability basics and distributions together.",
    "All": "Full revision required across all topics.",
}

def get_unit_tip(unit_covered: str) -> str:
    for key in UNIT_TIPS:
        if key.lower() in unit_covered.lower():
            return UNIT_TIPS[key]
    return f"Revise topics in: {unit_covered}."


# ── Per-subject analyser ──────────────────────────────────────────────────────

def analyse_subject(subject: dict) -> dict:
    subject_id = subject["subject_id"]
    name       = subject.get("name", subject_id)
    units      = subject.get("units", [])
    components = subject["components"]

    rows = []
    for comp in components:
        raw         = float(comp.get("raw_score", 0))
        max_score   = float(comp["max_score"])
        converts_to = float(comp["converts_to"])
        converted   = convert_score(raw, max_score, converts_to)
        pct_comp    = round((raw / max_score) * 100, 1) if max_score > 0 else 0

        rows.append({
            "label":           comp["label"],
            "raw_score":       raw,
            "max_score":       max_score,
            "converts_to":     converts_to,
            "converted_score": converted,
            "pct":             pct_comp,
            "unit_covered":    comp.get("unit_covered", ""),
        })

    df = pd.DataFrame(rows)
    total = round(float(df["converted_score"].sum()), 2)
    classification = classify_subject(total)

    # Build component-level recommendations for weak components
    recommendations = []
    for _, row in df.iterrows():
        if row["pct"] < 60:
            tip = get_unit_tip(row["unit_covered"])
            recommendations.append(
                f"{row['label']} ({row['unit_covered']}): scored {row['pct']}% — {tip}"
            )

    if not recommendations:
        if total >= 80:
            recommendations.append(f"Great work in {name}! Keep maintaining this level.")
        else:
            recommendations.append(f"Consistent performance in {name}. Push for above 80%.")

    return {
        "subject_id":      subject_id,
        "name":            name,
        "units":           units,
        "total":           total,
        "classification":  classification,
        "components":      df.to_dict(orient="records"),
        "recommendations": recommendations,
    }


# ── Overall analyser ──────────────────────────────────────────────────────────

def analyse_student(data: dict) -> dict:
    student_id   = data["student_id"]
    student_name = data.get("student_name", "Student")
    subjects     = data["subjects"]

    subject_results = [analyse_subject(s) for s in subjects]

    totals = np.array([r["total"] for r in subject_results])
    overall_pct  = round(float(np.mean(totals)), 2)
    grade        = get_grade(overall_pct)
    std_dev      = round(float(np.std(totals)), 2)

    weak_subjects   = [r["name"] for r in subject_results if r["classification"] == "Weak"]
    avg_subjects    = [r["name"] for r in subject_results if r["classification"] == "Average"]
    strong_subjects = [r["name"] for r in subject_results if r["classification"] == "Strong"]

    # Overall recommendations
    overall_recs = []
    if weak_subjects:
        overall_recs.append(
            f"Priority subjects needing attention: {', '.join(weak_subjects)}. "
            "Target at least 50% in each to avoid failing."
        )
    if overall_pct < 50:
        overall_recs.append(
            "Your overall score is below passing. Revise fundamentals and attend all CLAs."
        )
    elif overall_pct < 70:
        overall_recs.append(
            "You are in average range. Focus on weak subjects to push your grade to A."
        )
    else:
        overall_recs.append(
            "Good overall performance! Target your weaker components to reach O/A+ grade."
        )

    if std_dev > 20:
        overall_recs.append(
            "Your scores vary a lot across subjects. Balance your study time more evenly."
        )
    if strong_subjects:
        overall_recs.append(
            f"You are performing well in: {', '.join(strong_subjects)}. Maintain this!"
        )

    return {
        "student_id":            student_id,
        "student_name":          student_name,
        "overall_percentage":    overall_pct,
        "grade":                 grade,
        "std_deviation":         std_dev,
        "subject_results":       subject_results,
        "weak_subjects":         weak_subjects,
        "average_subjects":      avg_subjects,
        "strong_subjects":       strong_subjects,
        "overall_recommendations": overall_recs,
    }