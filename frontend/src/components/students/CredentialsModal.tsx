import { useState } from "react";
import Modal from "../Modal";
import { apiFetch, readErrorMessage } from "../../utils/api";
import { validateEmailField, validatePasswordField } from "../../utils/fieldValidation";
import { inputClassFull, labelClass } from "../../constants/formStyles";
import type { Student } from "../../types";

const saveButtonClass = "px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap";

type CredentialsModalProps = {
    student: Student;
    onClose: () => void;
    onEmailChanged: (updated: Student) => void;
};

/* Lets the teacher change a student's login email or reset their password -
   two independent actions, each with its own Save button, so resetting one
   doesn't resubmit the other. */
export default function CredentialsModal({ student, onClose, onEmailChanged }: CredentialsModalProps) {
    const [email, setEmail] = useState(student.email);
    const [newPassword, setNewPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    /* Validates and saves the new email */
    async function handleSaveEmail() {
        setErrorMessage("");
        setSuccessMessage("");

        const fieldError = validateEmailField(email);
        if (fieldError) {
            setErrorMessage(fieldError);
            return;
        }

        try {
            const response = await apiFetch(`/teacher/students/${student.id}/email`, {
                method: "PATCH",
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "Failed to update email"));
                return;
            }

            const updated = (await response.json()) as Student;
            onEmailChanged(updated);
            /* show what the backend actually stored (it lowercases it), not what was typed */
            setEmail(updated.email);
            setSuccessMessage("Email updated");
        } catch {
            setErrorMessage("Could not reach the server. Please try again.");
        }
    }

    /* Validates and sends the new password */
    async function handleResetPassword() {
        setErrorMessage("");
        setSuccessMessage("");

        const fieldError = validatePasswordField(newPassword);
        if (fieldError) {
            setErrorMessage(fieldError);
            return;
        }

        try {
            const response = await apiFetch(`/teacher/students/${student.id}/password`, {
                method: "PATCH",
                body: JSON.stringify({ newPassword }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "Failed to reset password"));
                return;
            }

            setNewPassword("");
            setSuccessMessage("Password reset");
        } catch {
            setErrorMessage("Could not reach the server. Please try again.");
        }
    }

    return (
        <Modal title={`Credentials — ${student.firstName} ${student.lastName}`} onClose={onClose}>
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <label className={labelClass}>Email</label>
                    <div className="flex gap-2">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassFull} />
                        <button onClick={handleSaveEmail} className={saveButtonClass}>Save email</button>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-slate-200">
                    <label className={labelClass}>Reset password</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={inputClassFull}
                        />
                        <button onClick={handleResetPassword} className={saveButtonClass}>Reset password</button>
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
            </div>
        </Modal>
    );
}
