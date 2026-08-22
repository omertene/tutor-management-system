import { useEffect, useMemo, useState } from "react";
import NavBar from "../components/NavBar";
import Modal from "../components/Modal";
import { readErrorMessage } from "../utils/httpError";

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

const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// the grid shows this many hour rows, starting at HOUR_START
const DEFAULT_HOUR_START = 8;
const DEFAULT_HOUR_END = 22;
const MIN_HOUR = 0;
const MAX_HOUR = 24;
const ROW_HEIGHT = 48; // px, must match the h-12 cell height below

const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTE_OPTIONS: string[] = ["00", "15", "30", "45"];

// adds 1 hour to a "HH:MM" time, wrapping past midnight if needed
function addOneHour(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    const nextHour = (hours + 1) % 24;
    return `${String(nextHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

type TimeSelectProps = {
    value: string;
    onChange: (value: string) => void;
    className: string;
};

// hour + minute picked independently via two small dropdowns, instead of one long
// scrolling list of all 96 quarter-hour times - value/onChange still work as a single
// "HH:MM" string so nothing else in the file needs to know this is two selects
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

type ScheduleRule = {
    id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
};

type ScheduleOverride = {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    note: string;
};

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

// Monday-based week start isn't used here - the grid is Sunday-first to match
// the `days` order used by schedule rules
function getStartOfWeek(reference: Date): Date {
    const result = new Date(reference);
    result.setDate(result.getDate() - result.getDay());
    result.setHours(0, 0, 0, 0);
    return result;
}

// formats using the browser's local date fields (not toISOString, which converts
// to UTC first and can shift the date by a day depending on timezone)
function toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
}

// a lesson can only be marked completed once it's actually started - matches the
// backend check in LessonService.completeLesson
function hasLessonStarted(lesson: Lesson): boolean {
    const [year, month, day] = lesson.date.split("-").map(Number);
    const [hours, minutes] = lesson.startTime.slice(0, 5).split(":").map(Number);
    const lessonStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return lessonStart <= new Date();
}

function minutesSinceMidnight(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
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
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data: ScheduleRule[] = await response.json();
        setScheduleRules(sortRules(data));
    }

    async function loadOverrides() {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/teacher/schedule-overrides`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setScheduleOverrides(await response.json());
    }

    async function loadLessons() {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data: Lesson[] = await response.json();
        setLessons(data.filter((lesson) => lesson.status !== "CANCELLED"));
    }

    async function loadStudents() {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/teacher/students`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setStudents(await response.json());
    }

    async function loadSubjects() {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setSubjects(await response.json());
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
    });

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

    // opens the right popup for a resolved [startHour, endHour) range on a given day,
    // based on the availability of the range's starting cell (shared by click and drag).
    // a cell that's only partially covered by a rule (e.g. rule starts at 07:15) is
    // treated as "unavailable" here too, since assuming the whole hour is bookable
    // would be misleading - the teacher picks the exact time in the form that follows
    function openPopupForRange(dayIndex: number, startHour: number, endHour: number) {
        const dateStr = toDateString(weekDates[dayIndex]);
        const startTime = `${String(startHour).padStart(2, "0")}:00`;
        const endTime = `${String(endHour).padStart(2, "0")}:00`;

        const quarters = getRuleCoverageQuartersForCell(dayIndex, startHour);
        const fullyAvailable = quarters.every(Boolean);

        setChooseActionDate(dateStr);
        setChooseActionStartTime(startTime);
        setChooseActionEndTime(endTime);
        setChooseActionIsUnavailable(!fullyAvailable);
    }

    // a cell counts as "fully available" only if all 4 of its quarter-hours are
    // covered by a rule - a partially-covered cell is treated as unavailable for
    // uniformity purposes, same as openPopupForRange
    function isCellFullyAvailable(dayIndex: number, hour: number): boolean {
        return getRuleCoverageQuartersForCell(dayIndex, hour).every(Boolean);
    }

    // extends [startHour, hour] to the widest contiguous run of cells that share the
    // same availability as the starting cell, so a drag across mixed cells doesn't
    // silently include time the teacher didn't intend to select
    function clampRangeToUniformAvailability(dayIndex: number, startHour: number, hour: number): [number, number] {
        const startAvailable = isCellFullyAvailable(dayIndex, startHour);
        const lo = Math.min(startHour, hour);
        const hi = Math.max(startHour, hour);

        let rangeStart = startHour;
        let rangeEnd = startHour;
        for (let h = startHour; h >= lo; h--) {
            if (isCellFullyAvailable(dayIndex, h) !== startAvailable || isCellCoveredByOverride(dayIndex, h)) break;
            rangeStart = h;
        }
        for (let h = startHour; h <= hi; h++) {
            if (isCellFullyAvailable(dayIndex, h) !== startAvailable || isCellCoveredByOverride(dayIndex, h)) break;
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

        const token = localStorage.getItem("token");
        const isEditing = editingLessonId !== null;

        const url = isEditing
            ? `${API_BASE_URL}/teacher/lessons/${editingLessonId}`
            : bookingOutsideHours
                ? `${API_BASE_URL}/teacher/lessons/book-outside-hours`
                : `${API_BASE_URL}/teacher/lessons`;

        const response = await fetch(
            url,
            {
                method: isEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
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

        const savedLesson = await response.json();
        setLessons(isEditing ? lessons.map((lesson) => (lesson.id === savedLesson.id ? savedLesson : lesson)) : [...lessons, savedLesson]);
        if (!isEditing && bookingOutsideHours) loadOverrides();
        setAddLessonDate(null);
        setEditingLessonId(null);
        setBookingOutsideHours(false);
    }

    async function handleCreateOverride() {
        setAddOverrideError("");

        const token = localStorage.getItem("token");
        const isEditing = editingOverrideId !== null;

        const response = await fetch(
            isEditing ? `${API_BASE_URL}/teacher/schedule-overrides/${editingOverrideId}` : `${API_BASE_URL}/teacher/schedule-overrides`,
            {
                method: isEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
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

        const savedOverride = await response.json();
        setScheduleOverrides(
            isEditing
                ? scheduleOverrides.map((override) => (override.id === savedOverride.id ? savedOverride : override))
                : [...scheduleOverrides, savedOverride]
        );
        setAddOverrideDate(null);
        setEditingOverrideId(null);
    }

    async function handleCompleteLesson(lessonId: number) {
        setErrorMessage("");

        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/teacher/lessons/${lessonId}/complete`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to mark lesson as completed"));
            return;
        }

        const updatedLesson = await response.json();
        setLessons(lessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)));
        setViewingLesson(null);
    }

    // cancelling a lesson doesn't delete it - it's a soft cancel (status -> CANCELLED),
    // same as everywhere else lessons are cancelled in the app. it just disappears
    // from this screen since cancelled lessons no longer occupy any time
    async function handleCancelLesson(lessonId: number) {
        setErrorMessage("");

        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
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

        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/teacher/schedule-overrides/${overrideId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
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
        SCHEDULED: "bg-blue-100 hover:bg-blue-200",
        COMPLETED: "bg-slate-200 hover:bg-slate-300",
    };

    const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "text-sm font-medium text-slate-700";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
                        <p className="text-slate-500 mt-1">White = available, gray = unavailable, split = partly available within the hour, red = blocked, green = added, blue = upcoming lesson, slate = completed lesson.</p>
                    </div>
                    <button
                        onClick={() => setShowRulesModal(true)}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Edit weekly availability
                    </button>
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                <div className="mt-6 flex items-center justify-between">
                    <button
                        onClick={() => setWeekStart((current) => {
                            const previous = new Date(current);
                            previous.setDate(current.getDate() - 7);
                            return previous;
                        })}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        &larr; Previous week
                    </button>
                    <span className="text-sm font-medium text-slate-700">
                        {formatShortDate(weekDates[0])} &ndash; {formatShortDate(weekDates[6])}
                    </span>
                    <button
                        onClick={() => setWeekStart((current) => {
                            const next = new Date(current);
                            next.setDate(current.getDate() + 7);
                            return next;
                        })}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Next week &rarr;
                    </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    {hourStart > MIN_HOUR ? (
                        <button
                            onClick={() => setHourStart((current) => Math.max(MIN_HOUR, current - 2))}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            &uarr; Show earlier hours
                        </button>
                    ) : <span />}
                    {(hourStart !== DEFAULT_HOUR_START || hourEnd !== DEFAULT_HOUR_END) && (
                        <button
                            onClick={() => { setHourStart(DEFAULT_HOUR_START); setHourEnd(DEFAULT_HOUR_END); }}
                            className="text-sm text-slate-400 hover:text-slate-600"
                        >
                            Reset hours
                        </button>
                    )}
                </div>

                <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                    <div className="min-w-[700px] grid grid-cols-[60px_repeat(7,1fr)] items-start">
                        <div className="border-b border-slate-100" />
                        {dayLabels.map((label, dayIndex) => (
                            <div
                                key={label}
                                className={`border-b border-l border-slate-100 px-2 py-2 text-center ${dayIndex === todayDayIndex ? "bg-indigo-50" : ""}`}
                            >
                                <p className={`text-xs font-medium ${dayIndex === todayDayIndex ? "text-indigo-500" : "text-slate-500"}`}>{label}</p>
                                <p className={`text-sm font-semibold ${dayIndex === todayDayIndex ? "text-indigo-700" : "text-slate-900"}`}>{formatShortDate(weekDates[dayIndex])}</p>
                            </div>
                        ))}

                        <div className="relative">
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    style={{ height: `${ROW_HEIGHT}px`, boxSizing: "border-box" }}
                                    className="border-b border-slate-300"
                                />
                            ))}
                            {hours.map((hour, index) => (
                                <div
                                    key={hour}
                                    style={{ top: `${index * ROW_HEIGHT}px` }}
                                    className="absolute right-2 -translate-y-1/2 text-xs text-slate-400"
                                >
                                    {String(hour).padStart(2, "0")}:00
                                </div>
                            ))}
                        </div>

                        {dayLabels.map((_, dayIndex) => (
                            <div key={dayIndex} className="relative border-l border-slate-100">
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
                                        onClick={() => setViewingLesson(lesson)}
                                        className={`absolute block left-0 right-0 m-0 px-1.5 py-1 text-xs text-left leading-tight overflow-hidden transition-colors ${lessonBlockStyles[lesson.status] ?? lessonBlockStyles.SCHEDULED}`}
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                        title={`${lesson.studentFirstName} ${lesson.studentLastName} - ${lesson.subjectName}`}
                                    >
                                        <span className="line-clamp-2 text-slate-700 font-medium">
                                            {lesson.studentFirstName} {lesson.studentLastName}
                                        </span>
                                    </button>
                                ))}

                                {dayIndex === todayDayIndex && showNowLine && (
                                    <div
                                        className="absolute left-0 right-0 pointer-events-none border-t-2 border-red-500 z-10"
                                        style={{ top: `${nowLineTop}px` }}
                                    >
                                        <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {hourEnd < MAX_HOUR && (
                    <button
                        onClick={() => setHourEnd((current) => Math.min(MAX_HOUR, current + 2))}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        &darr; Show later hours
                    </button>
                )}
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
                            <select value={addLessonStudentId} onChange={(e) => setAddLessonStudentId(e.target.value)} className={inputClass}>
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
                            <select value={addLessonSubjectId} onChange={(e) => setAddLessonSubjectId(e.target.value)} className={inputClass}>
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
                            <input type="date" value={addLessonDate} onChange={(e) => setAddLessonDate(e.target.value)} className={inputClass} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Start time</label>
                                <TimeSelect value={addLessonStartTime} onChange={handleAddLessonStartTimeChange} className={inputClass} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>End time</label>
                                <TimeSelect value={addLessonEndTime} onChange={setAddLessonEndTime} className={inputClass} />
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
                            <input type="date" value={addOverrideDate} onChange={(e) => setAddOverrideDate(e.target.value)} className={inputClass} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Start time</label>
                                <TimeSelect value={addOverrideStartTime} onChange={setAddOverrideStartTime} className={inputClass} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>End time</label>
                                <TimeSelect value={addOverrideEndTime} onChange={setAddOverrideEndTime} className={inputClass} />
                            </div>
                        </div>

                        {addOverrideTypeLocked ? (
                            <p className="text-sm text-slate-500">
                                {addOverrideType === "ADD" ? "Adding extra availability." : "Blocking this time."}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Type</label>
                                <select value={addOverrideType} onChange={(e) => setAddOverrideType(e.target.value)} className={inputClass}>
                                    <option value="BLOCK">Block (mark unavailable)</option>
                                    <option value="ADD">Add (extra availability)</option>
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Note (optional)</label>
                            <input value={addOverrideNote} onChange={(e) => setAddOverrideNote(e.target.value)} placeholder="Reason..." className={inputClass} />
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

type ScheduleRulesModalProps = {
    scheduleRules: ScheduleRule[];
    onRulesChanged: (rules: ScheduleRule[]) => void;
    onClose: () => void;
};

function sortRules(rules: ScheduleRule[]): ScheduleRule[] {
    return [...rules].sort((a, b) => {
        const dayDiff = days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
    });
}

function formatTime(time: string): string {
    return time.slice(0, 5);
}

// the recurring weekly availability template - separate from the calendar since
// rules are day-of-week based, not tied to a specific date
type TimeRangeDraft = { startTime: string; endTime: string };

// most teaching hours fall in this window, so a new/blank range starts here instead
// of empty - saves a click in the common case, still fully editable
const DEFAULT_RULE_RANGE: TimeRangeDraft = { startTime: "08:00", endTime: "16:00" };

function ScheduleRulesModal({ scheduleRules, onRulesChanged, onClose }: ScheduleRulesModalProps) {
    const [dayOfWeek, setDayOfWeek] = useState(days[0]);
    const [ranges, setRanges] = useState<TimeRangeDraft[]>([{ ...DEFAULT_RULE_RANGE }]);
    const [errorMessage, setErrorMessage] = useState("");
    const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

    function resetForm() {
        setEditingRuleId(null);
        setDayOfWeek(days[0]);
        setRanges([{ ...DEFAULT_RULE_RANGE }]);
    }

    function startEditRule(rule: ScheduleRule) {
        setErrorMessage("");
        setEditingRuleId(rule.id);
        setDayOfWeek(rule.dayOfWeek);
        setRanges([{ startTime: formatTime(rule.startTime), endTime: formatTime(rule.endTime) }]);
    }

    function updateRange(index: number, field: "startTime" | "endTime", value: string) {
        setRanges(ranges.map((range, i) => (i === index ? { ...range, [field]: value } : range)));
    }

    function addRange() {
        setRanges([...ranges, { ...DEFAULT_RULE_RANGE }]);
    }

    function removeRange(index: number) {
        setRanges(ranges.filter((_, i) => i !== index));
    }

    async function handleSaveRule() {
        setErrorMessage("");
        const token = localStorage.getItem("token");
        const isEditing = editingRuleId !== null;

        if (ranges.some((range) => !range.startTime || !range.endTime)) {
            setErrorMessage("Please fill in every time range, or remove the empty one");
            return;
        }

        if (isEditing) {
            const { startTime, endTime } = ranges[0];
            const countResponse = await fetch(`${API_BASE_URL}/teacher/schedule-rules/${editingRuleId}/affected-lessons-count-for-edit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ dayOfWeek, startTime, endTime }),
            });
            const affectedCount = countResponse.ok ? await countResponse.json() : 0;

            if (affectedCount > 0) {
                const confirmed = window.confirm(
                    `${affectedCount} upcoming lesson${affectedCount === 1 ? "" : "s"} would no longer fall inside this slot. ` +
                    `${affectedCount === 1 ? "It" : "They"} will stay scheduled, just outside your regular hours. Save anyway?`
                );
                if (!confirmed) return;
            }

            const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules/${editingRuleId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ dayOfWeek, startTime, endTime }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "Failed to save rule"));
                return;
            }

            const savedRule = await response.json();
            onRulesChanged(sortRules(scheduleRules.map((rule) => (rule.id === savedRule.id ? savedRule : rule))));
            resetForm();
            return;
        }

        // create mode - each range in the list is saved as its own rule, one request
        // at a time, so a conflict on one range doesn't silently drop the others
        const createdRules: ScheduleRule[] = [];
        for (const range of ranges) {
            const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ dayOfWeek, startTime: range.startTime, endTime: range.endTime }),
            });

            if (!response.ok) {
                const baseMessage = await readErrorMessage(response, "Failed to add rule");
                setErrorMessage(
                    baseMessage +
                    (createdRules.length > 0 ? ` (${createdRules.length} of ${ranges.length} range(s) were saved before this one failed)` : "")
                );
                if (createdRules.length > 0) onRulesChanged(sortRules([...scheduleRules, ...createdRules]));
                return;
            }

            createdRules.push(await response.json());
        }

        onRulesChanged(sortRules([...scheduleRules, ...createdRules]));
        resetForm();
    }

    async function handleDeleteRule(ruleId: number) {
        setErrorMessage("");
        const token = localStorage.getItem("token");

        const countResponse = await fetch(`${API_BASE_URL}/teacher/schedule-rules/${ruleId}/affected-lessons-count`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const affectedCount = countResponse.ok ? await countResponse.json() : 0;

        if (affectedCount > 0) {
            const confirmed = window.confirm(
                `${affectedCount} upcoming lesson${affectedCount === 1 ? "" : "s"} fall inside this slot. ` +
                `Deleting this rule won't cancel ${affectedCount === 1 ? "it" : "them"} - ${affectedCount === 1 ? "it" : "they"} will stay scheduled, just outside your regular hours. Delete anyway?`
            );
            if (!confirmed) return;
        }

        const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules/${ruleId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete rule"));
            return;
        }

        onRulesChanged(scheduleRules.filter((rule) => rule.id !== ruleId));
    }

    return (
        <Modal title="Weekly availability" onClose={onClose}>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <select
                        value={dayOfWeek}
                        onChange={(e) => {
                            if (editingRuleId !== null) {
                                resetForm();
                            }
                            setDayOfWeek(e.target.value);
                        }}
                        className={inputClass}
                    >
                        {days.map((day) => (
                            <option key={day} value={day}>{day}</option>
                        ))}
                    </select>

                    {ranges.map((range, index) => (
                        <div key={index} className="flex flex-wrap gap-2 items-center">
                            <TimeSelect
                                value={range.startTime}
                                onChange={(value) => updateRange(index, "startTime", value)}
                                className={inputClass}
                            />
                            <TimeSelect
                                value={range.endTime}
                                onChange={(value) => updateRange(index, "endTime", value)}
                                className={inputClass}
                            />
                            {!editingRuleId && ranges.length > 1 && (
                                <button
                                    onClick={() => removeRange(index)}
                                    className="px-2 py-1 rounded-md bg-white border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}

                    {!editingRuleId && (
                        <button
                            onClick={addRange}
                            className="self-start text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            + Add another time range for {dayOfWeek}
                        </button>
                    )}

                    <div className="flex flex-wrap gap-2 items-center mt-1">
                        <button
                            onClick={handleSaveRule}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            {editingRuleId !== null ? "Save changes" : ranges.length > 1 ? `Add ${ranges.length} rules` : "Add rule"}
                        </button>
                        {editingRuleId !== null && (
                            <button
                                onClick={resetForm}
                                className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {scheduleRules.length === 0 && (
                        <p className="px-4 py-6 text-sm text-slate-500 text-center">No rules yet.</p>
                    )}
                    {days
                        .filter((day) => scheduleRules.some((rule) => rule.dayOfWeek === day))
                        .map((day) => (
                            <div key={day} className="px-4 py-2">
                                <p className="text-xs font-semibold text-slate-500 mb-1">{day}</p>
                                <div className="flex flex-col gap-1">
                                    {scheduleRules
                                        .filter((rule) => rule.dayOfWeek === day)
                                        .map((rule) => (
                                            <div key={rule.id} className="flex items-center justify-between">
                                                <span className="text-sm text-slate-900">
                                                    {formatTime(rule.startTime)} to {formatTime(rule.endTime)}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => startEditRule(rule)}
                                                        className="px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="px-2 py-1 rounded-md bg-white border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </Modal>
    );
}

export default SchedulePage;
