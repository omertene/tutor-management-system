import { useEffect, useMemo, useState } from "react";
import NavBar from "../components/NavBar";
import Modal from "../components/Modal";
import TimeSelect from "../components/TimeSelect";
import WeekGrid from "../components/WeekGrid";
import ScheduleRulesModal from "../components/ScheduleRulesModal";
import { sortRules } from "../types/schedule";
import type { ScheduleRule, ScheduleOverride } from "../types/schedule";
import { apiFetch, readErrorMessage } from "../utils/api";
import { inputClassFull, labelClass } from "../constants/formStyles";
import { teacherLinks } from "../constants/navLinks";
import {
    days,
    DEFAULT_HOUR_START, DEFAULT_HOUR_END, ROW_HEIGHT,
    addOneHour, getStartOfWeek, toDateString, timeToMinutes, minutesSinceMidnight,
} from "../utils/time";

type Lesson = {
    id: number;
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    subjectName: string;
    subjectId: number;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    notes: string | null;
};

type Student = {
    id: number;
    firstName: string;
    lastName: string;
};

type Subject = {
    id: number;
    name: string;
};

// a lesson can only be marked completed once it's actually started - matches the
// backend check in LessonService.completeLesson
function hasLessonStarted(lesson: Lesson): boolean {
    const [year, month, day] = lesson.date.split("-").map(Number);
    const [hours, minutes] = lesson.startTime.slice(0, 5).split(":").map(Number);
    const lessonStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return lessonStart <= new Date();
}

