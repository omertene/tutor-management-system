import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../utils/time";

type TimeSelectProps = {
    value: string;
    onChange: (value: string) => void;
    className: string;
};

/* Hour and minute picked via two small dropdowns instead of one long scrolling
   list of all 96 quarter-hour times. value/onChange still work as a single
   "HH:MM" string so nothing else needs to know this is two selects.

   Neither dropdown offers a blank option - a half-picked time ("--:00") isn't a
   valid "HH:MM" and the backend rejected it as unparseable JSON before any real
   validation ran, so the blank state is just made unreachable instead. */
function TimeSelect({ value, onChange, className }: TimeSelectProps) {
    /* An empty/partial incoming value falls back to a real time instead of
       rendering a select with nothing chosen, so it always shows what it submits */
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
