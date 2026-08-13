import { useState } from "react";
import NavBar from "../components/NavBar";

const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Subjects", to: "/teacher/subjects" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Overrides", to: "/teacher/schedule-overrides" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
];

type ScheduleRule = {
    id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
};


function formatTime(time: string): string {
    return time.slice(0, 5);
}


function sortRules(rules: ScheduleRule[]): ScheduleRule[] {
    return [...rules].sort((a, b) => {
        const dayDiff = days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
    });
}

function ScheduleRulePage() {

    const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
    const [dayOfWeek, setDayOfWeek] = useState(days[0]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function handleLoadRules() {
        setErrorMessage("");

        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load rules");
            return;
        }

        const data: ScheduleRule[] = await response.json();
        setScheduleRules(sortRules(data));
    }

    async function handleAddRule() {

        setErrorMessage("");
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ dayOfWeek, startTime, endTime }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to add rule");
            return;
        }

        const createdRule = await response.json();
        setScheduleRules(sortRules([...scheduleRules, createdRule]));
        setStartTime("");
        setEndTime("");
    }

    // undoes a mistaken or outdated rule - DELETE /teacher/schedule-rules/{id}
    async function handleDeleteRule(ruleId: number) {
        setErrorMessage("");

        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teacher/schedule-rules/${ruleId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to delete rule");
            return;
        }

        setScheduleRules(scheduleRules.filter((rule) => rule.id !== ruleId));
    }


    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Weekly schedule</h1>
                <p className="text-slate-500 mt-1">Your recurring availability, by day of the week.</p>

                <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Add a rule</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className={inputClass}>
                            {days.map((day) => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>

                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />

                        <button
                            onClick={handleAddRule}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Add rule
                        </button>
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                <div className="mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Your rules</h2>
                        <button
                            onClick={handleLoadRules}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Load rules
                        </button>
                    </div>

                    <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {scheduleRules.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">No rules loaded yet.</p>
                        )}
                        {scheduleRules.map((scheduleRule) => (
                            <div key={scheduleRule.id} className="px-4 py-3 flex items-center justify-between">
                                <span className="text-slate-900">
                                    {scheduleRule.dayOfWeek} — {formatTime(scheduleRule.startTime)} to {formatTime(scheduleRule.endTime)}
                                </span>
                                <button
                                    onClick={() => handleDeleteRule(scheduleRule.id)}
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

export default ScheduleRulePage;