function SchedulePage() {
    const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
    const [hourStart, setHourStart] = useState(DEFAULT_HOUR_START);
    const [hourEnd, setHourEnd] = useState(DEFAULT_HOUR_END);
    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [showRulesModal, setShowRulesModal] = useState(false);

    // shown when clicking a cell - lets the teacher choose to book a lesson there or
    // block/add-availability instead. chooseActionIsUnavailable picks which pair of
    // options is shown (book+block for available cells, book+add for unavailable ones)
    const [chooseActionDate, setChooseActionDate] = useState<string | null>(null);
    const [chooseActionStartTime, setChooseActionStartTime] = useState("");
    const [chooseActionEndTime, setChooseActionEndTime] = useState("");
    const [chooseActionIsUnavailable, setChooseActionIsUnavailable] = useState(false);

    // "add override" popup, opened by clicking an unavailable cell (always ADD, no
    // type choice needed), or choosing "Block this time" from the choose-action popup
    const [addOverrideDate, setAddOverrideDate] = useState<string | null>(null);
    const [addOverrideStartTime, setAddOverrideStartTime] = useState("");
    const [addOverrideEndTime, setAddOverrideEndTime] = useState("");
    const [addOverrideType, setAddOverrideType] = useState("BLOCK");
    const [addOverrideTypeLocked, setAddOverrideTypeLocked] = useState(false);
    const [addOverrideNote, setAddOverrideNote] = useState("");
    const [addOverrideError, setAddOverrideError] = useState("");
    const [editingOverrideId, setEditingOverrideId] = useState<number | null>(null);

    // "add lesson" popup, opened by choosing "Book a lesson" from the choose-action popup -
    // also reused for editing an existing lesson, in which case editingLessonId is set
    const [addLessonDate, setAddLessonDate] = useState<string | null>(null);
    const [addLessonStartTime, setAddLessonStartTime] = useState("");
    const [addLessonEndTime, setAddLessonEndTime] = useState("");
    const [addLessonStudentId, setAddLessonStudentId] = useState("");
    const [addLessonSubjectId, setAddLessonSubjectId] = useState("");
    const [addLessonError, setAddLessonError] = useState("");
    const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
    const [bookingOutsideHours, setBookingOutsideHours] = useState(false);

    // viewing/deleting an existing override, opened by clicking a colored cell
    const [viewingOverride, setViewingOverride] = useState<ScheduleOverride | null>(null);

    // viewing a lesson block, opened by clicking it
    const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);

    // the notes textarea's own draft value, kept separate from viewingLesson.notes so
    // typing doesn't need to round-trip through a lesson-list update on every keystroke -
    // reset to the lesson's saved notes each time a different lesson is opened
    const [notesDraft, setNotesDraft] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // drag-to-select a multi-hour range across cells in the same day column
    const [dragDayIndex, setDragDayIndex] = useState<number | null>(null);
    const [dragStartHour, setDragStartHour] = useState<number | null>(null);
    const [dragCurrentHour, setDragCurrentHour] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    async function loadRules() {
        const response = await apiFetch(`/teacher/schedule-rules`);
        if (!response.ok) return;
        const data: ScheduleRule[] = await response.json();
        setScheduleRules(sortRules(data));
    }

    async function loadOverrides() {
        const response = await apiFetch(`/teacher/schedule-overrides`);
        if (!response.ok) return;
        const data: ScheduleOverride[] = await response.json();
        setScheduleOverrides(data);
    }

    async function loadLessons() {
        const response = await apiFetch(`/teacher/lessons`);
        if (!response.ok) return;
        const data: Lesson[] = await response.json();
        setLessons(data.filter((lesson) => lesson.status !== "CANCELLED"));
    }

    async function loadStudents() {
        const response = await apiFetch(`/teacher/students`);
        if (!response.ok) return;
        const data: Student[] = await response.json();
        setStudents(data);
    }

    async function loadSubjects() {
        const response = await apiFetch(`/subjects`);
        if (!response.ok) return;
        const data: Subject[] = await response.json();
        setSubjects(data);
    }

    useEffect(() => {
        loadRules();
        loadOverrides();
        loadLessons();
        loadStudents();
        loadSubjects();
    }, []);

    useEffect(() => {
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [isDragging, dragDayIndex, dragStartHour, dragCurrentHour]);

    const weekDates = useMemo(() => {
        return days.map((_, index) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);
            return date;
        });
    }, [weekStart]);

    const todayDayIndex = weekDates.findIndex((date) => toDateString(date) === toDateString(now));

    const nowMinutes = minutesSinceMidnight(now);
    const nowLineTop = ((nowMinutes - hourStart * 60) / 60) * ROW_HEIGHT;
    const showNowLine = todayDayIndex !== -1 && nowMinutes >= hourStart * 60 && nowMinutes <= hourEnd * 60;

    const hours = useMemo(() => {
        const result: number[] = [];
        for (let hour = hourStart; hour < hourEnd; hour++) result.push(hour);
        return result;
    }, [hourStart, hourEnd]);

    // which of the 4 quarter-hour slots within this cell are covered by a rule -
    // rule times always land on 15-minute marks, so this is exact, not approximated.
    // used to shade a cell that's only partially available (e.g. rule starts at 07:15)
    // instead of showing the whole hour as available or unavailable
    function getRuleCoverageQuartersForCell(dayIndex: number, hour: number): boolean[] {
        const cellStart = hour * 60;

        return [0, 1, 2, 3].map((quarter) => {
            const quarterStart = cellStart + quarter * 15;
            const quarterEnd = quarterStart + 15;

            return scheduleRules.some(
                (rule) =>
                    rule.dayOfWeek === days[dayIndex] &&
                    timeToMinutes(rule.startTime) <= quarterStart &&
                    timeToMinutes(rule.endTime) >= quarterEnd
            );
        });
    }

    // builds a CSS background for a cell from its 4 quarter-coverage flags - each
    // covered quarter is white, each uncovered quarter is gray, stacked top to bottom
    function ruleCoverageBackground(quarters: boolean[]): string {
        const stops = quarters
            .map((covered, i) => {
                const from = i * 25;
                const to = from + 25;
                const color = covered ? "#ffffff" : "#e2e8f0";
                return `${color} ${from}%, ${color} ${to}%`;
            })
            .join(", ");
        return `linear-gradient(to bottom, ${stops})`;
    }

    // overrides for this day that fall (at least partly) within the visible hour
    // window, each with its pixel top/height so it renders as one continuous block
    // instead of repeating per hour row
    function getOverridesForDay(dayIndex: number) {
        const dateStr = toDateString(weekDates[dayIndex]);
        const windowStart = hourStart * 60;
        const windowEnd = hourEnd * 60;

        return scheduleOverrides
            .filter((override) => override.date === dateStr)
            .map((override) => {
                const startMinutes = Math.max(timeToMinutes(override.startTime), windowStart);
                const endMinutes = Math.min(timeToMinutes(override.endTime), windowEnd);
                return {
                    override,
                    top: ((startMinutes - windowStart) / 60) * ROW_HEIGHT,
                    height: ((endMinutes - startMinutes) / 60) * ROW_HEIGHT,
                };
            })
            .filter((block) => block.height > 0);
    }

    // is any part of this hour cell covered by an override or a lesson - used so
    // the plain background cell isn't clickable-to-add underneath an existing block
    function isCellCoveredByOverride(dayIndex: number, hour: number) {
        const dateStr = toDateString(weekDates[dayIndex]);
        const cellStart = hour * 60;
        const cellEnd = cellStart + 60;

        const overridden = scheduleOverrides.some(
            (override) =>
                override.date === dateStr &&
                timeToMinutes(override.startTime) < cellEnd &&
                timeToMinutes(override.endTime) > cellStart
        );

        const hasLesson = lessons.some(
            (lesson) =>
                lesson.date === dateStr &&
                timeToMinutes(lesson.startTime) < cellEnd &&
                timeToMinutes(lesson.endTime) > cellStart
        );

        return overridden || hasLesson;
    }

    // lessons for this day within the visible hour window, same top/height math as overrides
    function getLessonsForDay(dayIndex: number) {
        const dateStr = toDateString(weekDates[dayIndex]);
        const windowStart = hourStart * 60;
        const windowEnd = hourEnd * 60;

        return lessons
            .filter((lesson) => lesson.date === dateStr)
            .map((lesson) => {
                const startMinutes = Math.max(timeToMinutes(lesson.startTime), windowStart);
                const endMinutes = Math.min(timeToMinutes(lesson.endTime), windowEnd);
                return {
                    lesson,
                    top: ((startMinutes - windowStart) / 60) * ROW_HEIGHT,
                    height: ((endMinutes - startMinutes) / 60) * ROW_HEIGHT,
                };
            })
            .filter((block) => block.height > 0);
    }

    // whether a rule overlaps this day/[startHour, endHour) range AT ALL - matches
    // the backend's own "coveredByRule" check in ScheduleOverrideService exactly
    // (start < requestedEnd AND end > requestedStart). this has to be the same
    // "any overlap" definition the backend uses, not "every quarter individually
    // covered" - an override is a single flat range and the override table can't
    // represent partial-hour coverage, so offering "Add availability"/"Block this
    // time" based on a stricter frontend-only definition led the server to reject
    // the exact action the popup had just offered (e.g. a rule starting at 08:15
    // means the 08:00 cell isn't "fully available" by quarters, but the backend still
    // sees 08:00-09:00 as already covered and refuses to add it again)
    function isRangeCoveredByRule(dayIndex: number, startHour: number, endHour: number): boolean {
        const rangeStart = startHour * 60;
        const rangeEnd = endHour * 60;

        return scheduleRules.some(
            (rule) =>
                rule.dayOfWeek === days[dayIndex] &&
                timeToMinutes(rule.startTime) < rangeEnd &&
                timeToMinutes(rule.endTime) > rangeStart
        );
    }

    // opens the right popup for a resolved [startHour, endHour) range on a given day,
    // offering "Add availability" only when the backend would actually accept it
    // (no rule overlaps at all) and "Block this time" only when the backend would
    // accept that (some rule does overlap) - see isRangeCoveredByRule
    function openPopupForRange(dayIndex: number, startHour: number, endHour: number) {
        const dateStr = toDateString(weekDates[dayIndex]);
        const startTime = `${String(startHour).padStart(2, "0")}:00`;
        const endTime = `${String(endHour).padStart(2, "0")}:00`;

        const available = isRangeCoveredByRule(dayIndex, startHour, endHour);

        setChooseActionDate(dateStr);
        setChooseActionStartTime(startTime);
        setChooseActionEndTime(endTime);
        setChooseActionIsUnavailable(!available);
    }

    // extends [startHour, hour] to the widest contiguous run of cells that share the
    // same availability as the starting cell, so a drag across mixed cells doesn't
    // silently include time the teacher didn't intend to select. "availability" here
    // uses isRangeCoveredByRule (any overlap), matching what the popup will actually
    // offer/the backend will actually accept for the resulting range
    function clampRangeToUniformAvailability(dayIndex: number, startHour: number, hour: number): [number, number] {
        const startAvailable = isRangeCoveredByRule(dayIndex, startHour, startHour + 1);
        const lo = Math.min(startHour, hour);
        const hi = Math.max(startHour, hour);

        let rangeStart = startHour;
        let rangeEnd = startHour;
        for (let h = startHour; h >= lo; h--) {
            if (isRangeCoveredByRule(dayIndex, h, h + 1) !== startAvailable || isCellCoveredByOverride(dayIndex, h)) break;
            rangeStart = h;
        }
        for (let h = startHour; h <= hi; h++) {
            if (isRangeCoveredByRule(dayIndex, h, h + 1) !== startAvailable || isCellCoveredByOverride(dayIndex, h)) break;
            rangeEnd = h;
        }
        return [rangeStart, rangeEnd + 1];
    }

    function handleCellMouseDown(dayIndex: number, hour: number) {
        if (isCellCoveredByOverride(dayIndex, hour)) return;
        setDragDayIndex(dayIndex);
        setDragStartHour(hour);
        setDragCurrentHour(hour);
        setIsDragging(true);
    }

    function handleCellMouseEnter(dayIndex: number, hour: number) {
        if (!isDragging || dragDayIndex !== dayIndex || dragStartHour === null) return;
        setDragCurrentHour(hour);
    }

    function handleMouseUp() {
        if (!isDragging || dragDayIndex === null || dragStartHour === null || dragCurrentHour === null) {
            setIsDragging(false);
            return;
        }

        const [rangeStart, rangeEnd] = clampRangeToUniformAvailability(dragDayIndex, dragStartHour, dragCurrentHour);
        openPopupForRange(dragDayIndex, rangeStart, rangeEnd);

        setIsDragging(false);
        setDragDayIndex(null);
        setDragStartHour(null);
        setDragCurrentHour(null);
    }

    function isCellInDragSelection(dayIndex: number, hour: number): boolean {
        if (!isDragging || dragDayIndex !== dayIndex || dragStartHour === null || dragCurrentHour === null) return false;
        const lo = Math.min(dragStartHour, dragCurrentHour);
        const hi = Math.max(dragStartHour, dragCurrentHour);
        return hour >= lo && hour <= hi;
    }

    function handleAddLessonStartTimeChange(value: string) {
        setAddLessonStartTime(value);
        if (value) setAddLessonEndTime(addOneHour(value));
    }

    function openBookLessonForm(date: string, startTime: string, endTime: string, outsideHours = false) {
        setAddLessonError("");
        setEditingLessonId(null);
        setBookingOutsideHours(outsideHours);
        setAddLessonDate(date);
        setAddLessonStartTime(startTime);
        setAddLessonEndTime(endTime);
        setAddLessonStudentId("");
        setAddLessonSubjectId("");
    }

    function openEditLessonForm(lesson: Lesson) {
        setAddLessonError("");
        setEditingLessonId(lesson.id);
        setBookingOutsideHours(false);
        setAddLessonDate(lesson.date);
        setAddLessonStartTime(lesson.startTime.slice(0, 5));
        setAddLessonEndTime(lesson.endTime.slice(0, 5));
        setAddLessonStudentId(String(lesson.studentId));
        setAddLessonSubjectId(String(lesson.subjectId));
        setViewingLesson(null);
    }

    function handleChooseBookLesson() {
        if (!chooseActionDate) return;
        openBookLessonForm(chooseActionDate, chooseActionStartTime, chooseActionEndTime, chooseActionIsUnavailable);
        setChooseActionDate(null);
    }

    function handleChooseBlockTime() {
        if (!chooseActionDate) return;
        setAddOverrideError("");
        setEditingOverrideId(null);
        setAddOverrideDate(chooseActionDate);
        setAddOverrideStartTime(chooseActionStartTime);
        setAddOverrideEndTime(chooseActionEndTime);
        setAddOverrideType("BLOCK");
        setAddOverrideTypeLocked(true);
        setAddOverrideNote("");
        setChooseActionDate(null);
    }

    function handleChooseAddAvailability() {
        if (!chooseActionDate) return;
        setAddOverrideError("");
        setEditingOverrideId(null);
        setAddOverrideDate(chooseActionDate);
        setAddOverrideStartTime(chooseActionStartTime);
        setAddOverrideEndTime(chooseActionEndTime);
        setAddOverrideType("ADD");
        setAddOverrideTypeLocked(true);
        setAddOverrideNote("");
        setChooseActionDate(null);
    }

    function openEditOverrideForm(override: ScheduleOverride) {
        setAddOverrideError("");
        setEditingOverrideId(override.id);
        setAddOverrideDate(override.date);
        setAddOverrideStartTime(override.startTime.slice(0, 5));
        setAddOverrideEndTime(override.endTime.slice(0, 5));
        setAddOverrideType(override.type);
        setAddOverrideTypeLocked(true);
        setAddOverrideNote(override.note ?? "");
        setViewingOverride(null);
    }

    async function handleCreateLesson() {
        setAddLessonError("");

        if (!addLessonStudentId || !addLessonSubjectId || !addLessonDate || !addLessonStartTime || !addLessonEndTime) {
            setAddLessonError("Please fill in all fields");
            return;
        }
        const isEditing = editingLessonId !== null;

        const url = isEditing
            ? `/teacher/lessons/${editingLessonId}`
            : bookingOutsideHours
                ? `/teacher/lessons/book-outside-hours`
                : `/teacher/lessons`;

        const response = await apiFetch(
            url,
            {
                method: isEditing ? "PUT" : "POST",
                body: JSON.stringify({
                    studentId: Number(addLessonStudentId),
                    subjectId: Number(addLessonSubjectId),
                    date: addLessonDate,
                    startTime: addLessonStartTime,
                    endTime: addLessonEndTime,
                }),
            }
        );

        if (!response.ok) {
            setAddLessonError(await readErrorMessage(response, isEditing ? "Failed to update lesson" : "Failed to create lesson"));
            return;
        }

        const savedLesson: Lesson = await response.json();
        setLessons(isEditing ? lessons.map((lesson) => (lesson.id === savedLesson.id ? savedLesson : lesson)) : [...lessons, savedLesson]);
        if (!isEditing && bookingOutsideHours) loadOverrides();
        setAddLessonDate(null);
        setEditingLessonId(null);
        setBookingOutsideHours(false);
    }

    async function handleCreateOverride() {
        setAddOverrideError("");
        const isEditing = editingOverrideId !== null;

        const response = await apiFetch(
            isEditing ? `/teacher/schedule-overrides/${editingOverrideId}` : `/teacher/schedule-overrides`,
            {
                method: isEditing ? "PUT" : "POST",
                body: JSON.stringify({
                    date: addOverrideDate,
                    startTime: addOverrideStartTime,
                    endTime: addOverrideEndTime,
                    type: addOverrideType,
                    note: addOverrideNote,
                }),
            }
        );

        if (!response.ok) {
            setAddOverrideError(await readErrorMessage(response, isEditing ? "Failed to update override" : "Failed to add override"));
            return;
        }

        const savedOverride: ScheduleOverride = await response.json();
        setScheduleOverrides(
            isEditing
                ? scheduleOverrides.map((override) => (override.id === savedOverride.id ? savedOverride : override))
                : [...scheduleOverrides, savedOverride]
        );
        setAddOverrideDate(null);
        setEditingOverrideId(null);
    }

    // opens the lesson detail modal, syncing the notes textarea to this lesson's
    // saved notes - notesDraft is separate local state, so it needs resetting
    // every time a different lesson is opened, not just on first mount
    function openViewLesson(lesson: Lesson) {
        setViewingLesson(lesson);
        setNotesDraft(lesson.notes ?? "");
    }

    async function handleSaveNotes(lessonId: number) {
        setErrorMessage("");
        setSavingNotes(true);
        const response = await apiFetch(`/teacher/lessons/${lessonId}/notes`, {
            method: "PATCH",
            body: JSON.stringify({ notes: notesDraft }),
        });

        setSavingNotes(false);

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to save notes"));
            return;
        }

        const updatedLesson: Lesson = await response.json();
        setLessons(lessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)));
        setViewingLesson(updatedLesson);
    }

    async function handleCompleteLesson(lessonId: number) {
        setErrorMessage("");
        const response = await apiFetch(`/teacher/lessons/${lessonId}/complete`, {
            method: "PATCH",
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to mark lesson as completed"));
            return;
        }

        const updatedLesson: Lesson = await response.json();
        setLessons(lessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)));
        setViewingLesson(null);
    }

    // cancelling a lesson doesn't delete it - it's a soft cancel (status -> CANCELLED),
    // same as everywhere else lessons are cancelled in the app. it just disappears
    // from this screen since cancelled lessons no longer occupy any time
    async function handleCancelLesson(lessonId: number) {
        setErrorMessage("");
        const response = await apiFetch(`/lessons/${lessonId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to cancel lesson"));
            return;
        }

        setLessons(lessons.filter((lesson) => lesson.id !== lessonId));
        setViewingLesson(null);
    }

    async function handleDeleteOverride(overrideId: number) {
        setErrorMessage("");
        const response = await apiFetch(`/teacher/schedule-overrides/${overrideId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete override"));
            return;
        }

        setScheduleOverrides(scheduleOverrides.filter((override) => override.id !== overrideId));
        setViewingOverride(null);
    }

    const overrideBlockStyles: Record<string, string> = {
        BLOCK: "bg-red-100 hover:bg-red-200",
        ADD: "bg-green-100 hover:bg-green-200",
    };

    const lessonBlockStyles: Record<string, string> = {
        // indigo matches the app's primary action color elsewhere, so an upcoming
        // lesson reads as "the active thing to look at"
        SCHEDULED: "bg-indigo-100 hover:bg-indigo-200",
        // was the same slate as an unavailable cell, so a completed lesson was
        // visually indistinguishable from empty/unbookable time on the grid - teal
        // is a distinct hue from every other color already on the grid (red/green/
        // indigo/gray) and reads calmly as "done, nothing to act on"
        COMPLETED: "bg-teal-100 hover:bg-teal-200",
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
                        <p className="text-slate-500 mt-1">White = available, gray = unavailable, split = partly available within the hour, red = blocked, green = added, indigo = upcoming lesson, teal = completed lesson.</p>
                    </div>
                    <button
                        onClick={() => setShowRulesModal(true)}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Edit weekly availability
                    </button>
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                <div className="mt-6">
                    <WeekGrid
                        weekDates={weekDates}
                        hourStart={hourStart}
                        hourEnd={hourEnd}
                        onHourStartChange={setHourStart}
                        onHourEndChange={setHourEnd}
                        onPreviousWeek={() => setWeekStart((current) => {
                            const previous = new Date(current);
                            previous.setDate(current.getDate() - 7);
                            return previous;
                        })}
                        onNextWeek={() => setWeekStart((current) => {
                            const next = new Date(current);
                            next.setDate(current.getDate() + 7);
                            return next;
                        })}
                        todayDayIndex={todayDayIndex}
                        showNowLine={showNowLine}
                        nowLineTop={nowLineTop}
                        hours={hours}
                        renderDayColumn={(dayIndex) => (
                            <>
                                {hours.map((hour) => {
                                    const quarters = getRuleCoverageQuartersForCell(dayIndex, hour);
                                    const allCovered = quarters.every(Boolean);
                                    const noneCovered = quarters.every((covered) => !covered);
                                    const inDragSelection = isCellInDragSelection(dayIndex, hour);

                                    return (
                                        <button
                                            key={hour}
                                            onMouseDown={() => handleCellMouseDown(dayIndex, hour)}
                                            onMouseEnter={() => handleCellMouseEnter(dayIndex, hour)}
                                            style={{
                                                height: `${ROW_HEIGHT}px`,
                                                boxSizing: "border-box",
                                                background: inDragSelection
                                                    ? undefined
                                                    : allCovered || noneCovered
                                                        ? undefined
                                                        : ruleCoverageBackground(quarters),
                                            }}
                                            className={`block w-full border-b border-slate-300 transition-colors select-none ${
                                                inDragSelection
                                                    ? "bg-indigo-200"
                                                    : allCovered
                                                        ? "bg-white hover:bg-slate-50"
                                                        : noneCovered
                                                            ? "bg-slate-200 hover:bg-slate-300"
                                                            : ""
                                            }`}
                                        />
                                    );
                                })}

                                {getOverridesForDay(dayIndex).map(({ override, top, height }) => (
                                    <button
                                        key={`override-${override.id}`}
                                        onClick={() => setViewingOverride(override)}
                                        className={`absolute block left-0 right-0 m-0 px-1.5 py-1 text-xs text-left leading-tight overflow-hidden transition-colors ${overrideBlockStyles[override.type]}`}
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                    />
                                ))}

                                {getLessonsForDay(dayIndex).map(({ lesson, top, height }) => (
                                    <button
                                        key={`lesson-${lesson.id}`}
                                        onClick={() => openViewLesson(lesson)}
                                        className={`absolute block left-0 right-0 m-0 px-1.5 py-1 text-xs text-left leading-tight overflow-hidden transition-colors ${lessonBlockStyles[lesson.status] ?? lessonBlockStyles.SCHEDULED}`}
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                        title={`${lesson.studentFirstName} ${lesson.studentLastName} - ${lesson.subjectName}`}
                                    >
                                        <span className="line-clamp-2 text-slate-700 font-medium">
                                            {lesson.studentFirstName} {lesson.studentLastName}
                                        </span>
                                    </button>
                                ))}
                            </>
                        )}
                    />
                </div>
            </main>

            {chooseActionDate && (
                <Modal title={chooseActionIsUnavailable ? "Unavailable time" : "Available time"} onClose={() => setChooseActionDate(null)}>
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-slate-500">
                            {chooseActionDate} &middot; {chooseActionStartTime}&ndash;{chooseActionEndTime}
                        </p>
                        <button
                            onClick={handleChooseBookLesson}
                            className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                        >
                            Book a lesson here
                        </button>
                        {chooseActionIsUnavailable ? (
                            <button
                                onClick={handleChooseAddAvailability}
                                className="w-full rounded-lg bg-white border border-green-200 text-green-700 text-sm font-medium py-2.5 hover:bg-green-50 transition-colors"
                            >
                                Add availability
                            </button>
                        ) : (
                            <button
                                onClick={handleChooseBlockTime}
                                className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                            >
                                Block this time
                            </button>
                        )}
                    </div>
                </Modal>
            )}

            {addLessonDate && (
                <Modal title={editingLessonId !== null ? "Edit lesson" : "Book a lesson"} onClose={() => { setAddLessonDate(null); setEditingLessonId(null); }}>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Student</label>
                            <select value={addLessonStudentId} onChange={(e) => setAddLessonStudentId(e.target.value)} className={inputClassFull}>
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
                            <select value={addLessonSubjectId} onChange={(e) => setAddLessonSubjectId(e.target.value)} className={inputClassFull}>
                                <option value="">Select subject</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Date</label>
                            <input type="date" value={addLessonDate} onChange={(e) => setAddLessonDate(e.target.value)} className={inputClassFull} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Start time</label>
                                <TimeSelect value={addLessonStartTime} onChange={handleAddLessonStartTimeChange} className={inputClassFull} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>End time</label>
                                <TimeSelect value={addLessonEndTime} onChange={setAddLessonEndTime} className={inputClassFull} />
                            </div>
                        </div>

                        {addLessonError && <p className="text-sm text-red-600">{addLessonError}</p>}

                        <button
                            onClick={handleCreateLesson}
                            className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                        >
                            {editingLessonId !== null ? "Save changes" : "Book lesson"}
                        </button>
                    </div>
                </Modal>
            )}

            {addOverrideDate && (
                <Modal title={editingOverrideId !== null ? "Edit override" : "Add schedule override"} onClose={() => { setAddOverrideDate(null); setEditingOverrideId(null); }}>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Date</label>
                            <input type="date" value={addOverrideDate} onChange={(e) => setAddOverrideDate(e.target.value)} className={inputClassFull} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Start time</label>
                                <TimeSelect value={addOverrideStartTime} onChange={setAddOverrideStartTime} className={inputClassFull} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>End time</label>
                                <TimeSelect value={addOverrideEndTime} onChange={setAddOverrideEndTime} className={inputClassFull} />
                            </div>
                        </div>

                        {addOverrideTypeLocked ? (
                            <p className="text-sm text-slate-500">
                                {addOverrideType === "ADD" ? "Adding extra availability." : "Blocking this time."}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Type</label>
                                <select value={addOverrideType} onChange={(e) => setAddOverrideType(e.target.value)} className={inputClassFull}>
                                    <option value="BLOCK">Block (mark unavailable)</option>
                                    <option value="ADD">Add (extra availability)</option>
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Note (optional)</label>
                            <input value={addOverrideNote} onChange={(e) => setAddOverrideNote(e.target.value)} placeholder="Reason..." className={inputClassFull} />
                        </div>

                        {addOverrideError && <p className="text-sm text-red-600">{addOverrideError}</p>}

                        <button
                            onClick={handleCreateOverride}
                            className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </Modal>
            )}

            {viewingOverride && (
                <Modal title={viewingOverride.type === "BLOCK" ? "Blocked time" : "Added availability"} onClose={() => setViewingOverride(null)}>
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-slate-700">
                            {viewingOverride.date} &middot; {viewingOverride.startTime.slice(0, 5)}&ndash;{viewingOverride.endTime.slice(0, 5)}
                        </p>
                        {viewingOverride.note && <p className="text-sm text-slate-500">{viewingOverride.note}</p>}

                        {viewingOverride.type === "ADD" && (
                            <button
                                onClick={() => {
                                    openBookLessonForm(
                                        viewingOverride.date,
                                        viewingOverride.startTime.slice(0, 5),
                                        viewingOverride.endTime.slice(0, 5)
                                    );
                                    setViewingOverride(null);
                                }}
                                className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                            >
                                Book a lesson here
                            </button>
                        )}

                        <button
                            onClick={() => openEditOverrideForm(viewingOverride)}
                            className="w-full rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium py-2.5 hover:bg-slate-50 transition-colors"
                        >
                            Edit
                        </button>

                        <button
                            onClick={() => handleDeleteOverride(viewingOverride.id)}
                            className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </Modal>
            )}

            {viewingLesson && (
                <Modal title="Lesson" onClose={() => setViewingLesson(null)}>
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-slate-900">
                            {viewingLesson.studentFirstName} {viewingLesson.studentLastName}
                        </p>
                        <p className="text-sm text-slate-700">{viewingLesson.subjectName}</p>
                        <p className="text-sm text-slate-500">
                            {viewingLesson.date} &middot; {viewingLesson.startTime.slice(0, 5)}&ndash;{viewingLesson.endTime.slice(0, 5)}
                        </p>
                        <p className="text-sm text-slate-500">Status: {viewingLesson.status}</p>

                        {viewingLesson.status !== "CANCELLED" && (
                            <div className="flex flex-col gap-1 mt-2">
                                <label className="text-sm font-medium text-slate-700">Notes</label>
                                <textarea
                                    value={notesDraft}
                                    onChange={(e) => setNotesDraft(e.target.value)}
                                    placeholder="What was covered, homework assigned, anything worth remembering..."
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                />
                                <button
                                    onClick={() => handleSaveNotes(viewingLesson.id)}
                                    disabled={savingNotes || notesDraft === (viewingLesson.notes ?? "")}
                                    className="self-end px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                                >
                                    {savingNotes ? "Saving..." : "Save notes"}
                                </button>
                            </div>
                        )}

                        {viewingLesson.status === "SCHEDULED" && (
                            <div className="flex flex-col gap-2 mt-2">
                                {hasLessonStarted(viewingLesson) ? (
                                    <button
                                        onClick={() => handleCompleteLesson(viewingLesson.id)}
                                        className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                                    >
                                        Mark completed
                                    </button>
                                ) : (
                                    <p className="text-xs text-slate-400">Can be marked completed once it starts.</p>
                                )}
                                <button
                                    onClick={() => openEditLessonForm(viewingLesson)}
                                    className="w-full rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium py-2.5 hover:bg-slate-50 transition-colors"
                                >
                                    Edit lesson
                                </button>
                                <button
                                    onClick={() => handleCancelLesson(viewingLesson.id)}
                                    className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                                >
                                    Cancel lesson
                                </button>
                            </div>
                        )}

                        {viewingLesson.status === "COMPLETED" && (
                            <div className="flex flex-col gap-2 mt-2">
                                <p className="text-xs text-slate-400">
                                    Cancelling a completed lesson removes it from the student's debt and this month's revenue.
                                </p>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Cancel this completed lesson? This will reverse its effect on debt and revenue.")) {
                                            handleCancelLesson(viewingLesson.id);
                                        }
                                    }}
                                    className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                                >
                                    Cancel lesson
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {showRulesModal && (
                <ScheduleRulesModal
                    scheduleRules={scheduleRules}
                    onRulesChanged={setScheduleRules}
                    onClose={() => setShowRulesModal(false)}
                />
            )}
        </div>
    );
}

export default SchedulePage;
