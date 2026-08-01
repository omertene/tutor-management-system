import { useState } from "react";
import LogoutButton from "../components/LogoutButton";

const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const API_BASE_URL = "http://localhost:8080";

type ScheduleRule = {
    id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
};

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

        const data = await response.json();
        setScheduleRules(data);
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
        setScheduleRules([...scheduleRules, createdRule]);
        setStartTime("");
        setEndTime("");
    }


    return (
        <div>
            <h1>Hello, here is your fixed schedule</h1>
            <button onClick={handleLoadRules}>load rules</button>

            <ul>
                {scheduleRules.map((scheduleRule) => (
                    <li key={scheduleRule.id}>
                        {scheduleRule.id} {scheduleRule.dayOfWeek}
                        {scheduleRule.startTime} {scheduleRule.endTime}
                    </li>
                ))}
            </ul>

            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                ))}
            </select>

            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />

            <button onClick={handleAddRule}>add rule</button>

            {errorMessage && <p>{errorMessage}</p>}
            <br />

            <LogoutButton />
        </div>
    );
}

export default ScheduleRulePage;
