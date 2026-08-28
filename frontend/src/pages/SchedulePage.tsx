import { useState } from "react";
import NavBar from "../components/NavBar";
import WeekGrid from "../components/WeekGrid";
import ScheduleRulesModal from "../components/ScheduleRulesModal";
import ChooseActionModal from "../components/schedule/ChooseActionModal";
import BookLessonModal, { draftForExistingLesson, draftForNewLesson } from "../components/schedule/BookLessonModal";
import type { LessonDraft } from "../components/schedule/BookLessonModal";
import { OverrideFormModal, ViewOverrideModal, draftForExistingOverride, draftForNewOverride } from "../components/schedule/OverrideModals";
import type { OverrideDraft } from "../components/schedule/OverrideModals";
import TeacherLessonModal from "../components/schedule/TeacherLessonModal";
import { useTeacherSchedule } from "../hooks/useTeacherSchedule";
import { useDragSelect } from "../hooks/useDragSelect";
import type { ScheduleOverride, TeacherLesson } from "../types/schedule";
import { teacherLinks } from "../constants/navLinks";
import { ROW_HEIGHT, minutesSinceMidnight, toDateString } from "../utils/time";
import {
    dayDateString,
    getRuleOnlyCoverageQuarters,
    hourToTime,
    isRangeCoveredByRule,
    overlaps,
    ruleCoverageBackground,
    toPositionedBlock,
} from "../utils/availability";

const overrideBlockStyles: Record<string, string> = {
    BLOCK: "bg-red-100 hover:bg-red-200",
    ADD: "bg-green-100 hover:bg-green-200",
};

const lessonBlockStyles: Record<string, string> = {
    /* Indigo matches the app's primary action color, so an upcoming lesson
       reads as "the active thing to look at" */
    SCHEDULED: "bg-indigo-100 hover:bg-indigo-200",
    /* Teal is distinct from every other color on the grid (red/green/indigo/
       gray) and reads as "done, nothing to act on" */
    COMPLETED: "bg-teal-100 hover:bg-teal-200",
};

/* The range a click or drag resolved to, which the choose-action popup acts on */
type SelectedRange = {
    date: string;
    startTime: string;
    endTime: string;
    isUnavailable: boolean;
};

/* The teacher's weekly schedule: availability rules as the grid background,
   overrides and lessons as blocks on top, click or drag a cell to add a lesson
   or override */
