import pandas as pd
import numpy as np

# Convert raw marks → final weight
def convert_score(raw, max_marks, converts_to):
    return (raw / max_marks) * converts_to

# Grade system
def get_grade(p):
    if p >= 90: return "O"
    elif p >= 80: return "A+"
    elif p >= 70: return "A"
    elif p >= 60: return "B+"
    elif p >= 50: return "B"
    else: return "F"

def analyse_student(data):
    subject_results = []

    for subject in data["subjects"]:
        total = 0
        component_details = []

        for comp in subject["components"]:
            converted = convert_score(
                comp["raw_score"],
                comp["max_score"],
                comp["converts_to"]
            )

            component_details.append({
                "name": comp["label"],
                "score": round(converted, 2)
            })

            total += converted

        subject_results.append({
            "subject": subject["subject_id"],
            "total": round(total, 2),
            "components": component_details
        })

    df = pd.DataFrame(subject_results)

    overall = df["total"].mean()
    std_dev = np.std(df["total"])

    weak = df[df["total"] < 50]["subject"].tolist()
    strong = df[df["total"] > 70]["subject"].tolist()

    # 🔥 Smart recommendations
    recommendations = []

    for sub in weak:
        recommendations.append(f"Focus on {sub}, performance is below average.")

    if overall < 60:
        recommendations.append("Your overall performance is low. Revise fundamentals and practice more CLAs.")

    if overall >= 80:
        recommendations.append("Excellent performance! Keep consistency.")

    return {
        "overall_percentage": round(overall, 2),
        "grade": get_grade(overall),
        "std_deviation": round(std_dev, 2),
        "weak_subjects": weak,
        "strong_subjects": strong,
        "subjects": subject_results,
        "recommendations": recommendations
    }