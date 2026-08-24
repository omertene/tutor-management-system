import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import ListPager from "../components/ListPager";
import BookLessonForm from "../components/lessons/BookLessonForm";
import TeacherLessonRow from "../components/lessons/TeacherLessonRow";
import StudentLessonSections from "../components/lessons/StudentLessonSections";
import { useLessons } from "../hooks/useLessons";
import { usePagination } from "../hooks/usePagination";
import { decodeToken } from "../utils/jwt";
import { inputClass } from "../constants/formStyles";
import { monthNames, todayDateString } from "../utils/time";
import { lessonMonthKey } from "../types/lesson";
import { studentLinks, teacherLinks } from "../constants/navLinks";

const LESSONS_PER_PAGE = 10;

// "2025-08" -> "Aug 2025"
function monthLabel(key: string): string {
    const [year, month] = key.split("-").map(Number);
    return `${monthNames[month - 1]} ${year}`;
}

function LessonsPage() {
    // ProtectedRoute guarantees a token before this page renders; the ?? "" keeps
    // decodeToken's signature honest and its try/catch handles a malformed value
    const token = localStorage.getItem("token") ?? "";
    const { role } = decodeToken(token);
    const isTeacher = role === "TEACHER";

    const {
        lessons, subjects, students,
        errorMessage,
        createLesson, createSubject,
        canCancelLesson, cancelLesson, completeLesson,
    } = useLessons(role);

    // which lesson's "..." action menu is currently open (teacher, COMPLETED
    // lessons only) - null means none open. used instead of a plain red Cancel
    // button for completed lessons so voiding one takes a deliberate extra click
    const [openMenuLessonId, setOpenMenuLessonId] = useState<number | null>(null);

    // filters for the teacher's lesson list
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    // "YYYY-MM" or "ALL" - lets the teacher narrow the list down to one specific
    // month/year (any month, not just the current one), same idea as on Statistics
    const [monthFilter, setMonthFilter] = useState("ALL");

    // close the open "..." action menu on any click outside it
    useEffect(() => {
        if (openMenuLessonId === null) return;
        function handleClickAway() {
            setOpenMenuLessonId(null);
        }
        document.addEventListener("click", handleClickAway);
        return () => document.removeEventListener("click", handleClickAway);
    }, [openMenuLessonId]);

    // every "YYYY-MM" that actually has a lesson on it, newest first - built from
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

    const { page, totalPages, visibleItems, setPage } = usePagination(
        filteredLessons,
        LESSONS_PER_PAGE,
        `${searchQuery}|${statusFilter}|${monthFilter}`
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
            <NavBar homePath={isTeacher ? "/teacher" : "/student"} links={isTeacher ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Lessons</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {isTeacher && (
                    <BookLessonForm
                        students={students}
                        subjects={subjects}
                        onBook={createLesson}
                        onCreateSubject={createSubject}
                    />
                )}

                {/* students book lessons interactively on the Schedule calendar (see
                    StudentDashboard / StudentScheduleGrid) - this page focuses on
                    showing their upcoming/completed/cancelled lessons instead of
                    duplicating the booking form here */}

                {isTeacher && (
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
                            {visibleItems.length === 0 && (
                                <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                    {lessons.length === 0 ? "No lessons yet." : "No lessons match your search."}
                                </p>
                            )}

                            {visibleItems.map((lesson) => (
                                <TeacherLessonRow
                                    key={lesson.id}
                                    lesson={lesson}
                                    canCancel={canCancelLesson(lesson)}
                                    isMenuOpen={openMenuLessonId === lesson.id}
                                    onToggleMenu={() => setOpenMenuLessonId(openMenuLessonId === lesson.id ? null : lesson.id)}
                                    onCloseMenu={() => setOpenMenuLessonId(null)}
                                    onComplete={completeLesson}
                                    onCancel={cancelLesson}
                                />
                            ))}
                        </div>

                        {filteredLessons.length > 0 && (
                            <ListPager
                                page={page}
                                totalPages={totalPages}
                                totalItems={filteredLessons.length}
                                perPage={LESSONS_PER_PAGE}
                                onChange={setPage}
                            />
                        )}
                    </div>
                )}

                {!isTeacher && (
                    <StudentLessonSections
                        upcoming={upcomingLessons}
                        completed={completedLessons}
                        cancelled={cancelledLessons}
                        today={today}
                        canCancel={canCancelLesson}
                        onCancel={cancelLesson}
                    />
                )}
            </main>
        </div>
    );
}

export default LessonsPage;
