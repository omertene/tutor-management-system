import { useState } from "react";
import { inputClass, labelClass, primaryButtonClass, smallSecondaryButtonClass } from "../../constants/formStyles";
import { formatDateTimeString, formatShortDateString, todayDateString } from "../../utils/time";
import { methodLabels } from "../../types/payment";
import type { Payment, PaymentMethod } from "../../types/payment";
import type { Student } from "../../types";

/* One row in the payment history list, with an inline edit panel the
   teacher can open. Draft values live here (not on the page) so editing
   one row doesn't affect another. */

type PaymentRowProps = {
    payment: Payment;
    isTeacher: boolean;
    students: Student[];
    onSave: (paymentId: number, body: {
        studentId: number; amount: number; method: string; notes: string; paymentDate: string;
    }) => Promise<string | null>;
    onCancel: (payment: Payment) => void;
};

export default function PaymentRow({ payment, isTeacher, students, onSave, onCancel }: PaymentRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [studentId, setStudentId] = useState(String(payment.studentId));
    const [amount, setAmount] = useState(String(payment.amount));
    const [method, setMethod] = useState<PaymentMethod>(payment.method);
    const [notes, setNotes] = useState(payment.notes ?? "");
    const [paymentDate, setPaymentDate] = useState(payment.paymentDate ?? todayDateString());
    const [errorMessage, setErrorMessage] = useState("");

    /* Resets the draft fields back to the payment's current values and opens the edit panel */
    function startEdit() {
        setStudentId(String(payment.studentId));
        setAmount(String(payment.amount));
        setMethod(payment.method);
        setNotes(payment.notes ?? "");
        setPaymentDate(payment.paymentDate ?? todayDateString());
        setErrorMessage("");
        setIsEditing(true);
    }

    /* Sends the edited fields and closes the panel if it worked */
    async function handleSave() {
        setErrorMessage("");
        const error = await onSave(payment.id, {
            studentId: Number(studentId),
            amount: Number(amount),
            method,
            notes,
            paymentDate,
        });

        if (error) {
            setErrorMessage(error);
            return;
        }
        setIsEditing(false);
    }

    /* True if the payment's student got deactivated since, so isn't in the list */
    const studentMissingFromList = Boolean(studentId) && !students.some((s) => String(s.id) === studentId);

    return (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-900">₪{payment.amount}</span>
                {isTeacher && (
                    <span className="text-slate-500 text-sm">
                        {payment.studentFirstName} {payment.studentLastName}
                    </span>
                )}
                <span className="text-slate-500 text-sm">{methodLabels[payment.method] ?? payment.method}</span>
                <span className="text-slate-400 text-sm">
                    {payment.paymentDate ? formatShortDateString(payment.paymentDate) : formatDateTimeString(payment.createdAt)}
                </span>
                {payment.notes && <span className="text-slate-500 text-sm">— {payment.notes}</span>}
            </div>

            {isTeacher && isEditing && (
                <div className="flex flex-wrap gap-2 items-end bg-slate-50 border border-slate-200 rounded-lg p-3 w-full mt-1">
                    {errorMessage && <p className="text-sm text-red-600 w-full">{errorMessage}</p>}

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Student</label>
                        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
                            {/* disabled - just shows who the payment belongs to */}
                            {studentMissingFromList && (
                                <option value={studentId} disabled>
                                    {payment.studentFirstName} {payment.studentLastName} (inactive)
                                </option>
                            )}
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.firstName} {student.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Amount</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} w-28`} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Date received</label>
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

                    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                        <label className={labelClass}>Notes</label>
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} w-full`} />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!studentId || !amount || !paymentDate}
                        className={primaryButtonClass}
                    >
                        Save changes
                    </button>
                    <button onClick={() => setIsEditing(false)} className={smallSecondaryButtonClass}>
                        Cancel
                    </button>
                </div>
            )}

            {isTeacher && !isEditing && (
                <div className="flex gap-2">
                    <button onClick={startEdit} className={smallSecondaryButtonClass}>Edit</button>
                    <button
                        onClick={() => onCancel(payment)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
