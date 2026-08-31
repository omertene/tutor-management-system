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

/* Scheduled and completed lessons look identical to the student - no need to
   tell them apart at a glance here like the teacher's schedule does */
const lessonBlockStyles: Record<string, string> = {
    SCHEDULED: "bg-blue-100 hover:bg-blue-200",
    COMPLETED: "bg-blue-100 hover:bg-blue-200",
};

/* Student-facing weekly schedule: shows the teacher's availability, other
   students' booked slots (grayed out), and this student's own lessons.
   Clicking an open slot books a lesson, clicking your own lesson lets you view
   or cancel it. Shared by the /student/schedule page and the student dashboard. */
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

    /* The cell the student clicked, pre-fills the booking modal */
    const [bookingSlot, setBookingSlot] = useState<{ date: string; startTime: string; endTime: string } | null>(null);
    const [viewingLesson, setViewingLesson] = useState<StudentLesson | null>(null);

    const todayDayIndex = weekDates.findIndex((date) => toDateString(date) === toDateString(now));
    const nowMinutes = minutesSinceMidnight(now);
    const nowLineTop = ((nowMinutes - hourStart * 60) / 60) * ROW_HEIGHT;
    const showNowLine = todayDayIndex !== -1 && nowMinutes >= hourStart * 60 && nowMinutes <= hourEnd * 60;

    /* Which quarter-hours of this cell are covered by a rule/override */
    function quartersForCell(dayIndex: number, hour: number): boolean[] {
        return getRuleCoverageQuarters(dayIndex, hour, dayDateString(weekDates, dayIndex), scheduleRules, scheduleOverrides);
    }

    /* Whether the whole hour is off-limits for booking: a BLOCK override, an
       existing lesson, or a slot someone else booked. An ADD override is NOT
       included here on purpose - it opens the slot up, so it goes through
       quartersForCell instead, same as a normal weekly rule */
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

        /* busySlots already includes this student's own lessons, so checking it
           alone would be enough, but the lesson check above is kept since it's
           also used to decide whether this student's own lesson block renders */
        const bookedByAnyone = busySlots.some(
            (slot) => slot.date === dateStr && overlaps(slot, cellStart, cellEnd)
        );

        return blocked || hasLesson || bookedByAnyone;
    }

    /* Other students' busy slots for this day, excluding anything that overlaps
       one of this student's own lessons (those render separately, in full detail) */
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

    /* This student's own lessons for this day, positioned for the grid */
    function getLessonsForDay(dayIndex: number) {
        const dateStr = dayDateString(weekDates, dayIndex);

        return lessons
            .filter((lesson) => lesson.date === dateStr)
            .map((lesson) => toPositionedBlock(lesson, hourStart, hourEnd))
            .filter((block) => block !== null);
    }

    /* startTime lets a partially-available cell be checked at its real bookable
       start instead of the hour boundary - falls back to :00 when omitted, which
       is used for the cell's hover/cursor styling before a start time is known */
    function isCellTooSoonToBook(dayIndex: number, hour: number, startTime?: string): boolean {
        const [startHour, startMinute] = startTime ? startTime.split(":").map(Number) : [hour, 0];
        const cellStart = new Date(weekDates[dayIndex]);
        cellStart.setHours(startHour, startMinute, 0, 0);
        const minBookingTime = new Date(now);
        minBookingTime.setHours(minBookingTime.getHours() + STUDENT_MIN_BOOKING_NOTICE_HOURS);
        return cellStart < minBookingTime;
    }

    /* Opens the booking form only when part of the hour is actually bookable - a
       student can't add availability like a teacher can, so a fully unavailable
       cell does nothing. A partially-available cell (rule starts at 08:15) still
       opens the form, pre-filled to the exact time that's actually free */
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

    /* Cancels a lesson and closes the view modal if it worked */
    async function handleCancelLesson(lessonId: number) {
        const cancelled = await cancelLesson(lessonId);
        if (cancelled) setViewingLesson(null);
    }

    return (
        <>


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

                        {/* another student's slot - a plain gray block, same as a cell outside the
                            teacher's hours, so you can't tell a booked slot from an unavailable one */}
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
