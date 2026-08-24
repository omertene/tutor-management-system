import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../utils/time";

type TimeSelectProps = {
    value: string;
    onChange: (value: string) => void;
    className: string;
};

// hour + minute picked independently via two small dropdowns, instead of one long
// scrolling list of all 96 quarter-hour times - value/onChange still work as a single
// "HH:MM" string so nothing else needs to know this is two selects.
//
// neither dropdown offers a blank option. a half-picked time ("--:00") can't be
// expressed as a valid "HH:MM", and sending one posted an unparseable value that the
// backend rejected with a generic "not valid JSON" long before any field validation
// ran. making the blank state unreachable is the same approach MINUTE_OPTIONS already
// takes with off-grid minutes: the picker can only produce values the server accepts.
function TimeSelect({ value, onChange, className }: TimeSelectProps) {
    // an empty/partial incoming value falls back to a real time rather than rendering
    // a select with nothing chosen, so the control always shows what it will submit
    const [rawHour, rawMinute] = value ? value.split(":") : ["", ""];
    const hour = HOUR_OPTIONS.includes(rawHour) ? rawHour : HOUR_OPTIONS[0];
    const minute = MINUTE_OPTIONS.includes(rawMinute) ? rawMinute : MINUTE_OPTIONS[0];

    return (
        <div className="flex gap-1">
            <select value={hour} onChange={(e) => onChange(`${e.target.value}:${minute}`)} className={className}>
                {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
            <select value={minute} onChange={(e) => onChange(`${hour}:${e.target.value}`)} className={className}>
                {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    );
}

export default TimeSelect;
