import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { Subject } from "../types";
import { teacherLinks } from "../constants/navLinks";
import { validateEmailField, validatePasswordField } from "../utils/fieldValidation";

// teacher-only config page. subjects used to have their own standalone nav tab,
// but a dedicated page just for "add a subject name" was overkill - it lives
// here now, alongside whatever else gets added later, and subjects can also be
// created inline straight from the lesson booking dropdown on the Lessons page
function SettingsPage() {

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [newSubject, setNewSubject] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // teacher's own login email/password - separate state/section from Subjects,
    // since this changes the teacher's own account rather than app configuration.
    // collapsed by default so the fields aren't sitting open the moment this page loads
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [accountEmail, setAccountEmail] = useState("");
    const [accountNewPassword, setAccountNewPassword] = useState("");
    const [showAccountPassword, setShowAccountPassword] = useState(false);
    const [accountErrorMessage, setAccountErrorMessage] = useState("");
    const [accountSuccessMessage, setAccountSuccessMessage] = useState("");

    async function handleLoadSubjects() {
        setErrorMessage("");

        const response = await apiFetch(`/subjects`);

        if (!response.ok) {
            setErrorMessage("Failed to load subjects");
            return;
        }

        const data: Subject[] = await response.json();
        setSubjects(data);
    }

    useEffect(() => {
        handleLoadSubjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleAddSubject() {
        setErrorMessage("");

        const response = await apiFetch(`/subjects`, {
            method: "POST",
            body: JSON.stringify({ name: newSubject }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to add subject"));
            return;
        }

        const createdSubject: Subject = await response.json();
        setSubjects([...subjects, createdSubject]);
        setNewSubject("");
    }

    async function handleDeleteSubject(subject: Subject) {
        setErrorMessage("");

        if (!window.confirm(`Delete "${subject.name}"? This can't be undone.`)) {
            return;
        }

        const response = await apiFetch(`/subjects/${subject.id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete subject"));
            return;
        }

        setSubjects(subjects.filter((s) => s.id !== subject.id));
    }

    async function handleUpdateAccountEmail() {
        setAccountErrorMessage("");
        setAccountSuccessMessage("");

        const fieldError = validateEmailField(accountEmail);
        if (fieldError) {
            setAccountErrorMessage(fieldError);
            return;
        }

        try {
            const response = await apiFetch(`/teacher/me/email`, {
                method: "PATCH",
                body: JSON.stringify({ email: accountEmail }),
            });

            if (!response.ok) {
                setAccountErrorMessage(await readErrorMessage(response, "Failed to update email"));
                return;
            }

            setAccountSuccessMessage("Login email updated. Use your new email next time you sign in.");
            setAccountEmail("");
        } catch {
            setAccountErrorMessage("Could not reach the server. Please try again.");
        }
    }

    async function handleResetAccountPassword() {
        setAccountErrorMessage("");
        setAccountSuccessMessage("");

        const fieldError = validatePasswordField(accountNewPassword);
        if (fieldError) {
            setAccountErrorMessage(fieldError);
            return;
        }

        try {
            const response = await apiFetch(`/teacher/me/password`, {
                method: "PATCH",
                body: JSON.stringify({ newPassword: accountNewPassword }),
            });

            if (!response.ok) {
                setAccountErrorMessage(await readErrorMessage(response, "Failed to reset password"));
                return;
            }

            setAccountSuccessMessage("Password updated. Use your new password next time you sign in.");
            setAccountNewPassword("");
        } catch {
            setAccountErrorMessage("Could not reach the server. Please try again.");
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                <div className="mt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 mb-1">Your account</h2>
                            <p className="text-sm text-slate-500">
                                Change the email or password you use to log in.
                            </p>
                        </div>
                        {!showAccountForm && (
                            <button
                                onClick={() => setShowAccountForm(true)}
                                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                Change email or password
                            </button>
                        )}
                    </div>

                    {showAccountForm && (
                        <>
                            <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Login email</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={accountEmail}
                                            onChange={(e) => setAccountEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleUpdateAccountEmail()}
                                            placeholder="New email"
                                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleUpdateAccountEmail}
                                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={showAccountPassword ? "text" : "password"}
                                                value={accountNewPassword}
                                                onChange={(e) => setAccountNewPassword(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleResetAccountPassword()}
                                                placeholder="New password"
                                                className="w-full rounded-lg border border-slate-300 pl-3 pr-16 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowAccountPassword((v) => !v)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-700"
                                            >
                                                {showAccountPassword ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleResetAccountPassword}
                                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {accountErrorMessage && <p className="text-sm text-red-600 mt-3">{accountErrorMessage}</p>}
                            {accountSuccessMessage && <p className="text-sm text-green-600 mt-3">{accountSuccessMessage}</p>}
                        </>
                    )}
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Subjects</h2>
                    <p className="text-sm text-slate-500 mb-4">
                        Manage the subjects lessons can be booked under. You can also add a new one directly from the Lessons page while booking.
                    </p>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex gap-3">
                            <input
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                                placeholder="Subject name"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button
                                onClick={handleAddSubject}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Add subject
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {subjects.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">No subjects yet.</p>
                        )}
                        {subjects.map((subject) => (
                            <div key={subject.id} className="px-4 py-3 flex items-center justify-between">
                                <span className="text-slate-900">{subject.name}</span>
                                <button
                                    onClick={() => handleDeleteSubject(subject)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default SettingsPage;
