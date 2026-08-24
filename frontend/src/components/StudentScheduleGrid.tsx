import { useState } from "react";
import WeekGrid from "./WeekGrid";
import StudentBookLessonModal, { STUDENT_MIN_BOOKING_NOTICE_HOURS } from "./schedule/StudentBookLessonModal";
import StudentLessonModal from "./schedule/StudentLessonModal";
import { useStudentSchedule } from "../hooks/useStudentSchedule";
import { ROW_HEIGHT, addOneHour, minutesSinceMidnight, toDateString } from "../utils/time";
import {
    dayDateString,
    firstAvailableQuarterRun,
    getRuleCoverageQuarters,
    overlaps,
    quarterRunStartTime,
    ruleCoverageBackground,
    toPositionedBlock,
} from "../utils/availability";
import type { StudentLesson } from "../types/schedule";

// students shouldn't be able to tell a completed lesson apart from an upcoming
// one at a glance - both statuses render identically here, unlike the teacher's
// own schedule which does distinguish them
const lessonBlockStyles: Record<string, string> = {
    SCHEDULED: "bg-blue-100 hover:bg-blue-200",
    COMPLETED: "bg-blue-100 hover:bg-blue-200",
};

// the student-facing weekly schedule: shows the teacher's availability, other
// students' booked slots (grayed out, no details), and this student's own lessons.
// clicking an open slot books a lesson; clicking one of your own lessons lets you
// view/cancel it. shared between the dedicated /student/schedule page and the
// student dashboard, which embeds this same grid.
function StudentScheduleGrid() {
    const {
        weekDates, hours,
        hourStart, hourEnd, setHourStart, setHourEnd,
        goToPreviousWeek, goToNextWeek,
        scheduleRules, scheduleOverrides, lessons, busySlots, subjects,
        now,
        errorMessage,
        bookLesson, cancelLesson,
    } = useStudentSchedule();

    // the cell the student clicked, which pre-fills the booking modal
    const [bookingSlot, setBookingSlot] = useState<{ date: string; startTime: string; endTime: string } | null>(null);
    const [viewingLesson, setViewingLesson] = useState<StudentLesson | null>(null);

    const todayDayIndex = weekDates.findIndex((date) => toDateString(date) === toDateString(now));
    const nowMinutes = minutesSinceMidnight(now);
    const nowLineTop = ((nowMinutes - hourStart * 60) / 60) * ROW_HEIGHT;
    const showNowLine = todayDayIndex !== -1 && nowMinutes >= hourStart * 60 && nowMinutes <= hourEnd * 60;

    function quartersForCell(dayIndex: number, hour: number): boolean[] {
        return getRuleCoverageQuarters(dayIndex, hour, dayDateString(weekDates, dayIndex), scheduleRules, scheduleOverrides);
    }

    // whether the whole hour is off-limits for booking - a BLOCK override, an
    // existing lesson, or a slot someone else already booked. an ADD override is
    // deliberately NOT included here: it's meant to open the slot up for booking,
    // so it's handled by quartersForCell instead (same path as a weekly rule),
    // not treated as "covered"/unclickable
    function isCellCoveredByOverrideOrLesson(dayIndex: number, hour: number): boolean {
        const dateStr = dayDateString(weekDates, dayIndex);
        const cellStart = hour * 60;
        const cellEnd = cellStart + 60;

        const blocked = scheduleOverrides.some(
            (override) => override.type === "BLOCK" && override.date === dateStr && overlaps(override, cellStart, cellEnd)
        );

        const hasLesson = lessons.some(
            (lesson) => lesson.date === dateStr && overlaps(lesson, cellStart, cellEnd)
        );

        // busySlots already includes this student's own lessons too (they're
        // SCHEDULED/COMPLETED lessons like anyone else's), so checking it alone
        // would be enough, but the explicit lesson check above is kept since it's
        // also used to decide whether *this* student's own lesson block renders
        const bookedByAnyone = busySlots.some(
            (slot) => slot.date === dateStr && overlaps(slot, cellStart, cellEnd)
        );

        return blocked || hasLesson || bookedByAnyone;
    }

    // other students' busy slots for this day, excluding anything that overlaps one
    // of this student's own lessons (which render separately, in full detail)
    function getBusySlotsForDay(dayIndex: number) {
        const dateStr = dayDateString(weekDates, dayIndex);

        return busySlots
            .filter((slot) => slot.date === dateStr)
            .filter((slot) => !lessons.some(
                (lesson) =>
                    lesson.date === slot.date &&
                    lesson.startTime === slot.startTime &&
                    lesson.endTime === slot.endTime
            ))
            .map((slot) => toPositionedBlock(slot, hourStart, hourEnd))
            .filter((block) => block !== null);
    }

    function getLessonsForDay(dayIndex: number) {
        const dateStr = dayDateString(weekDates, dayIndex);

        return lessons
            .filter((lesson) => lesson.date === dateStr)
            .map((lesson) => toPositionedBlock(lesson, hourStart, hourEnd))
            .filter((block) => block !== null);
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

    // clicking a cell only opens the booking form when at least part of the hour is
    // actually bookable - a student can't add availability or block time like a
    // teacher can, so a fully unavailable cell (or one covered by a lesson/override)
    // does nothing. a partially-available cell (e.g. rule starts at 08:15) still opens
    // the form, pre-filled to the exact time that's actually available
    function handleCellClick(dayIndex: number, hour: number) {
        if (isCellCoveredByOverrideOrLesson(dayIndex, hour)) return;

        const availableRun = firstAvailableQuarterRun(quartersForCell(dayIndex, hour));
        if (!availableRun) return;

        const startTime = quarterRunStartTime(hour, availableRun.startQuarter);
        if (isCellTooSoonToBook(dayIndex, hour, startTime)) return;

        setBookingSlot({
            date: dayDateString(weekDates, dayIndex),
            startTime,
            endTime: addOneHour(startTime),
        });
    }

    async function handleCancelLesson(lessonId: number) {
        const cancelled = await cancelLesson(lessonId);
        if (cancelled) setViewingLesson(null);
    }

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
                onPreviousWeek={goToPreviousWeek}
                onNextWeek={goToNextWeek}
                todayDayIndex={todayDayIndex}
                showNowLine={showNowLine}
                nowLineTop={nowLineTop}
                hours={hours}
                renderDayColumn={(dayIndex) => (
                    <>
                        {hours.map((hour) => {
                            const quarters = quartersForCell(dayIndex, hour);
                            const allCovered = quarters.every(Boolean);
                            const noneCovered = quarters.every((covered) => !covered);

                            const availableRun = firstAvailableQuarterRun(quarters);
                            const isCovered = isCellCoveredByOverrideOrLesson(dayIndex, hour);
                            const runStartTime = availableRun
                                ? quarterRunStartTime(hour, availableRun.startQuarter)
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
                        {getBusySlotsForDay(dayIndex).map(({ item: slot, top, height }, index) => (
                            <div
                                key={`busy-${slot.date}-${slot.startTime}-${index}`}
                                className="absolute block left-0 right-0 m-0 bg-slate-200"
                                style={{ top: `${top}px`, height: `${height}px` }}
                            />
                        ))}

                        {getLessonsForDay(dayIndex).map(({ item: lesson, top, height }) => (
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

            {bookingSlot && (
                <StudentBookLessonModal
                    date={bookingSlot.date}
                    startTime={bookingSlot.startTime}
                    endTime={bookingSlot.endTime}
                    subjects={subjects}
                    onClose={() => setBookingSlot(null)}
                    onBook={bookLesson}
                />
            )}

            {viewingLesson && (
                <StudentLessonModal
                    lesson={viewingLesson}
                    now={now}
                    onClose={() => setViewingLesson(null)}
                    onCancel={handleCancelLesson}
                />
            )}
        </>
    );
}

export default StudentScheduleGrid;
