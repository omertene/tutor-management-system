import { useState } from "react";
import Modal from "../Modal";
import TimeSelect from "../TimeSelect";
import { inputClassFull, labelClass } from "../../constants/formStyles";
import { addOneHour, toDateString } from "../../utils/time";
import type { Subject } from "../../types/schedule";

/* Popup for a student to book a lesson, opened by clicking an available
   cell on the schedule. */

/* students can't book a lesson starting sooner than this */
export const STUDENT_MIN_BOOKING_NOTICE_HOURS = 2;

type StudentBookLessonModalProps = {
    date: string;
    startTime: string;
    endTime: string;
    subjects: Subject[];
    onClose: () => void;
    onBook: (body: {
        subjectId: number;
        date: string;
        startTime: string;
        endTime: string;
    }) => Promise<string | null>;
};

export default function StudentBookLessonModal({
    date: initialDate, startTime: initialStartTime, endTime: initialEndTime,
    subjects, onClose, onBook,
}: StudentBookLessonModalProps) {
    const [date, setDate] = useState(initialDate);
    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState(initialEndTime);
    const [subjectId, setSubjectId] = useState("");
    const [error, setError] = useState("");

    /* Keeps the lesson an hour long by default when the start moves */
    function handleStartTimeChange(value: string) {
        setStartTime(value);
        if (value) setEndTime(addOneHour(value));
    }

    /* Validates the form, checks the minimum booking notice, then books it */
    async function handleBook() {
        setError("");

        if (!subjectId || !date || !startTime || !endTime) {
            setError("Please fill in all fields");
            return;
        }

        const [bookHour, bookMinute] = startTime.split(":").map(Number);
        const [bookYear, bookMonthNum, bookDay] = date.split("-").map(Number);
        const requestedStart = new Date(bookYear, bookMonthNum - 1, bookDay);
        requestedStart.setHours(bookHour, bookMinute, 0, 0);
        const minBookingTime = new Date();
        minBookingTime.setHours(minBookingTime.getHours() + STUDENT_MIN_BOOKING_NOTICE_HOURS);
        if (requestedStart < minBookingTime) {
            setError(`Lessons must be booked at least ${STUDENT_MIN_BOOKING_NOTICE_HOURS} hours in advance`);
            return;
        }

        const failure = await onBook({
            subjectId: Number(subjectId),
            date,
            startTime,
            endTime,
        });

        if (failure) {
            setError(failure);
            return;
        }

        onClose();
    }

    return (
        <Modal title="Book a lesson" onClose={onClose}>
            <div className="flex flex-col gap-3">
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
                    <input type="date" value={date} min={toDateString(new Date())} onChange={(e) => setDate(e.target.value)} className={inputClassFull} />
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
                    onClick={handleBook}
                    className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    Book lesson
                </button>
            </div>
        </Modal>
    );
}
