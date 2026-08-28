import { useState } from "react";
import Modal from "../Modal";
import TimeSelect from "../TimeSelect";
import { inputClassFull, labelClass } from "../../constants/formStyles";
import { addOneHour } from "../../utils/time";
import type { Subject, TeacherLesson, TeacherStudent } from "../../types/schedule";

/* Modal for the teacher to book a new lesson, or edit an existing one when
   draft.lessonId is set. */

/* What the modal opens with: a blank booking for a chosen range, or an
   existing lesson being edited */
export type LessonDraft = {
    lessonId: number | null;
    date: string;
    startTime: string;
    endTime: string;
    studentId: string;
    subjectId: string;
    /* routes to the endpoint that also creates an ADD override, so this can
       book outside the teacher's normal weekly availability */
    outsideHours: boolean;
};

/* Builds an empty draft for booking a brand new lesson */
export function draftForNewLesson(date: string, startTime: string, endTime: string, outsideHours = false): LessonDraft {
    return { lessonId: null, date, startTime, endTime, studentId: "", subjectId: "", outsideHours };
}

/* Builds a draft pre-filled from an existing lesson, for editing */
export function draftForExistingLesson(lesson: TeacherLesson): LessonDraft {
    return {
        lessonId: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime.slice(0, 5),
        endTime: lesson.endTime.slice(0, 5),
        studentId: String(lesson.studentId),
        subjectId: String(lesson.subjectId),
        outsideHours: false,
    };
}

type BookLessonModalProps = {
    draft: LessonDraft;
    students: TeacherStudent[];
    subjects: Subject[];
    onClose: () => void;
    onSave: (
        body: { studentId: number; subjectId: number; date: string; startTime: string; endTime: string },
        editingLessonId: number | null,
        bookingOutsideHours: boolean,
    ) => Promise<string | null>;
};

export default function BookLessonModal({ draft, students, subjects, onClose, onSave }: BookLessonModalProps) {
    const [date, setDate] = useState(draft.date);
    const [startTime, setStartTime] = useState(draft.startTime);
    const [endTime, setEndTime] = useState(draft.endTime);
    const [studentId, setStudentId] = useState(draft.studentId);
    const [subjectId, setSubjectId] = useState(draft.subjectId);
    const [error, setError] = useState("");

    const isEditing = draft.lessonId !== null;

    /* Keeps the lesson an hour long by default when the start moves */
    function handleStartTimeChange(value: string) {
        setStartTime(value);
        if (value) setEndTime(addOneHour(value));
    }

    /* Validates the form and saves the lesson (create or edit) */
    async function handleSave() {
        setError("");

        if (!studentId || !subjectId || !date || !startTime || !endTime) {
            setError("Please fill in all fields");
            return;
        }

        const failure = await onSave(
            {
                studentId: Number(studentId),
                subjectId: Number(subjectId),
                date,
                startTime,
                endTime,
            },
            draft.lessonId,
            draft.outsideHours,
        );

        if (failure) {
            setError(failure);
            return;
        }

        onClose();
    }

    return (
        <Modal title={isEditing ? "Edit lesson" : "Book a lesson"} onClose={onClose}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Student</label>
                    <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClassFull}>
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
                    <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputClassFull}>
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
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClassFull} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Start time</label>
                        <TimeSelect value={startTime} onChange={handleStartTimeChange} className={inputClassFull} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>End time</label>
                        <TimeSelect value={endTime} onChange={setEndTime} className={inputClassFull} />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    onClick={handleSave}
                    className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    {isEditing ? "Save changes" : "Book lesson"}
                </button>
            </div>
        </Modal>
    );
}
