import { useEffect, useState } from "react";
import Modal from "../Modal";
import type { TeacherLesson } from "../../types/schedule";
import { hasLessonStarted } from "../../types/lesson";

/* Popup showing details for one of the teacher's lessons, with notes and
   the actions available for its current status. */

type TeacherLessonModalProps = {
    lesson: TeacherLesson;
    onClose: () => void;
    onSaveNotes: (lessonId: number, notes: string) => Promise<TeacherLesson | null>;
    onComplete: (lessonId: number) => void;
    onEdit: (lesson: TeacherLesson) => void;
    onCancel: (lessonId: number) => void;
};

export default function TeacherLessonModal({
    lesson, onClose, onSaveNotes, onComplete, onEdit, onCancel,
}: TeacherLessonModalProps) {
    /* own draft value so typing doesn't update the lesson list every keystroke */
    const [notesDraft, setNotesDraft] = useState(lesson.notes ?? "");
    const [savingNotes, setSavingNotes] = useState(false);

    /* resync the draft whenever a different lesson (or a freshly saved one) shows */
    useEffect(() => {
        setNotesDraft(lesson.notes ?? "");
    }, [lesson.id, lesson.notes]);

    /* Saves the notes draft for this lesson */
    async function handleSaveNotes() {
        setSavingNotes(true);
        await onSaveNotes(lesson.id, notesDraft);
        setSavingNotes(false);
    }

    return (
        <Modal title="Lesson" onClose={onClose}>
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-900">
                    {lesson.studentFirstName} {lesson.studentLastName}
                </p>
                <p className="text-sm text-slate-700">{lesson.subjectName}</p>
                <p className="text-sm text-slate-500">
                    {lesson.date} &middot; {lesson.startTime.slice(0, 5)}&ndash;{lesson.endTime.slice(0, 5)}
                </p>
                <p className="text-sm text-slate-500">Status: {lesson.status}</p>

                {lesson.status !== "CANCELLED" && (
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
                            onClick={handleSaveNotes}
                            disabled={savingNotes || notesDraft === (lesson.notes ?? "")}
                            className="self-end px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                        >
                            {savingNotes ? "Saving..." : "Save notes"}
                        </button>
                    </div>
                )}

                {lesson.status === "SCHEDULED" && (
                    <div className="flex flex-col gap-2 mt-2">
                        {hasLessonStarted(lesson) ? (
                            <button
                                onClick={() => onComplete(lesson.id)}
                                className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                            >
                                Mark completed
                            </button>
                        ) : (
                            <p className="text-xs text-slate-400">Can be marked completed once it starts.</p>
                        )}
                        <button
                            onClick={() => onEdit(lesson)}
                            className="w-full rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium py-2.5 hover:bg-slate-50 transition-colors"
                        >
                            Edit lesson
                        </button>
                        <button
                            onClick={() => onCancel(lesson.id)}
                            className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                        >
                            Cancel lesson
                        </button>
                    </div>
                )}

                {lesson.status === "COMPLETED" && (
                    <div className="flex flex-col gap-2 mt-2">
                        <p className="text-xs text-slate-400">
                            Cancelling a completed lesson removes it from the student's debt and this month's revenue.
                        </p>
                        <button
                            onClick={() => {
                                if (window.confirm("Cancel this completed lesson? This will reverse its effect on debt and revenue.")) {
                                    onCancel(lesson.id);
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
    );
}
