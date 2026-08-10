import { useState } from "react";
import NavBar from "../components/NavBar";

const API_BASE_URL = "http://localhost:8080";

const types = ["BLOCK", "ADD"];

const teacherLinks = [
    { label: "Home", to: "/teacher" },
    { label: "Students", to: "/teacher/register" },
    { label: "Subjects", to: "/teacher/subjects" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Overrides", to: "/teacher/schedule-overrides" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
];

type ScheduleOverride = {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    note: string;
};

function ScheduleOverridePage() {

    const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [type, setType] = useState(types[0]);
    const [note, setNote] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleLoadOverrides() {
        setErrorMessage("");

        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teacher/schedule-overrides`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load overrides");
            return;
        }

        const data = await response.json();
        setScheduleOverrides(data);
    }

    async function handleAddOverride() {
        setErrorMessage("");

        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teacher/schedule-overrides`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ date, startTime, endTime, type, note }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to add override");
            return;
        }

        const createdOverride = await response.json();
        setScheduleOverrides([...scheduleOverrides, createdOverride]);
        setStartTime("");
        setEndTime("");
        setNote("");
    }

    // undoes a mistaken override - DELETE /teacher/schedule-overrides/{id}
    async function handleDeleteOverride(overrideId: number) {
        setErrorMessage("");

        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teacher/schedule-overrides/${overrideId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to delete override");
            return;
        }

        setScheduleOverrides(scheduleOverrides.filter((override) => override.id !== overrideId));
    }

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const typeStyles: Record<string, string> = {
        BLOCK: "bg-red-50 text-red-700",
        ADD: "bg-green-50 text-green-700",
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Schedule overrides</h1>
                <p className="text-slate-500 mt-1">One-off exceptions to your weekly schedule.</p>

                <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Add an override</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />

                        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                            {types.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Note (optional)"
                            className={inputClass}
                        />

                        <button
                            onClick={handleAddOverride}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Add override
                        </button>
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                <div className="mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Your overrides</h2>
                        <button
                            onClick={handleLoadOverrides}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Load overrides
                        </button>
                    </div>

                    <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {scheduleOverrides.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">No overrides loaded yet.</p>
                        )}
                        {scheduleOverrides.map((override) => (
                            <div key={override.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyles[override.type] ?? "bg-slate-100 text-slate-500"}`}
                                    >
                                        {override.type}
                                    </span>
                                    <span className="text-slate-900">
                                        {override.date} — {override.startTime} to {override.endTime}
                                    </span>
                                    {override.note && <span className="text-slate-500 text-sm">— {override.note}</span>}
                                </div>
                                <button
                                    onClick={() => handleDeleteOverride(override.id)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
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

export default ScheduleOverridePage;
