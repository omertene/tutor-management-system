import { useState } from "react";
import LogoutButton from "../components/LogoutButton";

const API_BASE_URL = "http://localhost:8080";

const types = ["BLOCK", "ADD"];

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

    return (
        <div>
            <h1>Hello, here are your schedule overrides</h1>
            <button onClick={handleLoadOverrides}>load overrides</button>

            <ul>
                {scheduleOverrides.map((override) => (
                    <li key={override.id}>
                        {override.id} {override.date} {override.startTime} {override.endTime} {override.type} {override.note}
                    </li>
                ))}
            </ul>

            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />

            <select value={type} onChange={(e) => setType(e.target.value)}>
                {types.map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>

            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (optional)" />

            <button onClick={handleAddOverride}>add override</button>

            {errorMessage && <p>{errorMessage}</p>}
            <br />

            <LogoutButton />
        </div>
    );
}

export default ScheduleOverridePage;
