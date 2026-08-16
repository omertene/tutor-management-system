import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import type { Subject } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
  { label: "Students", to: "/teacher/register" },
  { label: "Subjects", to: "/teacher/subjects" },
  { label: "Schedule", to: "/teacher/schedule-rules" },
  { label: "Lessons", to: "/teacher/lessons" },
  { label: "Payments", to: "/teacher/payments" },
  { label: "Materials", to: "/teacher/materials" },
  { label: "Statistics", to: "/teacher/statistics" },
];

function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLoadSubjects() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/subjects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setErrorMessage("Failed to load subjects");
      return;
    }

    const data = await response.json();
    setSubjects(data);
  }

  useEffect(() => {
    handleLoadSubjects();
  }, []);

  async function handleAddSubjects() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/subjects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newSubject }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setErrorMessage(errorData.message || "Failed to add subject");
      return;
    }

    const createdSubject = await response.json();
    setSubjects([...subjects, createdSubject]);
    setNewSubject("");
  }

  async function handleDeleteSubject(subject: Subject) {
    setErrorMessage("");

    if (!window.confirm(`Delete "${subject.name}"? This can't be undone.`)) {
      return;
    }

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/subjects/${subject.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      setErrorMessage(errorData.message || "Failed to delete subject");
      return;
    }

    setSubjects(subjects.filter((s) => s.id !== subject.id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/teacher" links={teacherLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Subjects</h1>

        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add a subject</h2>
          <div className="flex gap-3">
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Subject name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={handleAddSubjects}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Add subject
            </button>
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">All subjects</h2>

          <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {subjects.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-500 text-center">No subjects yet.</p>
            )}
            {subjects.map((subject) => (
              <div key={subject.id} className="px-4 py-3 flex items-center justify-between">
                <span className="text-slate-900">{subject.name}</span>
                <button
                  onClick={() => handleDeleteSubject(subject)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default SubjectsPage;