function SchedulePage() {
    const {
        weekDates, hours,
        hourStart, hourEnd, setHourStart, setHourEnd,
        goToPreviousWeek, goToNextWeek,
        scheduleRules, setScheduleRules, scheduleOverrides, lessons, students, subjects,
        now,
        errorMessage,
        saveLesson, saveOverride, saveNotes,
        completeLesson, cancelLesson, deleteOverride,
    } = useTeacherSchedule();

    const [showRulesModal, setShowRulesModal] = useState(false);
    const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);
    const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
    const [overrideDraft, setOverrideDraft] = useState<OverrideDraft | null>(null);
    const [viewingOverride, setViewingOverride] = useState<ScheduleOverride | null>(null);
    const [viewingLesson, setViewingLesson] = useState<TeacherLesson | null>(null);

    const todayDayIndex = weekDates.findIndex((date) => toDateString(date) === toDateString(now));
    const nowMinutes = minutesSinceMidnight(now);
    const nowLineTop = ((nowMinutes - hourStart * 60) / 60) * ROW_HEIGHT;
    const showNowLine = todayDayIndex !== -1 && nowMinutes >= hourStart * 60 && nowMinutes <= hourEnd * 60;

    /* Whether any part of this hour cell is covered by an override or a lesson -
       so the plain background cell isn't clickable underneath an existing block */
    function isCellCoveredByOverride(dayIndex: number, hour: number): boolean {
        const dateStr = dayDateString(weekDates, dayIndex);
        const cellStart = hour * 60;
        const cellEnd = cellStart + 60;

        const overridden = scheduleOverrides.some(
            (override) => override.date === dateStr && overlaps(override, cellStart, cellEnd)
        );

        const hasLesson = lessons.some(
            (lesson) => lesson.date === dateStr && overlaps(lesson, cellStart, cellEnd)
        );

        return overridden || hasLesson;
    }

    /* Extends [startHour, hour] to the widest contiguous run of cells sharing the
       same availability as the starting cell, so a drag across mixed cells
       doesn't include time the teacher didn't intend to select */
    function clampRangeToUniformAvailability(dayIndex: number, startHour: number, hour: number): [number, number] {
        const startAvailable = isRangeCoveredByRule(dayIndex, startHour, startHour + 1, scheduleRules);
        const lo = Math.min(startHour, hour);
        const hi = Math.max(startHour, hour);

        let rangeStart = startHour;
        let rangeEnd = startHour;
        for (let h = startHour; h >= lo; h--) {
            if (isRangeCoveredByRule(dayIndex, h, h + 1, scheduleRules) !== startAvailable || isCellCoveredByOverride(dayIndex, h)) break;
            rangeStart = h;
        }
        for (let h = startHour; h <= hi; h++) {
            if (isRangeCoveredByRule(dayIndex, h, h + 1, scheduleRules) !== startAvailable || isCellCoveredByOverride(dayIndex, h)) break;
            rangeEnd = h;
        }
        return [rangeStart, rangeEnd + 1];
    }

    /* Opens the choose-action popup for a resolved range - offers "Add
       availability" only where the backend would accept it (no rule overlaps),
       "Block this time" only where some rule does overlap */
    function openPopupForRange(dayIndex: number, startHour: number, endHour: number) {
        setSelectedRange({
            date: dayDateString(weekDates, dayIndex),
            startTime: hourToTime(startHour),
            endTime: hourToTime(endHour),
            isUnavailable: !isRangeCoveredByRule(dayIndex, startHour, endHour, scheduleRules),
        });
    }

    const { handleCellMouseDown, handleCellMouseEnter, isCellInDragSelection } = useDragSelect({
        isCellBlocked: isCellCoveredByOverride,
        clampRange: clampRangeToUniformAvailability,
        onRangeSelected: openPopupForRange,
    });

    /* Opens the booking modal pre-filled from the selected range */
    function handleChooseBookLesson() {
        if (!selectedRange) return;
        setLessonDraft(draftForNewLesson(
            selectedRange.date, selectedRange.startTime, selectedRange.endTime, selectedRange.isUnavailable
        ));
        setSelectedRange(null);
    }

    /* Opens the override modal pre-filled from the selected range */
    function handleChooseOverride(type: string) {
        if (!selectedRange) return;
        setOverrideDraft(draftForNewOverride(
            selectedRange.date, selectedRange.startTime, selectedRange.endTime, type
        ));
        setSelectedRange(null);
    }

    /* Completes a lesson and closes its view modal if it worked */
    async function handleCompleteLesson(lessonId: number) {
        if (await completeLesson(lessonId)) setViewingLesson(null);
    }

    /* Cancels a lesson and closes its view modal if it worked */
    async function handleCancelLesson(lessonId: number) {
        if (await cancelLesson(lessonId)) setViewingLesson(null);
    }

    /* Deletes an override and closes its view modal if it worked */
    async function handleDeleteOverride(overrideId: number) {
        if (await deleteOverride(overrideId)) setViewingOverride(null);
    }

    /* Saves notes and keeps the open modal showing the saved value, so its
       "Save notes" button disables again once the draft matches */
    async function handleSaveNotes(lessonId: number, notes: string) {
        const updated = await saveNotes(lessonId, notes);
        if (updated) setViewingLesson(updated);
        return updated;
    }

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
                        onPreviousWeek={goToPreviousWeek}
                        onNextWeek={goToNextWeek}
                        todayDayIndex={todayDayIndex}
                        showNowLine={showNowLine}
                        nowLineTop={nowLineTop}
                        hours={hours}
                        renderDayColumn={(dayIndex) => (
                            <>
                                {hours.map((hour) => {
                                    const quarters = getRuleOnlyCoverageQuarters(dayIndex, hour, scheduleRules);
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

                                {scheduleOverrides
                                    .filter((override) => override.date === dayDateString(weekDates, dayIndex))
                                    .map((override) => toPositionedBlock(override, hourStart, hourEnd))
                                    .filter((block) => block !== null)
                                    .map(({ item: override, top, height }) => (
                                        <button
                                            key={`override-${override.id}`}
                                            onClick={() => setViewingOverride(override)}
                                            className={`absolute block left-0 right-0 m-0 px-1.5 py-1 text-xs text-left leading-tight overflow-hidden transition-colors ${overrideBlockStyles[override.type]}`}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                        />
                                    ))}

                                {lessons
                                    .filter((lesson) => lesson.date === dayDateString(weekDates, dayIndex))
                                    .map((lesson) => toPositionedBlock(lesson, hourStart, hourEnd))
                                    .filter((block) => block !== null)
                                    .map(({ item: lesson, top, height }) => (
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
                            </>
                        )}
                    />
                </div>
            </main>

            {selectedRange && (
                <ChooseActionModal
                    date={selectedRange.date}
                    startTime={selectedRange.startTime}
                    endTime={selectedRange.endTime}
                    isUnavailable={selectedRange.isUnavailable}
                    onClose={() => setSelectedRange(null)}
                    onBookLesson={handleChooseBookLesson}
                    onBlockTime={() => handleChooseOverride("BLOCK")}
                    onAddAvailability={() => handleChooseOverride("ADD")}
                />
            )}

            {lessonDraft && (
                <BookLessonModal
                    draft={lessonDraft}
                    students={students}
                    subjects={subjects}
                    onClose={() => setLessonDraft(null)}
                    onSave={saveLesson}
                />
            )}

            {overrideDraft && (
                <OverrideFormModal
                    draft={overrideDraft}
                    onClose={() => setOverrideDraft(null)}
                    onSave={saveOverride}
                />
            )}

            {viewingOverride && (
                <ViewOverrideModal
                    override={viewingOverride}
                    onClose={() => setViewingOverride(null)}
                    onBookLesson={(override) => {
                        setLessonDraft(draftForNewLesson(
                            override.date,
                            override.startTime.slice(0, 5),
                            override.endTime.slice(0, 5)
                        ));
                        setViewingOverride(null);
                    }}
                    onEdit={(override) => {
                        setOverrideDraft(draftForExistingOverride(override));
                        setViewingOverride(null);
                    }}
                    onDelete={handleDeleteOverride}
                />
            )}

            {viewingLesson && (
                <TeacherLessonModal
                    lesson={viewingLesson}
                    onClose={() => setViewingLesson(null)}
                    onSaveNotes={handleSaveNotes}
                    onComplete={handleCompleteLesson}
                    onEdit={(lesson) => {
                        setLessonDraft(draftForExistingLesson(lesson));
                        setViewingLesson(null);
                    }}
                    onCancel={handleCancelLesson}
                />
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
