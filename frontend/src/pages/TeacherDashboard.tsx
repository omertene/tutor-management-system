import { useEffect, useState } from "react";
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

  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [needsCompletionLessons, setNeedsCompletionLessons] = useState<Lesson[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const [activeStudentCount, setActiveStudentCount] = useState(0);
  const [lessonsThisWeekCount, setLessonsThisWeekCount] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);

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

  async function loadLessonsData(token: string | null): Promise<{ upcoming: Lesson[]; needsCompletion: Lesson[]; thisWeekCount: number } | null> {
    const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const data: Lesson[] = await response.json();
    const todayDate = new Date().toISOString().slice(0, 10);
    const scheduled = data.filter((lesson) => lesson.status === "SCHEDULED");

    const upcoming = scheduled
      .filter((lesson) => lesson.date >= todayDate)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 5);

    const needsCompletion = scheduled
      .filter((lesson) => lesson.date < todayDate)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfWeekDate = startOfWeek.toISOString().slice(0, 10);
    const endOfWeekDate = endOfWeek.toISOString().slice(0, 10);

    const thisWeekCount = data.filter(
      (lesson) => lesson.status !== "CANCELLED" && lesson.date >= startOfWeekDate && lesson.date <= endOfWeekDate
    ).length;

    return { upcoming, needsCompletion, thisWeekCount };
  }

  async function loadDebtsList(token: string | null): Promise<Debt[] | null> {
    const response = await fetch(`${API_BASE_URL}/teacher/debts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const data: Debt[] = await response.json();
    return data.filter((debt) => debt.debt > 0);
  }

  async function loadRevenueThisMonth(token: string | null): Promise<number | null> {
    const response = await fetch(`${API_BASE_URL}/teacher/revenue/current-month`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  }

  async function refreshDashboard() {
    const token = localStorage.getItem("token");

    const [studentsData, lessonsData, debtsData, revenueData] = await Promise.all([
      loadStudentsList(token),
      loadLessonsData(token),
      loadDebtsList(token),
      loadRevenueThisMonth(token),
    ]);

    if (studentsData) {
      setStudents(studentsData);
      setActiveStudentCount(studentsData.filter((student) => student.active).length);
    }
    if (lessonsData) {
      setUpcomingLessons(lessonsData.upcoming);
      setNeedsCompletionLessons(lessonsData.needsCompletion);
      setLessonsThisWeekCount(lessonsData.thisWeekCount);
    }
    if (debtsData) setDebts(debtsData);
    if (revenueData !== null) setRevenueThisMonth(revenueData);
  }

  useEffect(() => {
    refreshDashboard();
  }, []);

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

  async function handleCompleteLesson(lessonId: number) {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/lessons/${lessonId}/complete`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;
    refreshDashboard();
  }

  const todayDate = new Date().toISOString().slice(0, 10);
  const todaysLessons = upcomingLessons.filter((lesson) => lesson.date === todayDate);
  const restOfWeekLessons = upcomingLessons.filter((lesson) => lesson.date !== todayDate);

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
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
            <p className="text-sm text-slate-500">Active students</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{activeStudentCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
            <p className="text-sm text-slate-500">Lessons this week</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{lessonsThisWeekCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
            <p className="text-sm text-slate-500">Revenue this month</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">₪{revenueThisMonth}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Today</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {todaysLessons.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500 text-center">No lessons today.</p>
              )}
              {todaysLessons.map((lesson) => (
                <div key={lesson.id} className="px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                  </span>
                  <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                  <span className="text-slate-500 text-sm">
                    {lesson.studentFirstName} {lesson.studentLastName}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-b border-t border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming this week</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {restOfWeekLessons.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500 text-center">No other upcoming lessons.</p>
              )}
              {restOfWeekLessons.map((lesson) => (
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

          <div className="flex flex-col gap-6">
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

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Needs completion</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {needsCompletionLessons.length === 0 && (
                  <p className="px-6 py-6 text-sm text-slate-500 text-center">Nothing to mark.</p>
                )}
                {needsCompletionLessons.map((lesson) => (
                  <div key={lesson.id} className="px-6 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-900 text-sm font-medium">
                        {formatDate(lesson.date)} {formatTime(lesson.startTime)}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {lesson.studentFirstName} {lesson.studentLastName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCompleteLesson(lesson.id)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors self-start"
                    >
                      Mark completed
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
