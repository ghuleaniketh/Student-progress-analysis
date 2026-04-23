/**
 * subjects.js
 * Single source of truth for subject config used by StudentForm.
 * subject_id MUST match what Python receives and returns in subject_results[].subject_id
 */
const subjects = [
  {
    subject_id: "CS301",
    name: "Probability and Statistics",
    color: "#854F0B",
    units: ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"],
    components: [
      { label: "CLA 1",      max_score: 20, converts_to: 10, unit_covered: "Unit I" },
      { label: "CLA 2",      max_score: 20, converts_to: 10, unit_covered: "Unit II" },
      { label: "Assignment", max_score: 10, converts_to: 5,  unit_covered: "Unit III" },
      { label: "End Sem",    max_score: 60, converts_to: 50, unit_covered: "Unit I & II" },
    ],
  },
  {
    subject_id: "CS302",
    name: "Database Management Systems",
    color: "#0F6E56",
    units: ["ER Model & Relational Model", "SQL & Relational Algebra", "Normalization", "Transactions & Concurrency", "Lab"],
    components: [
      { label: "CLA 1",   max_score: 20, converts_to: 10, unit_covered: "ER Model & Relational Model" },
      { label: "CLA 2",   max_score: 20, converts_to: 10, unit_covered: "SQL & Relational Algebra" },
      { label: "Lab",     max_score: 40, converts_to: 20, unit_covered: "Lab" },
      { label: "End Sem", max_score: 60, converts_to: 50, unit_covered: "Normalization" },
    ],
  },
  {
    subject_id: "CS303",
    name: "Full Stack Development",
    color: "#185FA5",
    units: ["React", "Node & Express", "MongoDB", "Auth & Security"],
    components: [
      { label: "CLA 1",   max_score: 20, converts_to: 10, unit_covered: "React" },
      { label: "CLA 2",   max_score: 20, converts_to: 10, unit_covered: "Node & Express" },
      { label: "Project", max_score: 40, converts_to: 25, unit_covered: "Full Project" },
      { label: "End Sem", max_score: 60, converts_to: 50, unit_covered: "Auth & Security" },
    ],
  },
];

export default subjects;