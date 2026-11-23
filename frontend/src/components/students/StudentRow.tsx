import { formatMoney } from "../../utils/money";
import { useState } from "react";
import { apiFetch, readErrorMessage } from "../../utils/api";
import { validatePhoneField, validateHourlyRateField } from "../../utils/fieldValidation";
import type { Student } from "../../types";

const editInputClass = "rounded-md border border-slate-300 px-2 py-1 text-sm";
const rowButtonClass = "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors";

type StudentRowProps = {
    student: Student;
    debt: number;
    onSaved: (updated: Student) => void;
    onError: (message: string) => void;
    onOpenCredentials: (student: Student) => void;
    onToggleActive: (student: Student) => void;
};

/* One row of the roster that doubles as its own inline edit form. Draft
   values live here (not on the page) so only this row re-renders while
   editing, and opening a second row can't inherit half-typed values. */
export default function StudentRow({
    student, debt, onSaved, onError, onOpenCredentials, onToggleActive,
}: StudentRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [firstName, setFirstName] = useState(student.firstName);
    const [lastName, setLastName] = useState(student.lastName);
    const [phone, setPhone] = useState(student.phone ?? "");
    const [hourlyRate, setHourlyRate] = useState(String(student.hourlyRate));
    const [educationLevel, setEducationLevel] = useState(student.educationLevel ?? "");
    const [notes, setNotes] = useState(student.notes ?? "");

    /* Resets the draft fields back to the student's current values and opens the edit form */
    function startEdit() {
        setFirstName(student.firstName);
        setLastName(student.lastName);
        setPhone(student.phone ?? "");
        setHourlyRate(String(student.hourlyRate));
        setEducationLevel(student.educationLevel ?? "");
        setNotes(student.notes ?? "");
        setIsEditing(true);
    }

    /* Validates the form and saves the student's updated info */
    async function handleSave() {
        onError("");

        if (!firstName.trim() || !lastName.trim()) {
            onError("שם פרטי ושם משפחה הם שדות חובה");
            return;
        }

        const fieldError = validatePhoneField(phone) || validateHourlyRateField(hourlyRate);
        if (fieldError) {
            onError(fieldError);
            return;
        }

        try {
            const response = await apiFetch(`/teacher/students/${student.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    firstName, lastName, phone,
                    hourlyRate: Number(hourlyRate),
                    educationLevel, notes,
                }),
            });

            if (!response.ok) {
                onError(await readErrorMessage(response, "עדכון התלמיד נכשל"));
                return;
            }

            onSaved((await response.json()) as Student);
            setIsEditing(false);
        } catch {
            onError("אין חיבור לשרת. נסו שוב.");
        }
    }

    if (isEditing) {
        return (
            <div className="px-4 py-3">
                <div className="flex flex-wrap gap-2 items-center">
                    <input placeholder="שם פרטי" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="שם משפחה" value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="טלפון" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="מחיר לשעה" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={`${editInputClass} w-24`} />
                    <input placeholder="רמת לימוד" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="הערות" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${editInputClass} w-40`} />
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        שמירה
                    </button>
                    <button onClick={() => setIsEditing(false)} className={rowButtonClass}>
                        ביטול
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">
                            {student.firstName} {student.lastName}
                        </span>
                        <span className="text-slate-500 text-sm">{student.email}</span>
                        <span className="text-slate-500 text-sm">{student.phone}</span>
                        <span className="text-slate-500 text-sm">{formatMoney(student.hourlyRate)} לשעה</span>
                        {debt > 0 && (
                            <span className="text-sm font-medium text-red-600">חוב: {formatMoney(debt)}</span>
                        )}
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                student.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                            }`}
                        >
                            {student.active ? "פעיל" : "לא פעיל"}
                        </span>
                    </div>
                    {(student.educationLevel || student.notes) && (
                        <div className="flex items-start gap-2 flex-wrap text-sm text-slate-500">
                            {student.educationLevel && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                    {student.educationLevel}
                                </span>
                            )}
                            {student.notes && <span className="italic">{student.notes}</span>}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={startEdit} className={rowButtonClass}>עריכה</button>
                    <button onClick={() => onOpenCredentials(student)} className={rowButtonClass}>פרטי התחברות</button>
                    <button onClick={() => onToggleActive(student)} className={rowButtonClass}>
                        {student.active ? "השבתה" : "הפעלה מחדש"}
                    </button>
                </div>
            </div>
        </div>
    );
}
