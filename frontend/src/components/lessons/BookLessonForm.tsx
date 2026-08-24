import { useState } from "react";
import TimeSelect from "../TimeSelect";
import type { Student, Subject } from "../../types";
import { inputClass, labelClass, primaryButtonClass, smallSecondaryButtonClass } from "../../constants/formStyles";
import { addOneHour, todayDateString } from "../../utils/time";

type BookLessonFormProps = {
    students: Student[];
    subjects: Subject[];
    onBook: (body: {
        studentId: number;
        subjectId: number;
        date: string;
        startTime: string;
        endTime: string;
    }) => Promise<boolean>;
    onCreateSubject: (name: string) => Promise<Subject | null>;
};

// the teacher's booking form. date/time default to today 08:00-09:00 instead of
// blank, since most bookings only need the student/subject changed
export default function BookLessonForm({ students, subjects, onBook, onCreateSubject }: BookLessonFormProps) {
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [date, setDate] = useState(todayDateString());
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("09:00");

    // inline "+ New subject..." creation from the dropdown, so adding a subject on
    // the fly doesn't require leaving this page
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState("");

    // keeps the lesson an hour long by default when the start moves
    function handleStartTimeChange(value: string) {
        setStartTime(value);
        if (!value) return;
        setEndTime(addOneHour(value));
    }

    async function handleCreateSubjectInline() {
        const name = newSubjectName.trim();
        if (!name) return;

        const created = await onCreateSubject(name);
        if (!created) return;

        setSelectedSubjectId(String(created.id));
        setNewSubjectName("");
        setIsAddingSubject(false);
    }

    function handleBook() {
        onBook({
            studentId: Number(selectedStudentId),
            subjectId: Number(selectedSubjectId),
            date,
            startTime,
            endTime,
        });
    }

    return (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Book a lesson for a student</h2>

            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Student</label>
                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className={inputClass}
                    >
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
                    {isAddingSubject ? (
                        <div className="flex gap-1">
                            <input
                                autoFocus
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreateSubjectInline()}
                                placeholder="New subject name"
                                className={inputClass}
                            />
                            <button onClick={handleCreateSubjectInline} className={smallSecondaryButtonClass}>
                                Add
                            </button>
                            <button
                                onClick={() => { setIsAddingSubject(false); setNewSubjectName(""); }}
                                className="px-2 text-slate-400 hover:text-slate-600"
                            >
                                &times;
                            </button>
                        </div>
                    ) : (
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => {
                                if (e.target.value === "__new__") {
                                    setIsAddingSubject(true);
                                    return;
                                }
                                setSelectedSubjectId(e.target.value);
                            }}
                            className={inputClass}
                        >
                            <option value="">Select subject</option>
                            {subjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                            <option value="__new__">+ New subject...</option>
                        </select>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Start time</label>
                    <TimeSelect value={startTime} onChange={handleStartTimeChange} className={inputClass} />
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>End time</label>
                    <TimeSelect value={endTime} onChange={setEndTime} className={inputClass} />
                </div>

                <button onClick={handleBook} className={primaryButtonClass}>
                    Book lesson
                </button>
            </div>
        </div>
    );
}
