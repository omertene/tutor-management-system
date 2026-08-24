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

// one row of the roster, which doubles as its own inline edit form. the draft field
// values live here rather than on the page so only the row being edited re-renders,
// and so opening a second row can't inherit the first one's half-typed values.
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

    // re-seeds the draft from the row's current values every time the form opens, so
    // cancelling an edit and reopening doesn't show the abandoned changes
    function startEdit() {
        setFirstName(student.firstName);
        setLastName(student.lastName);
        setPhone(student.phone ?? "");
        setHourlyRate(String(student.hourlyRate));
        setEducationLevel(student.educationLevel ?? "");
        setNotes(student.notes ?? "");
        setIsEditing(true);
    }

    async function handleSave() {
        onError("");

        if (!firstName.trim() || !lastName.trim()) {
            onError("First and last name are required");
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
                onError(await readErrorMessage(response, "Failed to update student"));
                return;
            }

            onSaved((await response.json()) as Student);
            setIsEditing(false);
        } catch {
            onError("Could not reach the server. Please try again.");
        }
    }

    if (isEditing) {
        return (
            <div className="px-4 py-3">
                <div className="flex flex-wrap gap-2 items-center">
                    <input placeholder="first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="hourly rate" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={`${editInputClass} w-24`} />
                    <input placeholder="education level" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className={`${editInputClass} w-32`} />
                    <input placeholder="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${editInputClass} w-40`} />
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className={rowButtonClass}>
                        Cancel
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
                        <span className="text-slate-500 text-sm">₪{student.hourlyRate}/hr</span>
                        {debt > 0 && (
                            <span className="text-sm font-medium text-red-600">Debt: ₪{debt}</span>
                        )}
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                student.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                            }`}
                        >
                            {student.active ? "Active" : "Inactive"}
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
                    <button onClick={startEdit} className={rowButtonClass}>Edit</button>
                    <button onClick={() => onOpenCredentials(student)} className={rowButtonClass}>Credentials</button>
                    <button onClick={() => onToggleActive(student)} className={rowButtonClass}>
                        {student.active ? "Deactivate" : "Reactivate"}
                    </button>
                </div>
            </div>
        </div>
    );
}
