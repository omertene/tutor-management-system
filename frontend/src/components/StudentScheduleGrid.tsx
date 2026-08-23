import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import TimeSelect from "./TimeSelect";
import WeekGrid from "./WeekGrid";
import { API_BASE_URL, readErrorMessage, getToken } from "../utils/api";
import {
    days,
    DEFAULT_HOUR_START, DEFAULT_HOUR_END, ROW_HEIGHT,
    addOneHour, getStartOfWeek, toDateString, timeToMinutes, minutesSinceMidnight,
} from "../utils/time";

const STUDENT_MIN_BOOKING_NOTICE_HOURS = 2;
const STUDENT_MIN_CANCEL_NOTICE_HOURS = 6;

type ScheduleRule = {
    id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
};

// student-facing shape only - GET /student/schedule-overrides deliberately omits
// id and note (the teacher's private text), see StudentAvailabilityController
type ScheduleOverride = {
    date: string;
    startTime: string;
    endTime: string;
    type: string;
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

// the student-facing weekly schedule: shows the teacher's availability, other
// students' booked slots (grayed out, no details), and this student's own lessons.
// clicking an open slot books a lesson; clicking one of your own lessons lets you
// view/cancel it. shared between the dedicated /student/schedule page and the
// student dashboard, which embeds this same grid.
function StudentScheduleGrid() {
    const token = getToken();

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
        const response = await fetch(`${API_BASE_URL}/student/schedule-rules`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data: ScheduleRule[] = await response.json();
        setScheduleRules(data);
    }

    // the student-facing endpoint returns date/time/type only - no id, no note.
    // ScheduleOverride here is typed with id/note as optional since the response
    // won't include them, but nothing in this component reads either field
    async function loadOverrides() {
        const response = await fetch(`${API_BASE_URL}/student/schedule-overrides`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data: ScheduleOverride[] = await response.json();
        setScheduleOverrides(data);
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
        const data: Subject[] = await response.json();
        setSubjects(data);
    }

    // other students' booked slots, shown as blocked/gray so this student doesn't
    // try to double-book a time that's actually already taken. scoped to the visible
    // week only - this endpoint used to return every non-cancelled lesson ever
    // booked, which meant it got slower every time any student booked a lesson,
    // forever, even though the grid only ever shows one week at a time
    async function loadBusySlots(weekStartDate: Date) {
        const rangeStart = toDateString(weekStartDate);
        const rangeEndDate = new Date(weekStartDate);
        rangeEndDate.setDate(weekStartDate.getDate() + 6);
        const rangeEnd = toDateString(rangeEndDate);

        const response = await fetch(
            `${API_BASE_URL}/student/busy-slots?startDate=${rangeStart}&endDate=${rangeEnd}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) return;
        const data: BusySlot[] = await response.json();
        setBusySlots(data);
    }

    useEffect(() => {
        loadRules();
        loadOverrides();
        loadLessons();
        loadSubjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // re-fetches whenever the visible week changes, since busy slots are now
    // scoped server-side to a date range instead of covering all time
    useEffect(() => {
        loadBusySlots(weekStart);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekStart]);

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

    // which of the 4 quarter-hour slots within this cell are actually bookable -
    // a quarter counts as available if it's covered by a weekly rule OR an ADD
    // override (the teacher explicitly opening up extra time), and NOT covered by
    // a BLOCK override (which always wins over both). students never see overrides
    // as their own distinct thing - an ADD override just looks/behaves like normal
    // availability (white), a BLOCK override like normal unavailability (gray),
    // same principle as hiding "Booked"/override notes elsewhere in this component
    function getRuleCoverageQuartersForCell(dayIndex: number, hour: number): boolean[] {
        const dateStr = toDateString(weekDates[dayIndex]);
        const cellStart = hour * 60;

        return [0, 1, 2, 3].map((quarter) => {
            const quarterStart = cellStart + quarter * 15;
            const quarterEnd = quarterStart + 15;

            const coveredByRule = scheduleRules.some(
                (rule) =>
                    rule.dayOfWeek === days[dayIndex] &&
                    timeToMinutes(rule.startTime) <= quarterStart &&
                    timeToMinutes(rule.endTime) >= quarterEnd
            );

            const coveredByAddOverride = scheduleOverrides.some(
                (override) =>
                    override.type === "ADD" &&
                    override.date === dateStr &&
                    timeToMinutes(override.startTime) <= quarterStart &&
                    timeToMinutes(override.endTime) >= quarterEnd
            );

            const coveredByBlockOverride = scheduleOverrides.some(
                (override) =>
                    override.type === "BLOCK" &&
                    override.date === dateStr &&
                    timeToMinutes(override.startTime) < quarterEnd &&
                    timeToMinutes(override.endTime) > quarterStart
            );

            return (coveredByRule || coveredByAddOverride) && !coveredByBlockOverride;
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

    // whether the whole hour is off-limits for booking - a BLOCK override, an
    // existing lesson, or a slot someone else already booked. an ADD override is
    // deliberately NOT included here anymore: it's meant to open the slot up for
    // booking, so it's handled by getRuleCoverageQuartersForCell instead (same
    // path as a weekly rule), not treated as "covered"/unclickable
    function isCellCoveredByOverrideOrLesson(dayIndex: number, hour: number) {
        const dateStr = toDateString(weekDates[dayIndex]);
        const cellStart = hour * 60;
        const cellEnd = cellStart + 60;

        const blocked = scheduleOverrides.some(
            (override) =>
                override.type === "BLOCK" &&
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

        return blocked || hasLesson || bookedByAnyone;
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

    // startTime (HH:MM) lets a partially-available cell be checked at its actual
    // bookable start rather than the hour boundary - falls back to :00 when omitted,
    // used for the cell's hover/cursor styling before a specific start is known
    function isCellTooSoonToBook(dayIndex: number, hour: number, startTime?: string): boolean {
        const [startHour, startMinute] = startTime ? startTime.split(":").map(Number) : [hour, 0];
        const cellStart = new Date(weekDates[dayIndex]);
        cellStart.setHours(startHour, startMinute, 0, 0);
        const minBookingTime = new Date(now);
        minBookingTime.setHours(minBookingTime.getHours() + STUDENT_MIN_BOOKING_NOTICE_HOURS);
        return cellStart < minBookingTime;
    }

    function canCancelLesson(lesson: Lesson): boolean {
        const lessonStart = new Date(`${lesson.date}T${lesson.startTime}`);
        const minCancelTime = new Date(now);
        minCancelTime.setHours(minCancelTime.getHours() + STUDENT_MIN_CANCEL_NOTICE_HOURS);
        return lessonStart >= minCancelTime;
    }

    // finds the first run of covered quarters within this hour cell, so a rule like
    // 08:15-13:00 (quarters [false, true, true, true]) resolves to a 08:15 start
    // instead of leaving the whole 08:00 row unclickable
    function firstAvailableQuarterRun(dayIndex: number, hour: number): { startQuarter: number; quarterCount: number } | null {
        const quarters = getRuleCoverageQuartersForCell(dayIndex, hour);
        const startQuarter = quarters.indexOf(true);
        if (startQuarter === -1) return null;

        let quarterCount = 0;
        for (let i = startQuarter; i < quarters.length && quarters[i]; i++) quarterCount++;

        return { startQuarter, quarterCount };
    }

    // clicking a cell only opens the booking form when at least part of the hour is
    // actually bookable - a student can't add availability or block time like a
    // teacher can, so a fully unavailable cell (or one covered by a lesson/override)
    // does nothing. a partially-available cell (e.g. rule starts at 08:15) still opens
    // the form, pre-filled to the exact time that's actually available
    function handleCellClick(dayIndex: number, hour: number) {
        if (isCellCoveredByOverrideOrLesson(dayIndex, hour)) return;

        const availableRun = firstAvailableQuarterRun(dayIndex, hour);
        if (!availableRun) return;

        const startMinutes = hour * 60 + availableRun.startQuarter * 15;
        const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`;

        if (isCellTooSoonToBook(dayIndex, hour, startTime)) return;

        const endTime = addOneHour(startTime);

        setBookError("");
        setBookSubjectId("");
        setBookDate(toDateString(weekDates[dayIndex]));
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
        // a plain "YYYY-MM-DD" string parses as UTC midnight, not local midnight -
        // setHours() below would then apply local time to a UTC-based instant, which
        // silently shifts the date west of Greenwich (harmless at UTC+3, wrong there).
        // building from y/m/d components uses the local-time Date constructor instead
        const [bookYear, bookMonthNum, bookDay] = bookDate.split("-").map(Number);
        const requestedStart = new Date(bookYear, bookMonthNum - 1, bookDay);
        requestedStart.setHours(bookHour, bookMinute, 0, 0);
        const minBookingTime = new Date();
        minBookingTime.setHours(minBookingTime.getHours() + STUDENT_MIN_BOOKING_NOTICE_HOURS);
        if (requestedStart < minBookingTime) {
            setBookError(`Lessons must be booked at least ${STUDENT_MIN_BOOKING_NOTICE_HOURS} hours in advance`);
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
            setBookError(await readErrorMessage(response, "Failed to book lesson"));
            return;
        }

        const createdLesson: Lesson = await response.json();
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
            setErrorMessage(await readErrorMessage(response, "Failed to cancel lesson"));
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

    // students shouldn't be able to tell a completed lesson apart from an upcoming
    // one at a glance - both statuses render identically here, unlike the teacher's
    // own schedule which does distinguish them
    const lessonBlockStyles: Record<string, string> = {
        SCHEDULED: "bg-blue-100 hover:bg-blue-200",
        COMPLETED: "bg-blue-100 hover:bg-blue-200",
    };

    const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "text-sm font-medium text-slate-700";

    return (
        <>
            <div>
                <p className="text-slate-500 text-sm">White = available, gray = unavailable, split = partly available within the hour, blue = your lesson. Click an open slot to book.</p>
            </div>

            {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

            <div className="mt-4">
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

                            const availableRun = firstAvailableQuarterRun(dayIndex, hour);
                            const isCovered = isCellCoveredByOverrideOrLesson(dayIndex, hour);
                            const runStartMinutes = availableRun ? hour * 60 + availableRun.startQuarter * 15 : null;
                            const runStartTime = runStartMinutes !== null
                                ? `${String(Math.floor(runStartMinutes / 60)).padStart(2, "0")}:${String(runStartMinutes % 60).padStart(2, "0")}`
                                : undefined;
                            const isTooSoon = availableRun !== null && isCellTooSoonToBook(dayIndex, hour, runStartTime);
                            const isClickable = !isCovered && availableRun !== null && !isTooSoon;

                            return (
                                <button
                                    key={hour}
                                    onClick={() => handleCellClick(dayIndex, hour)}
                                    style={{
                                        height: `${ROW_HEIGHT}px`,
                                        boxSizing: "border-box",
                                        background: allCovered || noneCovered ? undefined : ruleCoverageBackground(quarters),
                                    }}
                                    className={`block w-full border-b border-slate-300 transition-colors select-none ${
                                        allCovered
                                            ? `bg-white ${isClickable ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}`
                                            : noneCovered
                                                ? "bg-slate-200 cursor-default"
                                                : isClickable
                                                    ? "hover:brightness-95 cursor-pointer"
                                                    : "cursor-default"
                                    }`}
                                />
                            );
                        })}

                        {/* slots taken by another student - rendered as a plain gray block with no
                            label or tooltip, identical to a cell that's simply outside the teacher's
                            availability rules, so a student can't tell the two apart or infer that
                            a lesson is booked there */}
                        {getBusySlotsForDay(dayIndex).map(({ slot, top, height }, index) => (
                            <div
                                key={`busy-${slot.date}-${slot.startTime}-${index}`}
                                className="absolute block left-0 right-0 m-0 bg-slate-200"
                                style={{ top: `${top}px`, height: `${height}px` }}
                            />
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
                    </>
                )}
            />
            </div>

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

                        {viewingLesson.status === "SCHEDULED" && (
                            <div className="flex flex-col gap-2 mt-2">
                                <button
                                    onClick={() => handleCancelLesson(viewingLesson.id)}
                                    disabled={!canCancelLesson(viewingLesson)}
                                    title={
                                        canCancelLesson(viewingLesson)
                                            ? undefined
                                            : `Can't be cancelled within ${STUDENT_MIN_CANCEL_NOTICE_HOURS} hours of the start time.`
                                    }
                                    className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
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
