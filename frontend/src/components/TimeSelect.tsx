import { useEffect, useState } from "react";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../utils/time";

type TimeSelectProps = {
    value: string;
    onChange: (value: string) => void;
    className: string;
};

// hour + minute picked independently via two small dropdowns, instead of one long
// scrolling list of all 96 quarter-hour times - value/onChange still work as a single
// "HH:MM" string so nothing else needs to know this is two selects
function TimeSelect({ value, onChange, className }: TimeSelectProps) {
    // the two dropdowns keep their own half-picked state, because the value handed
    // back to the form is "" until BOTH halves are chosen - without this, picking an
    // hour while the minute is still "--" would immediately blank the hour select again
    const [hour, setHour] = useState(() => (value ? value.split(":")[0] : ""));
    const [minute, setMinute] = useState(() => (value ? value.split(":")[1] : ""));

    // a parent that swaps in a different time (opening a modal on another lesson,
    // auto-advancing the end time) has to win over the local state above
    useEffect(() => {
        const [nextHour, nextMinute] = value ? value.split(":") : ["", ""];
        if (value) {
            setHour(nextHour);
            setMinute(nextMinute);
        }
    }, [value]);

    // a half-picked time is reported to the form as no time at all. emitting ":00"
    // or "23:" instead would satisfy a plain `!value` check, so the request went out
    // with an unparseable time and came back as a generic "not valid JSON" - the form
    // can't tell a partial time from a complete one unless this component refuses to
    // invent the missing half
    function updateHour(newHour: string) {
        setHour(newHour);
        onChange(newHour && minute ? `${newHour}:${minute}` : "");
    }

    function updateMinute(newMinute: string) {
        setMinute(newMinute);
        onChange(hour && newMinute ? `${hour}:${newMinute}` : "");
    }

    return (
        <div className="flex gap-1">
            <select value={hour} onChange={(e) => updateHour(e.target.value)} className={className}>
                <option value="">--</option>
                {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
            <select value={minute} onChange={(e) => updateMinute(e.target.value)} className={className}>
                <option value="">--</option>
                {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    );
}

export default TimeSelect;
