import { useState } from "react";
import Modal from "./Modal";
import { readErrorMessage } from "../utils/httpError";

const API_BASE_URL = "http://localhost:8080";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d+$/;

function validateEmailField(email: string): string | null {
    if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address";
    return null;
}

function validatePasswordField(password: string): string | null {
    if (password.length < 4) return "Password must be at least 4 characters";
    return null;
}

function validatePhoneField(phone: string): string | null {
    if (!PHONE_PATTERN.test(phone)) return "Phone number must contain digits only";
    return null;
}

function validateHourlyRateField(hourlyRate: string): string | null {
    if (!/^\d+$/.test(hourlyRate) || Number(hourlyRate) <= 0) {
        return "Hourly rate must be a positive whole number";
    }
    return null;
}

type AddStudentModalProps = {
    onClose: () => void;
    // called once the student is actually created, so the caller can refresh
    // whatever list/summary it shows (RegisterPage's student list, the
    // dashboard's counts) - the modal itself doesn't know what to refresh
    onCreated: () => void;
};

// one shared "add student" form used by both RegisterPage and TeacherDashboard -
// used to be two separate copies that quietly drifted apart (only one validated
// the fields, only one closed itself on success), so the same action gave
// different feedback depending on which page you started from
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

    async function handleRegister() {
        setErrorMessage("");
        setSuccessMessage("");

        if (!email || !password || !firstName || !lastName || !phone || !hourlyRate || !educationLevel) {
            setErrorMessage("Please fill in all required fields");
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

        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`${API_BASE_URL}/teacher/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
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
                setErrorMessage(await readErrorMessage(response, "Failed to create student"));
                return;
            }

            setSuccessMessage("Student created successfully");
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
            setErrorMessage("Could not reach the server. Please try again.");
        }
    }

    const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "text-sm font-medium text-slate-700";

    return (
        <Modal title="Add student" onClose={onClose}>
            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Email *</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Password *</label>
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>First name *</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Last name *</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Phone *</label>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Hourly rate *</label>
                        <input value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Education level *</label>
                        <input value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Notes (optional)</label>
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

                <button
                    onClick={handleRegister}
                    className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    Add student
                </button>
            </div>
        </Modal>
    );
}

export default AddStudentModal;
