import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import Modal from "../components/Modal";
import AddStudentModal from "../components/AddStudentModal";
import TimeSelect from "../components/TimeSelect";
import { readErrorMessage } from "../utils/httpError";
import { timeToMinutes, toDateString } from "../utils/time";
import type { Student, Subject } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
  { label: "Students", to: "/teacher/register" },
  { label: "Schedule", to: "/teacher/schedule-rules" },
  { label: "Lessons", to: "/teacher/lessons" },
  { label: "Payments", to: "/teacher/payments" },
  { label: "Materials", to: "/teacher/materials" },
  { label: "Statistics", to: "/teacher/statistics" },
  { label: "Settings", to: "/teacher/settings" },
];

type Lesson = {
  id: number;
  studentId: number;
  studentFirstName: string;
  studentLastName: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

function formatHours(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

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

  const [studentsThisMonthCount, setStudentsThisMonthCount] = useState(0);
  const [lessonsThisWeekCount, setLessonsThisWeekCount] = useState(0);
  const [minutesThisWeek, setMinutesThisWeek] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);

  const [needsCompletionPage, setNeedsCompletionPage] = useState(0);
  const NEEDS_COMPLETION_PAGE_SIZE = 3;

  const [debtPage, setDebtPage] = useState(0);
  const DEBT_PAGE_SIZE = 5;

  // "add student" modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

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

  async function loadLessonsData(token: string | null): Promise<{ upcoming: Lesson[]; needsCompletion: Lesson[]; thisWeekCount: number; thisWeekMinutes: number; studentsThisMonth: number } | null> {
    const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const data: Lesson[] = await response.json();
    const todayDate = toDateString(new Date());
    const tomorrowDate = toDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const scheduled = data.filter((lesson) => lesson.status === "SCHEDULED");

    // "today" and "tomorrow" only - a full week list just duplicates the Schedule
    // page, and at a normal booking pace it would rarely show past tomorrow anyway
    const upcoming = scheduled
      .filter((lesson) => lesson.date === todayDate || lesson.date === tomorrowDate)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const needsCompletion = scheduled
      .filter((lesson) => lesson.date < todayDate)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfWeekDate = toDateString(startOfWeek);
    const endOfWeekDate = toDateString(endOfWeek);

    const thisWeekLessons = data.filter(
      (lesson) => lesson.status !== "CANCELLED" && lesson.date >= startOfWeekDate && lesson.date <= endOfWeekDate
    );
    const thisWeekCount = thisWeekLessons.length;
    const thisWeekMinutes = thisWeekLessons.reduce(
      (total, lesson) => total + (timeToMinutes(lesson.endTime) - timeToMinutes(lesson.startTime)),
      0
    );

    // distinct students with a lesson (past or upcoming) somewhere in the current
    // calendar month - cancelled lessons don't count, since a cancelled lesson means
    // that student wasn't actually taught. this is a better "who am I teaching right
    // now" number than a manually-toggled active/inactive flag would give
    const monthStr = todayDate.slice(0, 7);
    const studentsThisMonth = new Set(
      data
        .filter((lesson) => lesson.status !== "CANCELLED" && lesson.date.slice(0, 7) === monthStr)
        .map((lesson) => lesson.studentId)
    ).size;

    return { upcoming, needsCompletion, thisWeekCount, thisWeekMinutes, studentsThisMonth };
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
    }
    if (lessonsData) {
      setUpcomingLessons(lessonsData.upcoming);
      setNeedsCompletionLessons(lessonsData.needsCompletion);
      setNeedsCompletionPage(0);
      setLessonsThisWeekCount(lessonsData.thisWeekCount);
      setMinutesThisWeek(lessonsData.thisWeekMinutes);
      setStudentsThisMonthCount(lessonsData.studentsThisMonth);
    }
    if (debtsData) {
      setDebts(debtsData);
      setDebtPage(0);
    }
    if (revenueData !== null) setRevenueThisMonth(revenueData);
  }

  useEffect(() => {
    refreshDashboard();
  }, []);

  // POST /teacher/register - used by the "add student" modal
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
      setAddLessonError(await readErrorMessage(response, "Failed to create lesson"));
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

  // these are still-SCHEDULED lessons, so cancelling is a plain soft-cancel with no
  // confirm needed (same as everywhere else a SCHEDULED lesson gets cancelled) -
  // confirmation only matters when reversing an already-COMPLETED lesson's debt/revenue
  async function handleCancelLesson(lessonId: number) {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;
    refreshDashboard();
  }

  const todayDate = toDateString(new Date());
  const todaysLessons = upcomingLessons.filter((lesson) => lesson.date === todayDate);
  const tomorrowsLessons = upcomingLessons.filter((lesson) => lesson.date !== todayDate);

  const needsCompletionTotalPages = Math.max(1, Math.ceil(needsCompletionLessons.length / NEEDS_COMPLETION_PAGE_SIZE));
  const needsCompletionPageItems = needsCompletionLessons.slice(
    needsCompletionPage * NEEDS_COMPLETION_PAGE_SIZE,
    (needsCompletionPage + 1) * NEEDS_COMPLETION_PAGE_SIZE
  );

  const debtTotalPages = Math.max(1, Math.ceil(debts.length / DEBT_PAGE_SIZE));
  const debtPageItems = debts.slice(debtPage * DEBT_PAGE_SIZE, (debtPage + 1) * DEBT_PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/teacher" links={teacherLinks} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Teacher Dashboard</h1>
        <p className="text-slate-500 mt-1">Here's an overview of your students.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowAddStudentModal(true)}
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
            <p className="text-sm text-slate-500">Revenue this month</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">₪{revenueThisMonth}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
            <p className="text-sm text-slate-500">Lessons this week</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {lessonsThisWeekCount} <span className="text-base font-normal text-slate-400">&middot; {formatHours(minutesThisWeek)} hrs</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
            <p className="text-sm text-slate-500">Students this month</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{studentsThisMonthCount}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="lg:order-2 bg-white rounded-xl border border-slate-200 shadow-sm">
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
              <h2 className="text-lg font-semibold text-slate-900">Tomorrow</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {tomorrowsLessons.length === 0 && (
                <p className="px-6 py-6 text-sm text-slate-500 text-center">No lessons tomorrow.</p>
              )}
              {tomorrowsLessons.map((lesson) => (
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

          <div className="lg:order-1 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Outstanding debt</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {debts.length === 0 && (
                  <p className="px-6 py-6 text-sm text-slate-500 text-center">No outstanding debt.</p>
                )}
                {debtPageItems.map((debt) => (
                  <div key={debt.studentId} className="px-6 py-3 flex items-center justify-between gap-2">
                    <span className="text-slate-900 text-sm">
                      {debt.studentFirstName} {debt.studentLastName}
                    </span>
                    <span className="font-medium text-red-600 text-sm">₪{debt.debt}</span>
                  </div>
                ))}
              </div>
              {debts.length > DEBT_PAGE_SIZE && (
                <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setDebtPage((page) => Math.max(0, page - 1))}
                    disabled={debtPage === 0}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-slate-300 disabled:cursor-default"
                  >
                    &larr; Previous
                  </button>
                  <span className="text-xs text-slate-400">
                    Page {debtPage + 1} of {debtTotalPages}
                  </span>
                  <button
                    onClick={() => setDebtPage((page) => Math.min(debtTotalPages - 1, page + 1))}
                    disabled={debtPage >= debtTotalPages - 1}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-slate-300 disabled:cursor-default"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Needs completion</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {needsCompletionLessons.length === 0 && (
                  <p className="px-6 py-6 text-sm text-slate-500 text-center">Nothing to mark.</p>
                )}
                {needsCompletionPageItems.map((lesson) => (
                  <div key={lesson.id} className="px-6 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-900 text-sm font-medium">
                        {formatDate(lesson.date)} {formatTime(lesson.startTime)}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {lesson.studentFirstName} {lesson.studentLastName}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCompleteLesson(lesson.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Mark completed
                      </button>
                      <button
                        onClick={() => handleCancelLesson(lesson.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {needsCompletionLessons.length > NEEDS_COMPLETION_PAGE_SIZE && (
                <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setNeedsCompletionPage((page) => Math.max(0, page - 1))}
                    disabled={needsCompletionPage === 0}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-slate-300 disabled:cursor-default"
                  >
                    &larr; Previous
                  </button>
                  <span className="text-xs text-slate-400">
                    Page {needsCompletionPage + 1} of {needsCompletionTotalPages}
                  </span>
                  <button
                    onClick={() => setNeedsCompletionPage((page) => Math.min(needsCompletionTotalPages - 1, page + 1))}
                    disabled={needsCompletionPage >= needsCompletionTotalPages - 1}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-slate-300 disabled:cursor-default"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showAddStudentModal && (
        <AddStudentModal
          onClose={() => setShowAddStudentModal(false)}
          onCreated={refreshDashboard}
        />
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
                <TimeSelect
                  value={newLessonStartTime}
                  onChange={handleNewLessonStartTimeChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">End time</label>
                <TimeSelect
                  value={newLessonEndTime}
                  onChange={setNewLessonEndTime}
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
