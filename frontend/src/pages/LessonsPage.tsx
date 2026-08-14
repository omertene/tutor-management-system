import { useState } from "react";
import NavBar from "../components/NavBar";
import { decodeToken } from "../utils/jwt";
import type { Subject, Student } from "../types";

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

    // form fields shared by both roles
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    // only used by the teacher's form
    const [selectedStudentId, setSelectedStudentId] = useState("");

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

    // student books a lesson for themselves - POST /student/lessons
    async function handleCreateLessonAsStudent() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/student/lessons`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                subjectId: Number(selectedSubjectId),
                date,
                startTime,
                endTime,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to create lesson");
            return;
        }

        const createdLesson = await response.json();
        setLessons([...lessons, createdLesson]);
    }

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
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to create lesson");
            return;
        }

        const createdLesson = await response.json();
        setLessons([...lessons, createdLesson]);
    }


    async function handleCancleLesson(lessonId: number) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to cancle lesson");
            return;
        }

        const canclledLesson = await response.json();
        setLessons(lessons.map((lesson) => lesson.id == lessonId ? canclledLesson : lesson));
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
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to complete lesson");
            return;
        }

        const completedLesson = await response.json();
        setLessons(lessons.map((lesson) => lesson.id == lessonId ? completedLesson : lesson));
    }

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const primaryButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors";
    const secondaryButtonClass = "px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors";
    const smallSecondaryButtonClass = "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={role === "TEACHER" ? "/teacher" : "/student"} links={role === "TEACHER" ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Lessons</h1>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={handleLoadSubjects} className={secondaryButtonClass}>
                        Load subjects
                    </button>
                    {role === "TEACHER" && (
                        <button onClick={handleLoadStudents} className={secondaryButtonClass}>
                            Load students
                        </button>
                    )}
                    <button onClick={handleLoadLessons} className={secondaryButtonClass}>
                        Show all lessons
                    </button>
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {role === "TEACHER" && (
                    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Book a lesson for a student</h2>

                        <div className="flex flex-wrap gap-3 items-center">
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

                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select subject</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </select>

                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                            <TimeSelect value={startTime} onChange={handleStartTimeChange} className={inputClass} />
                            <TimeSelect value={endTime} onChange={setEndTime} className={inputClass} />

                            <button onClick={handleCreateLessonForStudent} className={primaryButtonClass}>
                                Book lesson
                            </button>
                        </div>
                    </div>
                )}

                {role === "STUDENT" && (
                    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Book a lesson</h2>

                        <div className="flex flex-wrap gap-3 items-center">
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select subject</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </select>

                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                            <TimeSelect value={startTime} onChange={handleStartTimeChange} className={inputClass} />
                            <TimeSelect value={endTime} onChange={setEndTime} className={inputClass} />

                            <button onClick={handleCreateLessonAsStudent} className={primaryButtonClass}>
                                Book lesson
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Your lessons</h2>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {lessons.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                No lessons loaded yet. Click "Show all lessons" above.
                            </p>
                        )}

                        {lessons.map((lesson) => (
                            <div key={lesson.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-900">
                                        {lesson.date} {lesson.startTime}-{lesson.endTime}
                                    </span>
                                    <span className="text-slate-500 text-sm">{lesson.subjectName}</span>
                                    <span className="text-slate-500 text-sm">
                                        {lesson.studentFirstName} {lesson.studentLastName}
                                    </span>
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[lesson.status] ?? "bg-slate-100 text-slate-500"}`}
                                    >
                                        {lesson.status}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    {role === "TEACHER" && lesson.status === "SCHEDULED" && (
                                        <button onClick={() => handleCompleteLesson(lesson.id)} className={smallSecondaryButtonClass}>
                                            Mark completed
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleCancleLesson(lesson.id)}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default LessonsPage;
