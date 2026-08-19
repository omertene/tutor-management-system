import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import type { Subject } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
    { label: "Settings", to: "/teacher/settings" },
];

// teacher-only config page. subjects used to have their own standalone nav tab,
// but a dedicated page just for "add a subject name" was overkill - it lives
// here now, alongside whatever else gets added later, and subjects can also be
// created inline straight from the lesson booking dropdown on the Lessons page
function SettingsPage() {
    const token = localStorage.getItem("token")!;

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [newSubject, setNewSubject] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleLoadSubjects() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load subjects");
            return;
        }

        setSubjects(await response.json());
    }

    useEffect(() => {
        handleLoadSubjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleAddSubject() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/subjects`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name: newSubject }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            setErrorMessage(errorData?.message || "Failed to add subject");
            return;
        }

        const createdSubject = await response.json();
        setSubjects([...subjects, createdSubject]);
        setNewSubject("");
    }

    async function handleDeleteSubject(subject: Subject) {
        setErrorMessage("");

        if (!window.confirm(`Delete "${subject.name}"? This can't be undone.`)) {
            return;
        }

        const response = await fetch(`${API_BASE_URL}/subjects/${subject.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            setErrorMessage(errorData?.message || "Failed to delete subject");
            return;
        }

        setSubjects(subjects.filter((s) => s.id !== subject.id));
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                <div className="mt-6">
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
