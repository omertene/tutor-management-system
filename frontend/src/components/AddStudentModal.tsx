import { useState } from "react";
import Modal from "./Modal";
import { apiFetch, readErrorMessage } from "../utils/api";
import { inputClassFull, labelClass } from "../constants/formStyles";
import { validateEmailField, validatePasswordField, validatePhoneField, validateHourlyRateField } from "../utils/fieldValidation";

type AddStudentModalProps = {
    onClose: () => void;
    /* Called once the student is created so the caller can refresh its own list -
       the modal itself doesn't know what needs refreshing */
    onCreated: () => void;
};

/* Shared "add student" form used by both RegisterPage and TeacherDashboard, so
   both pages validate and behave the same way instead of having their own copy */
function AddStudentModal({ onClose, onCreated }: AddStudentModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [hourlyRate, setHourlyRate] = useState("");
    const [educationLevel, setEducationLevel] = useState("");
    const [notes, setNotes] = useState("");

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    /* Validates the form and registers the new student */
    async function handleRegister() {
        setErrorMessage("");
        setSuccessMessage("");

        if (!email || !password || !firstName || !lastName || !phone || !hourlyRate) {
            setErrorMessage("יש למלא את כל שדות החובה");
            return;
        }

        const fieldError =
            validateEmailField(email) ||
            validatePasswordField(password) ||
            validatePhoneField(phone) ||
            validateHourlyRateField(hourlyRate);

        if (fieldError) {
            setErrorMessage(fieldError);
            return;
        }

        try {
            const response = await apiFetch(`/teacher/register`, {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    lastName,
                    phone,
                    hourlyRate: Number(hourlyRate),
                    educationLevel,
                    notes,
                }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "יצירת התלמיד נכשלה"));
                return;
            }

            setSuccessMessage("התלמיד נוצר בהצלחה");
            setEmail("");
            setPassword("");
            setFirstName("");
            setLastName("");
            setPhone("");
            setHourlyRate("");
            setEducationLevel("");
            setNotes("");

            onCreated();
            onClose();
        } catch {
            setErrorMessage("אין חיבור לשרת. נסו שוב.");
        }
    }

    return (
        <Modal title="הוספת תלמיד" onClose={onClose}>
            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>אימייל *</label>
                        <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassFull} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>סיסמה *</label>
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassFull} />
                        <p className="text-xs text-slate-500">לפחות 8 תווים, כולל אות וספרה</p>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>שם פרטי *</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClassFull} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>שם משפחה *</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClassFull} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>טלפון *</label>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClassFull} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>מחיר לשעה *</label>
                        <input value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={inputClassFull} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>רמת לימוד</label>
                        <input value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className={inputClassFull} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>הערות (אופציונלי)</label>
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClassFull} />
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

                <button
                    onClick={handleRegister}
                    className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    הוספת תלמיד
                </button>
            </div>
        </Modal>
    );
}

export default AddStudentModal;
