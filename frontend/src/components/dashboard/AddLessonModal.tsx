import { useEffect, useState } from "react";
import Modal from "../Modal";
import TimeSelect from "../TimeSelect";
import { apiFetch, readErrorMessage } from "../../utils/api";
import { addOneHour } from "../../utils/time";
import { inputClassFull, labelClass } from "../../constants/formStyles";
import type { Student, Subject } from "../../types";

type AddLessonModalProps = {
    students: Student[];
    onClose: () => void;
    onCreated: () => void;
};

// the dashboard's quick "+ Add lesson" shortcut. loads its own subject list on open
// rather than having the page hold subjects it otherwise never uses.
export default function AddLessonModal({ students, onClose, onCreated }: AddLessonModalProps) {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [studentId, setStudentId] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [date, setDate] = useState("");
    // real defaults rather than "" - TimeSelect has no blank option, so an empty
    // value would render as 00:00 while the form still submitted an empty string
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("09:00");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadSubjects() {
            const response = await apiFetch(`/subjects`);
            if (!response.ok) return;
            setSubjects((await response.json()) as Subject[]);
        }
        loadSubjects();
    }, []);

    function handleStartTimeChange(value: string) {
        setStartTime(value);
        if (value) setEndTime(addOneHour(value));
    }

    async function handleCreate() {
        setErrorMessage("");

        if (!studentId || !subjectId || !date || !startTime || !endTime) {
            setErrorMessage("Please fill in all fields");
            return;
        }

        const response = await apiFetch(`/teacher/lessons`, {
            method: "POST",
            body: JSON.stringify({
                studentId: Number(studentId),
                subjectId: Number(subjectId),
                date,
                startTime,
                endTime,
            }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to create lesson"));
            return;
        }

        onCreated();
        onClose();
    }

    return (
        <Modal title="Add lesson" onClose={onClose}>
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

                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

                <button
                    onClick={handleCreate}
                    className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    Add lesson
                </button>
            </div>
        </Modal>
    );
}
