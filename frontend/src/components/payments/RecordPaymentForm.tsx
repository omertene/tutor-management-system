import { useState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "../../constants/formStyles";
import { todayDateString } from "../../utils/time";
import { methodLabels } from "../../types/payment";
import type { PaymentMethod } from "../../types/payment";
import type { Student } from "../../types";

/* Form the teacher uses to record a payment received from a student. */

type RecordPaymentFormProps = {
    students: Student[];
    onSubmit: (body: {
        studentId: number; amount: number; method: string; notes: string; paymentDate: string;
    }) => Promise<string | null>;
    onError: (message: string) => void;
};

export default function RecordPaymentForm({ students, onSubmit, onError }: RecordPaymentFormProps) {
    const [studentId, setStudentId] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("PAYBOX");
    const [notes, setNotes] = useState("");
    const [paymentDate, setPaymentDate] = useState(todayDateString());

    /* Validates the form and sends the payment */
    async function handleSubmit() {
        onError("");

        /* without this, an empty student/date fails on the backend with a confusing error */
        if (!studentId || !paymentDate) {
            onError("Please fill in all fields");
            return;
        }

        const error = await onSubmit({
            studentId: Number(studentId),
            amount: Number(amount),
            method,
            notes,
            paymentDate,
        });

        if (error) {
            onError(error);
            return;
        }

        setStudentId("");
        setAmount("");
        setMethod("PAYBOX");
        setNotes("");
        setPaymentDate(todayDateString());
    }

    return (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Record a payment</h2>

            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Student *</label>
                    <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
                        <option value="">Select student</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Amount *</label>
                    <input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`${inputClass} w-32`}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Date received *</label>
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClass} />
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Method</label>
                    <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputClass}>
                        {Object.entries(methodLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Notes (optional)</label>
                    <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!studentId || !amount || !paymentDate}
                    className={primaryButtonClass}
                >
                    Record payment
                </button>
            </div>
        </div>
    );
}
