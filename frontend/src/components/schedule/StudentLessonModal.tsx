import Modal from "../Modal";
import type { StudentLesson } from "../../types/schedule";

/* Popup showing details for one of the student's own lessons, opened by
   clicking its block on the schedule. */

/* students can't cancel a lesson that starts within this many hours */
export const STUDENT_MIN_CANCEL_NOTICE_HOURS = 6;

type StudentLessonModalProps = {
    lesson: StudentLesson;
    now: Date;
    onClose: () => void;
    onCancel: (lessonId: number) => void;
};

/* True if there's still enough notice left to cancel this lesson */
export function canCancelLesson(lesson: StudentLesson, now: Date): boolean {
    const lessonStart = new Date(`${lesson.date}T${lesson.startTime}`);
    const minCancelTime = new Date(now);
    minCancelTime.setHours(minCancelTime.getHours() + STUDENT_MIN_CANCEL_NOTICE_HOURS);
    return lessonStart >= minCancelTime;
}

export default function StudentLessonModal({ lesson, now, onClose, onCancel }: StudentLessonModalProps) {
    const canCancel = canCancelLesson(lesson, now);

    return (
        <Modal title="Lesson" onClose={onClose}>
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-900">{lesson.subjectName}</p>
                <p className="text-sm text-slate-500">
                    {lesson.date} &middot; {lesson.startTime.slice(0, 5)}&ndash;{lesson.endTime.slice(0, 5)}
                </p>

                {lesson.status === "SCHEDULED" && (
                    <div className="flex flex-col gap-2 mt-2">
                        <button
                            onClick={() => onCancel(lesson.id)}
                            disabled={!canCancel}
                            title={
                                canCancel
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
    );
}
