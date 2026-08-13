import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import Modal from "../components/Modal";
import type { Student, Subject } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
  { label: "Students", to: "/teacher/register" },
  { label: "Subjects", to: "/teacher/subjects" },
  { label: "Schedule", to: "/teacher/schedule-rules" },
  { label: "Overrides", to: "/teacher/schedule-overrides" },
  { label: "Lessons", to: "/teacher/lessons" },
  { label: "Payments", to: "/teacher/payments" },
  { label: "Materials", to: "/teacher/materials" },
  { label: "Statistics", to: "/teacher/statistics" },
];

type Lesson = {
  id: number;
  studentFirstName: string;
  studentLastName: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

type Debt = {
  studentId: number;
  studentFirstName: string;
  studentLastName: string;
  debt: number;
};

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  // which student's edit form is currently open, and the form fields for it
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [notes, setNotes] = useState("");

  // "add student" modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [newStudentFirstName, setNewStudentFirstName] = useState("");
  const [newStudentLastName, setNewStudentLastName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentHourlyRate, setNewStudentHourlyRate] = useState("");
  const [newStudentEducationLevel, setNewStudentEducationLevel] = useState("");
  const [newStudentNotes, setNewStudentNotes] = useState("");
  const [addStudentError, setAddStudentError] = useState("");
  const [addStudentSuccess, setAddStudentSuccess] = useState("");

  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newLessonStudentId, setNewLessonStudentId] = useState("");
  const [newLessonSubjectId, setNewLessonSubjectId] = useState("");
  const [newLessonDate, setNewLessonDate] = useState("");
  const [newLessonStartTime, setNewLessonStartTime] = useState("");
  const [newLessonEndTime, setNewLessonEndTime] = useState("");
  const [addLessonError, setAddLessonError] = useState("");


  function handleNewLessonStartTimeChange(value: string) {
    setNewLessonStartTime(value);

    if (!value) return;
    const [hours, minutes] = value.split(":").map(Number);
    const endHours = (hours + 1) % 24;
    setNewLessonEndTime(`${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  }

async function loadStudentsList(token: string | null): Promise<Student[] | null> {
    const response = await fetch(`${API_BASE_URL}/teacher/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  }

  async function loadUpcomingLessonsList(token: string | null): Promise<Lesson[] | null> {
    const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const data: Lesson[] = await response.json();
    return data
      .filter((lesson) => lesson.status === "SCHEDULED")
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 5);
  }

  async function loadDebtsList(token: string | null): Promise<Debt[] | null> {
    const response = await fetch(`${API_BASE_URL}/teacher/debts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const data: Debt[] = await response.json();
    return data.filter((debt) => debt.debt > 0);
  }


  async function refreshDashboard() {
    const token = localStorage.getItem("token");

    const [studentsData, lessonsData, debtsData] = await Promise.all([
      loadStudentsList(token),
      loadUpcomingLessonsList(token),
      loadDebtsList(token),
    ]);

    if (studentsData) setStudents(studentsData);
    if (lessonsData) setUpcomingLessons(lessonsData);
    if (debtsData) setDebts(debtsData);
  }

  useEffect(() => {
    refreshDashboard();
  }, []);

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

  // POST /teacher/register - used by the "add student" modal
  async function handleCreateStudent() {
    setAddStudentError("");
    setAddStudentSuccess("");

    if (!newStudentEmail || !newStudentPassword || !newStudentFirstName || !newStudentLastName
      || !newStudentPhone || !newStudentHourlyRate || !newStudentEducationLevel) {
      setAddStudentError("Please fill in all required fields");
      return;
    }

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: newStudentEmail,
        password: newStudentPassword,
        firstName: newStudentFirstName,
        lastName: newStudentLastName,
        phone: newStudentPhone,
        hourlyRate: Number(newStudentHourlyRate),
        educationLevel: newStudentEducationLevel,
        notes: newStudentNotes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setAddStudentError(errorData.message || "Failed to add student");
      return;
    }

    setAddStudentSuccess("Student created successfully");
    setNewStudentEmail("");
    setNewStudentPassword("");
    setNewStudentFirstName("");
    setNewStudentLastName("");
    setNewStudentPhone("");
    setNewStudentHourlyRate("");
    setNewStudentEducationLevel("");
    setNewStudentNotes("");
    refreshDashboard();
  }

  async function handleLoadSubjects() {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    setSubjects(await response.json());
  }

  function handleOpenAddLessonModal() {
    setAddLessonError("");
    setShowAddLessonModal(true);
    if (subjects.length === 0) handleLoadSubjects();
  }

  // POST /teacher/lessons - used by the "add lesson" modal
  async function handleCreateLesson() {
    setAddLessonError("");

    if (!newLessonStudentId || !newLessonSubjectId || !newLessonDate || !newLessonStartTime || !newLessonEndTime) {
      setAddLessonError("Please fill in all fields");
      return;
    }

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentId: Number(newLessonStudentId),
        subjectId: Number(newLessonSubjectId),
        date: newLessonDate,
        startTime: newLessonStartTime,
        endTime: newLessonEndTime,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setAddLessonError(errorData.message || "Failed to create lesson");
      return;
    }

    setNewLessonStudentId("");
    setNewLessonSubjectId("");
    setNewLessonDate("");
    setNewLessonStartTime("");
    setNewLessonEndTime("");
    setShowAddLessonModal(false);
    refreshDashboard();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/teacher" links={teacherLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Teacher Dashboard</h1>
        <p className="text-slate-500 mt-1">Here's an overview of your students.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setAddStudentError("");
              setAddStudentSuccess("");
              setShowAddStudentModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Add student
          </button>
          <button
            onClick={handleOpenAddLessonModal}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Add lesson
          </button>
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

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming lessons</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingLessons.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500 text-center">No upcoming lessons.</p>
              )}
              {upcomingLessons.map((lesson) => (
                <div key={lesson.id} className="px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {formatDate(lesson.date)} {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                  </span>
                  <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                  <span className="text-slate-500 text-sm">
                    {lesson.studentFirstName} {lesson.studentLastName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Outstanding debt</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {debts.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500 text-center">No outstanding debt.</p>
              )}
              {debts.map((debt) => (
                <div key={debt.studentId} className="px-6 py-3 flex items-center justify-between gap-2">
                  <span className="text-slate-900 text-sm">
                    {debt.studentFirstName} {debt.studentLastName}
                  </span>
                  <span className="font-medium text-red-600 text-sm">₪{debt.debt}</span>
                </div>
              ))}
            </div>
          </div>
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
                You have no active students yet.
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

      {showAddStudentModal && (
        <Modal title="Add student" onClose={() => setShowAddStudentModal(false)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Password *</label>
                <input
                  type="text"
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">First name *</label>
                <input
                  value={newStudentFirstName}
                  onChange={(e) => setNewStudentFirstName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Last name *</label>
                <input
                  value={newStudentLastName}
                  onChange={(e) => setNewStudentLastName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Phone *</label>
                <input
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Hourly rate *</label>
                <input
                  value={newStudentHourlyRate}
                  onChange={(e) => setNewStudentHourlyRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Education level *</label>
                <input
                  value={newStudentEducationLevel}
                  onChange={(e) => setNewStudentEducationLevel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
                <input
                  value={newStudentNotes}
                  onChange={(e) => setNewStudentNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {addStudentError && <p className="text-sm text-red-600">{addStudentError}</p>}
            {addStudentSuccess && <p className="text-sm text-green-600">{addStudentSuccess}</p>}

            <button
              onClick={handleCreateStudent}
              className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Add student
            </button>
          </div>
        </Modal>
      )}

      {showAddLessonModal && (
        <Modal title="Add lesson" onClose={() => setShowAddLessonModal(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Student</label>
              <select
                value={newLessonStudentId}
                onChange={(e) => setNewLessonStudentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Subject</label>
              <select
                value={newLessonSubjectId}
                onChange={(e) => setNewLessonSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={newLessonDate}
                onChange={(e) => setNewLessonDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Start time</label>
                <input
                  type="time"
                  value={newLessonStartTime}
                  onChange={(e) => handleNewLessonStartTimeChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">End time</label>
                <input
                  type="time"
                  value={newLessonEndTime}
                  onChange={(e) => setNewLessonEndTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {addLessonError && <p className="text-sm text-red-600">{addLessonError}</p>}

            <button
              onClick={handleCreateLesson}
              className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Add lesson
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TeacherDashboard;
