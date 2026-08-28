import { useState } from "react";
import { apiFetch, readErrorMessage } from "../../utils/api";
import { validateEmailField, validatePasswordField } from "../../utils/fieldValidation";

const saveButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors";
const fieldLabelClass = "block text-sm font-medium text-slate-700 mb-1";

/* Lets the teacher change their own login email/password. Collapsed by
   default so the fields aren't sitting open the moment the page loads. */
export default function AccountSection() {
    const [showForm, setShowForm] = useState(false);
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    /* Validates and sends the new email */
    async function handleUpdateEmail() {
        setErrorMessage("");
        setSuccessMessage("");

        const fieldError = validateEmailField(email);
        if (fieldError) {
            setErrorMessage(fieldError);
            return;
        }

        try {
            const response = await apiFetch(`/teacher/me/email`, {
                method: "PATCH",
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "Failed to update email"));
                return;
            }

            setSuccessMessage("Login email updated. Use your new email next time you sign in.");
            setEmail("");
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
            const response = await apiFetch(`/teacher/me/password`, {
                method: "PATCH",
                body: JSON.stringify({ newPassword }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "Failed to reset password"));
                return;
            }

            setSuccessMessage("Password updated. Use your new password next time you sign in.");
            setNewPassword("");
        } catch {
            setErrorMessage("Could not reach the server. Please try again.");
        }
    }

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Your account</h2>
                    <p className="text-sm text-slate-500">
                        Change the email or password you use to log in.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Change email or password
                    </button>
                )}
            </div>

            {showForm && (
                <>
                    <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={fieldLabelClass}>Login email</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleUpdateEmail()}
                                    placeholder="New email"
                                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <button onClick={handleUpdateEmail} className={saveButtonClass}>Save</button>
                            </div>
                        </div>

                        <div>
                            <label className={fieldLabelClass}>New password</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                                        placeholder="New password"
                                        className="w-full rounded-lg border border-slate-300 pl-3 pr-16 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-700"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                <button onClick={handleResetPassword} className={saveButtonClass}>Save</button>
                            </div>
                        </div>
                    </div>

                    {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}
                    {successMessage && <p className="text-sm text-green-600 mt-3">{successMessage}</p>}
                </>
            )}
        </div>
    );
}
