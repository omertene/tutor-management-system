import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { decodeToken } from "../utils/jwt";
import { readErrorMessage } from "../utils/httpError";
import type { Subject, Student } from "../types";

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

const studentLinks = [
    { label: "Lessons", to: "/student/lessons" },
    { label: "Payments", to: "/student/payments" },
    { label: "Materials", to: "/student/materials" },
];

const statusStyles: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-slate-100 text-slate-500",
};

const studentStatusLabels: Record<string, string> = {
    SCHEDULED: "Upcoming",
    COMPLETED: "Done",
    CANCELLED: "Cancelled",
};

// "2026-08-17" -> "Today" / "Tomorrow" / "7/10/26", relative to the given today string
function formatRelativeLessonDate(date: string, todayStr: string): string {
    if (date === todayStr) return "Today";

    const today = new Date(`${todayStr}T00:00:00`);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`) {
        return "Tomorrow";
    }

    return formatLessonDate(date);
}

// "2026-10-07" -> "7/10/26"
function formatLessonDate(date: string): string {
    const [year, month, day] = date.split("-");
    return `${Number(day)}/${Number(month)}/${year.slice(2)}`;
}

// "18:00:00" -> "18:00"
function formatLessonTime(time: string): string {
    return time.slice(0, 5);
}

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2025-08-17" -> "2025-08" - zero-padded so plain string sort (used below to
// order the filter dropdown) matches chronological order. an unpadded "2025-8"
// would sort after "2025-10"/"2025-11"/"2025-12" ("1" < "8" lexicographically),
// pushing autumn months above summer ones in the list
function lessonMonthKey(date: string): string {
    const [year, month] = date.split("-");
    return `${year}-${month.padStart(2, "0")}`;
}

function monthLabel(key: string): string {
    const [year, month] = key.split("-").map(Number);
    return `${monthNames[month - 1]} ${year}`;
}

// today's date as "YYYY-MM-DD" using local date fields, not toISOString (which
// converts through UTC first and can shift the date by a day near midnight)
function todayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const STUDENT_MIN_CANCEL_NOTICE_HOURS = 6;


type Lesson = {
    id: number;
    studentFirstName: string;
    studentLastName: string;
    subjectName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    subjectId: number;
    priceAtBooking: number;
    notes: string;
}

const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTE_OPTIONS: string[] = ["00", "15", "30", "45"];

type TimeSelectProps = {
    value: string;
    onChange: (value: string) => void;
    className: string;
};

function TimeSelect({ value, onChange, className }: TimeSelectProps) {
    const [hour, minute] = value ? value.split(":") : ["", ""];

    function updateHour(newHour: string) {
        onChange(`${newHour}:${minute || "00"}`);
    }

    function updateMinute(newMinute: string) {
        onChange(`${hour || "00"}:${newMinute}`);
    }

    return (
        <div className="flex gap-1">
            <select value={hour} onChange={(e) => updateHour(e.target.value)} className={className}>
                <option value="">--</option>
                {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
            <select value={minute} onChange={(e) => updateMinute(e.target.value)} className={className}>
                <option value="">--</option>
                {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    );
}

function LessonsPage() {

    const token = localStorage.getItem("token")!;
    const {role} = decodeToken(token);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    const [showCancelledLessons, setShowCancelledLessons] = useState(false);

    // which lesson's "..." action menu is currently open (teacher, COMPLETED
    // lessons only) - null means none open. used instead of a plain red Cancel
    // button for completed lessons so voiding one takes a deliberate extra click
    const [openMenuLessonId, setOpenMenuLessonId] = useState<number | null>(null);

    // form fields shared by both roles - date/time default to today 08:00-09:00
    // instead of blank, since most bookings only need the student/subject changed
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [date, setDate] = useState(todayDateString());
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("09:00");

    // only used by the teacher's form
    const [selectedStudentId, setSelectedStudentId] = useState("");

    // inline "+ New subject..." creation from the teacher's booking dropdown, so
    // adding a subject on the fly doesn't require leaving this page
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState("");

    // filters for the lesson list below
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    // "YYYY-M" (e.g. "2025-8") or "ALL" - lets the teacher narrow the list down to
    // one specific month/year (any month, not just the current one), same idea as
    // the month filter on Statistics
    const [monthFilter, setMonthFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const LESSONS_PER_PAGE = 10;

    function handleStartTimeChange(value: string) {
        setStartTime(value);
        if (!value) return;
        const [hours, minutes] = value.split(":").map(Number);
        const endHours = (hours + 1) % 24;
        setEndTime(`${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    }

    async function handleLoadLessons() {

        setErrorMessage("");

        const endpoint = role === "TEACHER" ? "/teacher/lessons" : "/student/lessons";

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load lessons");
            return;
        }

        const data = await response.json();

        setLessons(data);
    }


    async function handleLoadSubjects() {
        setErrorMessage("");

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

    // teacher types a brand new subject name straight from the booking dropdown -
    // POST /subjects, then select it immediately so booking can continue without
    // a page navigation
    async function handleCreateSubjectInline() {
        const name = newSubjectName.trim();
        if (!name) return;

        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/subjects`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to add subject"));
            return;
        }

        const createdSubject = await response.json();
        setSubjects((current) => [...current, createdSubject]);
        setSelectedSubjectId(String(createdSubject.id));
        setNewSubjectName("");
        setIsAddingSubject(false);
    }

    async function handleLoadStudents() {
        setErrorMessage("");

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

    useEffect(() => {
        handleLoadLessons();
        handleLoadSubjects();
        if (role === "TEACHER") handleLoadStudents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, monthFilter]);

    // close the open "..." action menu on any click outside it
    useEffect(() => {
        if (openMenuLessonId === null) return;
        function handleClickAway() {
            setOpenMenuLessonId(null);
        }
        document.addEventListener("click", handleClickAway);
        return () => document.removeEventListener("click", handleClickAway);
    }, [openMenuLessonId]);

    // teacher books a lesson on behalf of a chosen student - POST /teacher/lessons
    async function handleCreateLessonForStudent() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                studentId: Number(selectedStudentId),
                subjectId: Number(selectedSubjectId),
                date,
                startTime,
                endTime,
            }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to create lesson"));
            return;
        }

        const createdLesson = await response.json();
        setLessons([...lessons, createdLesson]);
    }


    // a lesson can only be cancelled while SCHEDULED or (teacher-only) COMPLETED -
    // mirrors the backend rule in LessonService.cancelLesson, used to decide whether
    // to show the Cancel button at all
    function canCancelLesson(lesson: Lesson): boolean {
        if (lesson.status === "SCHEDULED") {
            if (role === "STUDENT") {
                const lessonStart = new Date(`${lesson.date}T${lesson.startTime}`);
                const minCancelTime = new Date();
                minCancelTime.setHours(minCancelTime.getHours() + STUDENT_MIN_CANCEL_NOTICE_HOURS);
                if (lessonStart < minCancelTime) return false;
            }
            return true;
        }
        if (lesson.status === "COMPLETED") return role === "TEACHER";
        return false;
    }

    async function handleCancelLesson(lesson: Lesson) {
        setErrorMessage("");

        if (lesson.status === "COMPLETED") {
            const confirmed = window.confirm(
                "Cancel this completed lesson? This will reverse its effect on debt and revenue."
            );
            if (!confirmed) return;
        }

        const response = await fetch(`${API_BASE_URL}/lessons/${lesson.id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to cancel lesson"));
            return;
        }

        const cancelledLesson = await response.json();
        setLessons(lessons.map((l) => l.id === lesson.id ? cancelledLesson : l));
    }

    // teacher marks a lesson as completed, so it counts toward the student's debt -
    // PATCH /teacher/lessons/{id}/complete
    async function handleCompleteLesson(lessonId: number) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/lessons/${lessonId}/complete`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to complete lesson"));
            return;
        }

        const completedLesson = await response.json();
        setLessons(lessons.map((lesson) => lesson.id == lessonId ? completedLesson : lesson));
    }

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "text-sm font-medium text-slate-700";
    const primaryButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors";
    const smallSecondaryButtonClass = "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors";

    // every "YYYY-M" that actually has a lesson on it, newest first - built from
    // the teacher's own lessons rather than a fixed list, so only real months show up
    const availableMonths = Array.from(new Set(lessons.map((lesson) => lessonMonthKey(lesson.date))))
        .sort()
        .reverse();

    const filteredLessons = lessons
        .filter((lesson) => statusFilter === "ALL" || lesson.status === statusFilter)
        .filter((lesson) => monthFilter === "ALL" || lessonMonthKey(lesson.date) === monthFilter)
        .filter((lesson) => {
            if (!searchQuery.trim()) return true;
            const fullName = `${lesson.studentFirstName} ${lesson.studentLastName}`.toLowerCase();
            return fullName.includes(searchQuery.trim().toLowerCase())
                || lesson.subjectName.toLowerCase().includes(searchQuery.trim().toLowerCase());
        })
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    const totalPages = Math.max(1, Math.ceil(filteredLessons.length / LESSONS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const visibleLessons = filteredLessons.slice(
        (safePage - 1) * LESSONS_PER_PAGE,
        safePage * LESSONS_PER_PAGE
    );

    const today = todayDateString();
    const nowTimeString = new Date().toTimeString().slice(0, 8);
    const upcomingLessons = lessons
        .filter((lesson) => lesson.status === "SCHEDULED")
        .filter((lesson) => lesson.date > today || (lesson.date === today && lesson.startTime > nowTimeString))
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    const completedLessons = lessons
        .filter((lesson) => lesson.status === "COMPLETED")
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
    const cancelledLessons = lessons
        .filter((lesson) => lesson.status === "CANCELLED")
        .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={role === "TEACHER" ? "/teacher" : "/student"} links={role === "TEACHER" ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Lessons</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {role === "TEACHER" && (
                    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Book a lesson for a student</h2>

                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Student</label>
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className={inputClass}
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
                                <label className={labelClass}>Subject</label>
                                {isAddingSubject ? (
                                    <div className="flex gap-1">
                                        <input
                                            autoFocus
                                            value={newSubjectName}
                                            onChange={(e) => setNewSubjectName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleCreateSubjectInline()}
                                            placeholder="New subject name"
                                            className={inputClass}
                                        />
                                        <button onClick={handleCreateSubjectInline} className={smallSecondaryButtonClass}>
                                            Add
                                        </button>
                                        <button
                                            onClick={() => { setIsAddingSubject(false); setNewSubjectName(""); }}
                                            className="px-2 text-slate-400 hover:text-slate-600"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={selectedSubjectId}
                                        onChange={(e) => {
                                            if (e.target.value === "__new__") {
                                                setIsAddingSubject(true);
                                                return;
                                            }
                                            setSelectedSubjectId(e.target.value);
                                        }}
                                        className={inputClass}
                                    >
                                        <option value="">Select subject</option>
                                        {subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </option>
                                        ))}
                                        <option value="__new__">+ New subject...</option>
                                    </select>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Date</label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Start time</label>
                                <TimeSelect value={startTime} onChange={handleStartTimeChange} className={inputClass} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>End time</label>
                                <TimeSelect value={endTime} onChange={setEndTime} className={inputClass} />
                            </div>

                            <button onClick={handleCreateLessonForStudent} className={primaryButtonClass}>
                                Book lesson
                            </button>
                        </div>
                    </div>
                )}

                {/* students book lessons interactively on the Schedule calendar (see
                    StudentDashboard / StudentScheduleGrid) - this page focuses on
                    showing their upcoming/completed/cancelled lessons instead of
                    duplicating the booking form here */}

                {role === "TEACHER" && (
                    <div className="mt-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <h2 className="text-lg font-semibold text-slate-900">Your lessons</h2>
                            <div className="flex flex-wrap gap-2">
                                <input
                                    type="text"
                                    placeholder="Search by student or subject..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={inputClass}
                                />
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
                                    <option value="ALL">All statuses</option>
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={inputClass}>
                                    <option value="ALL">All months</option>
                                    {availableMonths.map((key) => (
                                        <option key={key} value={key}>{monthLabel(key)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                            {visibleLessons.length === 0 && (
                                <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                    {lessons.length === 0 ? "No lessons yet." : "No lessons match your search."}
                                </p>
                            )}

                            {visibleLessons.map((lesson) => (
                                <div key={lesson.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-slate-900">
                                            {formatLessonDate(lesson.date)} {formatLessonTime(lesson.startTime)}-{formatLessonTime(lesson.endTime)}
                                        </span>
                                        <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                        <span className="text-slate-500 text-sm">
                                            {lesson.studentFirstName} {lesson.studentLastName}
                                        </span>
                                        <span className="text-slate-500 text-sm">
                                            ₪{lesson.priceAtBooking}
                                        </span>
                                        <span
                                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[lesson.status] ?? "bg-slate-100 text-slate-500"}`}
                                        >
                                            {lesson.status}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 relative">
                                        {lesson.status === "SCHEDULED" && (
                                            <button onClick={() => handleCompleteLesson(lesson.id)} className={smallSecondaryButtonClass}>
                                                Mark completed
                                            </button>
                                        )}
                                        {/* SCHEDULED lessons keep a plain Cancel button - cancelling before the
                                            lesson happened is routine. COMPLETED lessons already count toward
                                            revenue/debt, so voiding one lives behind a small "..." menu instead
                                            of a primary red button, to avoid accidental clicks on real income */}
                                        {lesson.status === "SCHEDULED" && canCancelLesson(lesson) && (
                                            <button
                                                onClick={() => handleCancelLesson(lesson)}
                                                className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        {lesson.status === "COMPLETED" && canCancelLesson(lesson) && (
                                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setOpenMenuLessonId(openMenuLessonId === lesson.id ? null : lesson.id)}
                                                    title="More actions"
                                                    aria-label="More actions"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                >
                                                    &#8942;
                                                </button>
                                                {openMenuLessonId === lesson.id && (
                                                    <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-md py-1 w-44">
                                                        <button
                                                            onClick={() => {
                                                                setOpenMenuLessonId(null);
                                                                handleCancelLesson(lesson);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            Void / Cancel Lesson
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredLessons.length > 0 && (
                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-sm text-slate-500">
                                    Showing {(safePage - 1) * LESSONS_PER_PAGE + 1}-{Math.min(safePage * LESSONS_PER_PAGE, filteredLessons.length)} of {filteredLessons.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={safePage === 1}
                                        className={`${smallSecondaryButtonClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        &larr; Previous
                                    </button>
                                    <span className="text-sm text-slate-500">Page {safePage} of {totalPages}</span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={safePage === totalPages}
                                        className={`${smallSecondaryButtonClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        Next &rarr;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {role === "STUDENT" && (
                    <div className="mt-8 flex flex-col gap-8">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 mb-3">Upcoming</h2>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                {upcomingLessons.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No upcoming lessons. Book one from the Schedule tab!</p>
                                )}
                                {upcomingLessons.map((lesson) => (
                                    <div key={lesson.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-slate-900">
                                                {formatRelativeLessonDate(lesson.date, today)} {formatLessonTime(lesson.startTime)}-{formatLessonTime(lesson.endTime)}
                                            </span>
                                            <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                            <span className="text-slate-500 text-sm">₪{lesson.priceAtBooking}</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[lesson.status]}`}>
                                                {studentStatusLabels[lesson.status]}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleCancelLesson(lesson)}
                                            disabled={!canCancelLesson(lesson)}
                                            title={canCancelLesson(lesson) ? undefined : `Can't be cancelled within ${STUDENT_MIN_CANCEL_NOTICE_HOURS} hours of the start time.`}
                                            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 mb-3">Completed</h2>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                {completedLessons.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No completed lessons yet.</p>
                                )}
                                {completedLessons.map((lesson) => (
                                    <div key={lesson.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-slate-900">
                                                {formatLessonDate(lesson.date)} {formatLessonTime(lesson.startTime)}-{formatLessonTime(lesson.endTime)}
                                            </span>
                                            <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                            <span className="text-slate-500 text-sm">₪{lesson.priceAtBooking}</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[lesson.status]}`}>
                                                {studentStatusLabels[lesson.status]}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {cancelledLessons.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setShowCancelledLessons((v) => !v)}
                                    className="text-sm text-slate-400 hover:text-slate-600"
                                >
                                    {showCancelledLessons ? "Hide" : "Show"} {cancelledLessons.length} cancelled
                                </button>
                                {showCancelledLessons && (
                                    <div className="mt-3 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                                        {cancelledLessons.map((lesson) => (
                                            <div key={lesson.id} className="px-4 py-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                                                <span>
                                                    {formatLessonDate(lesson.date)} {formatLessonTime(lesson.startTime)}-{formatLessonTime(lesson.endTime)}
                                                </span>
                                                <span>{lesson.subjectName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default LessonsPage;
