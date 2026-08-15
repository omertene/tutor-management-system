import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";

const API_BASE_URL = "http://localhost:8080";

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

// hour + minute picked independently via two small dropdowns, same pattern used on
// the teacher's Schedule page and every other booking form in the app
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
    subjectName: string;
    subjectId: number;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
};

// a booked slot belonging to another student - no name/subject, used only to gray
// out the grid so this student doesn't try to book over it
type BusySlot = {
    date: string;
    startTime: string;
    endTime: string;
};

type Subject = {
    id: number;
    name: string;
};

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

function minutesSinceMidnight(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
}

// the student-facing weekly schedule: shows the teacher's availability, other
// students' booked slots (grayed out, no details), and this student's own lessons.
// clicking an open slot books a lesson; clicking one of your own lessons lets you
// view/cancel it. shared between the dedicated /student/schedule page and the
// student dashboard, which embeds this same grid.
function StudentScheduleGrid() {
    const token = localStorage.getItem("token")!;

    const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
    const [hourStart, setHourStart] = useState(DEFAULT_HOUR_START);
    const [hourEnd, setHourEnd] = useState(DEFAULT_HOUR_END);
    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    // "book a lesson" popup, opened by clicking an available cell
    const [bookDate, setBookDate] = useState<string | null>(null);
    const [bookStartTime, setBookStartTime] = useState("");
    const [bookEndTime, setBookEndTime] = useState("");
    const [bookSubjectId, setBookSubjectId] = useState("");
    const [bookError, setBookError] = useState("");

    // viewing/cancelling one of the student's own lessons, opened by clicking it
    const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    async function loadRules() {
        const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setScheduleRules(await response.json());
    }

    async function loadOverrides() {
        const response = await fetch(`${API_BASE_URL}/teacher/schedule-overrides`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setScheduleOverrides(await response.json());
    }

    // a student only ever sees their own lessons - the backend scopes this by caller id
    async function loadLessons() {
        const response = await fetch(`${API_BASE_URL}/student/lessons`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data: Lesson[] = await response.json();
        setLessons(data.filter((lesson) => lesson.status !== "CANCELLED"));
    }

    async function loadSubjects() {
        const response = await fetch(`${API_BASE_URL}/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setSubjects(await response.json());
    }

    // other students' booked slots, shown as blocked/gray so this student doesn't
    // try to double-book a time that's actually already taken
    async function loadBusySlots() {
        const response = await fetch(`${API_BASE_URL}/student/busy-slots`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setBusySlots(await response.json());
    }

    useEffect(() => {
        loadRules();
        loadOverrides();
        loadLessons();
        loadBusySlots();
        loadSubjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    // same logic as the teacher's Schedule page, so a partially-available hour
    // (e.g. rule starts at 07:15) is shown split instead of all-or-nothing
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

    // overrides for this day within the visible hour window - BLOCK ones are shown
    // (so the student knows why a normally-open slot is unavailable), ADD ones too
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

    function isCellCoveredByOverrideOrLesson(dayIndex: number, hour: number) {
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

        // busySlots already includes this student's own lessons too (they're
        // SCHEDULED/COMPLETED lessons like anyone else's), so checking it alone
        // would be enough, but the explicit lesson check above is kept since it's
        // also used to decide whether *this* student's own lesson block renders
        const bookedByAnyone = busySlots.some(
            (slot) =>
                slot.date === dateStr &&
                timeToMinutes(slot.startTime) < cellEnd &&
                timeToMinutes(slot.endTime) > cellStart
        );

        return overridden || hasLesson || bookedByAnyone;
    }

    // other students' busy slots for this day, excluding anything that overlaps one
    // of this student's own lessons (which render separately, in full detail)
    function getBusySlotsForDay(dayIndex: number) {
        const dateStr = toDateString(weekDates[dayIndex]);
        const windowStart = hourStart * 60;
        const windowEnd = hourEnd * 60;

        return busySlots
            .filter((slot) => slot.date === dateStr)
            .filter((slot) => !lessons.some(
                (lesson) =>
                    lesson.date === slot.date &&
                    lesson.startTime === slot.startTime &&
                    lesson.endTime === slot.endTime
            ))
            .map((slot) => {
                const startMinutes = Math.max(timeToMinutes(slot.startTime), windowStart);
                const endMinutes = Math.min(timeToMinutes(slot.endTime), windowEnd);
                return {
                    slot,
                    top: ((startMinutes - windowStart) / 60) * ROW_HEIGHT,
                    height: ((endMinutes - startMinutes) / 60) * ROW_HEIGHT,
                };
            })
            .filter((block) => block.height > 0);
    }

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

    function isCellFullyAvailable(dayIndex: number, hour: number): boolean {
        return getRuleCoverageQuartersForCell(dayIndex, hour).every(Boolean);
    }

    function isCellInPast(dayIndex: number, hour: number): boolean {
        const cellStart = new Date(weekDates[dayIndex]);
        cellStart.setHours(hour, 0, 0, 0);
        return cellStart <= now;
    }

    // clicking a cell only opens the booking form when the slot is actually bookable -
    // a student can't add availability or block time like a teacher can, so a partially
    // or fully unavailable cell (and anything already covered by a lesson/override) does nothing
    function handleCellClick(dayIndex: number, hour: number) {
        if (isCellCoveredByOverrideOrLesson(dayIndex, hour)) return;
        if (!isCellFullyAvailable(dayIndex, hour)) return;
        if (isCellInPast(dayIndex, hour)) return;

        const dateStr = toDateString(weekDates[dayIndex]);
        const startTime = `${String(hour).padStart(2, "0")}:00`;
        const endTime = addOneHour(startTime);

        setBookError("");
        setBookSubjectId("");
        setBookDate(dateStr);
        setBookStartTime(startTime);
        setBookEndTime(endTime);
    }

    function handleBookStartTimeChange(value: string) {
        setBookStartTime(value);
        if (value) setBookEndTime(addOneHour(value));
    }

    async function handleBookLesson() {
        setBookError("");

        if (!bookSubjectId || !bookDate || !bookStartTime || !bookEndTime) {
            setBookError("Please fill in all fields");
            return;
        }

        const [bookHour, bookMinute] = bookStartTime.split(":").map(Number);
        const requestedStart = new Date(bookDate);
        requestedStart.setHours(bookHour, bookMinute, 0, 0);
        if (requestedStart <= new Date()) {
            setBookError("Can't book a lesson in the past");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/student/lessons`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                subjectId: Number(bookSubjectId),
                date: bookDate,
                startTime: bookStartTime,
                endTime: bookEndTime,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            setBookError(errorData.message || "Failed to book lesson");
            return;
        }

        const createdLesson = await response.json();
        setLessons([...lessons, createdLesson]);
        setBusySlots([...busySlots, { date: createdLesson.date, startTime: createdLesson.startTime, endTime: createdLesson.endTime }]);
        setBookDate(null);
    }

    // cancelling doesn't delete the lesson - it's a soft cancel (status -> CANCELLED),
    // same as everywhere else in the app. it just disappears from the grid since a
    // cancelled lesson no longer occupies any time
    async function handleCancelLesson(lessonId: number) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to cancel lesson");
            return;
        }

        const cancelled = lessons.find((lesson) => lesson.id === lessonId);
        setLessons(lessons.filter((lesson) => lesson.id !== lessonId));
        if (cancelled) {
            setBusySlots(busySlots.filter(
                (slot) => !(slot.date === cancelled.date && slot.startTime === cancelled.startTime && slot.endTime === cancelled.endTime)
            ));
        }
        setViewingLesson(null);
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
        <>
            <div>
                <p className="text-slate-500 text-sm">White = available, gray = unavailable or booked by another student, split = partly available within the hour, red = blocked, green = extra availability, blue = your upcoming lesson, slate = your completed lesson. Click an open slot to book.</p>
            </div>

            {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

            <div className="mt-4 flex items-center justify-between">
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
                                const isPast = isCellInPast(dayIndex, hour);

                                return (
                                    <button
                                        key={hour}
                                        onClick={() => handleCellClick(dayIndex, hour)}
                                        style={{
                                            height: `${ROW_HEIGHT}px`,
                                            boxSizing: "border-box",
                                            background: !isPast && !allCovered && !noneCovered ? ruleCoverageBackground(quarters) : undefined,
                                        }}
                                        className={`block w-full border-b border-slate-300 transition-colors select-none ${
                                            isPast
                                                ? "bg-slate-100 cursor-default"
                                                : allCovered
                                                    ? "bg-white hover:bg-slate-50 cursor-pointer"
                                                    : noneCovered
                                                        ? "bg-slate-200 cursor-default"
                                                        : "cursor-default"
                                        }`}
                                    />
                                );
                            })}

                            {getOverridesForDay(dayIndex).map(({ override, top, height }) => (
                                <div
                                    key={`override-${override.id}`}
                                    className={`absolute block left-0 right-0 m-0 px-1.5 py-1 text-xs text-left leading-tight overflow-hidden ${overrideBlockStyles[override.type]}`}
                                    style={{ top: `${top}px`, height: `${height}px` }}
                                    title={override.note || override.type}
                                >
                                    {override.note && <span className="line-clamp-2 text-slate-700">{override.note}</span>}
                                </div>
                            ))}

                            {getBusySlotsForDay(dayIndex).map(({ slot, top, height }, index) => (
                                <div
                                    key={`busy-${slot.date}-${slot.startTime}-${index}`}
                                    className="absolute block left-0 right-0 m-0 px-1.5 py-1 text-xs text-left leading-tight overflow-hidden bg-slate-200"
                                    style={{ top: `${top}px`, height: `${height}px` }}
                                    title="Booked"
                                >
                                    <span className="text-slate-500">Booked</span>
                                </div>
                            ))}

                            {getLessonsForDay(dayIndex).map(({ lesson, top, height }) => (
                                <button
                                    key={`lesson-${lesson.id}`}
                                    onClick={() => setViewingLesson(lesson)}
                                    className={`absolute block left-0 right-0 m-0 px-1.5 py-1 text-xs text-left leading-tight overflow-hidden transition-colors ${lessonBlockStyles[lesson.status] ?? lessonBlockStyles.SCHEDULED}`}
                                    style={{ top: `${top}px`, height: `${height}px` }}
                                    title={lesson.subjectName}
                                >
                                    <span className="line-clamp-2 text-slate-700 font-medium">
                                        {lesson.subjectName}
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

            {bookDate && (
                <Modal title="Book a lesson" onClose={() => setBookDate(null)}>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Subject</label>
                            <select value={bookSubjectId} onChange={(e) => setBookSubjectId(e.target.value)} className={inputClass}>
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
                            <input type="date" value={bookDate} min={toDateString(new Date())} onChange={(e) => setBookDate(e.target.value)} className={inputClass} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Start time</label>
                                <TimeSelect value={bookStartTime} onChange={handleBookStartTimeChange} className={inputClass} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>End time</label>
                                <TimeSelect value={bookEndTime} onChange={setBookEndTime} className={inputClass} />
                            </div>
                        </div>

                        {bookError && <p className="text-sm text-red-600">{bookError}</p>}

                        <button
                            onClick={handleBookLesson}
                            className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                        >
                            Book lesson
                        </button>
                    </div>
                </Modal>
            )}

            {viewingLesson && (
                <Modal title="Lesson" onClose={() => setViewingLesson(null)}>
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-slate-900">{viewingLesson.subjectName}</p>
                        <p className="text-sm text-slate-500">
                            {viewingLesson.date} &middot; {viewingLesson.startTime.slice(0, 5)}&ndash;{viewingLesson.endTime.slice(0, 5)}
                        </p>
                        <p className="text-sm text-slate-500">Status: {viewingLesson.status}</p>

                        {viewingLesson.status === "SCHEDULED" && (
                            <div className="flex flex-col gap-2 mt-2">
                                <button
                                    onClick={() => handleCancelLesson(viewingLesson.id)}
                                    className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                                >
                                    Cancel lesson
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
}

export default StudentScheduleGrid;
