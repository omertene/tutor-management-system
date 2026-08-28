import { useEffect, useState } from "react";
import { apiFetch, readErrorMessage } from "../../utils/api";
import type { Subject } from "../../types";

/* Manages the subjects lessons can be booked under - owns its own list
   and errors, the surrounding page holds no state of its own. */
export default function SubjectsSection() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [newSubject, setNewSubject] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    /* Loads the subject list once on mount */
    useEffect(() => {
        async function loadSubjects() {
            const response = await apiFetch(`/subjects`);
            if (!response.ok) {
                setErrorMessage("Failed to load subjects");
                return;
            }
            setSubjects((await response.json()) as Subject[]);
        }
        loadSubjects();
    }, []);

    /* Creates the subject and adds it to the list */
    async function handleAdd() {
        setErrorMessage("");

        const response = await apiFetch(`/subjects`, {
            method: "POST",
            body: JSON.stringify({ name: newSubject }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to add subject"));
            return;
        }

        const created = (await response.json()) as Subject;
        setSubjects((current) => [...current, created]);
        setNewSubject("");
    }

    /* Confirms with the teacher, then deletes the subject */
    async function handleDelete(subject: Subject) {
        setErrorMessage("");

        if (!window.confirm(`Delete "${subject.name}"? This can't be undone.`)) {
            return;
        }

        const response = await apiFetch(`/subjects/${subject.id}`, { method: "DELETE" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete subject"));
            return;
        }

        setSubjects((current) => current.filter((s) => s.id !== subject.id));
    }

    return (
        <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Subjects</h2>
            <p className="text-sm text-slate-500 mb-4">
                Manage the subjects lessons can be booked under. You can also add a new one directly from the Lessons page while booking.
            </p>

            {errorMessage && <p className="text-sm text-red-600 mb-3">{errorMessage}</p>}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex gap-3">
                    <input
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        placeholder="Subject name"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                        onClick={handleAdd}
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
                            onClick={() => handleDelete(subject)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
