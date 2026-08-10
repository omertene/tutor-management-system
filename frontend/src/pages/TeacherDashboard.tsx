import { useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
  { label: "Home", to: "/teacher" },
  { label: "Students", to: "/teacher/register" },
  { label: "Subjects", to: "/teacher/subjects" },
  { label: "Schedule", to: "/teacher/schedule-rules" },
  { label: "Overrides", to: "/teacher/schedule-overrides" },
  { label: "Lessons", to: "/teacher/lessons" },
  { label: "Payments", to: "/teacher/payments" },
  { label: "Materials", to: "/teacher/materials" },
  { label: "Statistics", to: "/teacher/statistics" },
];

function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // which student's edit form is currently open, and the form fields for it
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [notes, setNotes] = useState("");

  async function handleLoadStudents() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setErrorMessage("Failed to load students");
      return;
    }

    const data = await response.json();

    setStudents(data);
  }


  async function handleLoadAllStudentsIncludingInactive() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setErrorMessage("Failed to load students");
      return;
    }

    const data = await response.json();

    setStudents(data);
  }


  async function handleToggleActive(student: Student) {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/${student.id}/active`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !student.active }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setErrorMessage(errorData.message || "Failed to update student status");
      return;
    }

    const updatedStudent = await response.json();
    setStudents(students.map((s) => s.id === student.id ? updatedStudent : s));
  }

  // opens the edit form for a student, pre-filled with their current values
  function handleStartEdit(student: Student) {
    setEditingStudentId(student.id);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setPhone(student.phone ?? "");
    setHourlyRate(String(student.hourlyRate));
    setEducationLevel(student.educationLevel ?? "");
    setNotes(student.notes ?? "");
  }

  function handleCancelEdit() {
    setEditingStudentId(null);
  }

  // PUT /teacher/students/{id}
  async function handleSaveEdit(studentId: number) {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/${studentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        hourlyRate: Number(hourlyRate),
        educationLevel,
        notes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setErrorMessage(errorData.message || "Failed to update student");
      return;
    }

    const updatedStudent = await response.json();
    setStudents(students.map((student) => student.id === studentId ? updatedStudent : student));
    setEditingStudentId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/teacher" links={teacherLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Teacher Dashboard</h1>
        <p className="text-slate-500 mt-1">Here's an overview of your students.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/teacher/register"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Add student
          </Link>
          <Link
            to="/teacher/lessons"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            View lessons
          </Link>
          <Link
            to="/teacher/statistics"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            View statistics
          </Link>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Your students</h2>
            <div className="flex gap-2">
              <button
                onClick={handleLoadStudents}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Show active
              </button>
              <button
                onClick={handleLoadAllStudentsIncludingInactive}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Show all (incl. inactive)
              </button>
            </div>
          </div>

          {errorMessage && <p className="text-sm text-red-600 mt-2">{errorMessage}</p>}

          <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {students.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-500 text-center">
                No students loaded yet. Click "Show active" to load your students.
              </p>
            )}

            {students.map((student) => (
              <div key={student.id} className="px-4 py-3">
                {editingStudentId === student.id ? (
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      placeholder="first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="hourly rate"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-24"
                    />
                    <input
                      placeholder="education level"
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-40"
                    />
                    <button
                      onClick={() => handleSaveEdit(student.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="text-slate-500 text-sm">{student.email}</span>
                      <span className="text-slate-500 text-sm">{student.phone}</span>
                      <span className="text-slate-500 text-sm">₪{student.hourlyRate}/hr</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          student.active
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {student.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(student)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(student)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        {student.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default TeacherDashboard;
