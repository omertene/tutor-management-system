import { useState } from "react";
import Modal from "./Modal";
import TimeSelect from "./TimeSelect";
import { apiFetch, readErrorMessage } from "../utils/api";
import { inputClass } from "../constants/formStyles";
import { days } from "../utils/time";
import { sortRules } from "../types/schedule";
import type { ScheduleRule } from "../types/schedule";

// the teacher's recurring weekly availability editor. lived at the bottom of
// SchedulePage.tsx, which made that file 1275 lines and two components long - it
// shares no state with the calendar around it, only the rules list it's handed.

type ScheduleRulesModalProps = {
    scheduleRules: ScheduleRule[];
    onRulesChanged: (rules: ScheduleRule[]) => void;
    onClose: () => void;
};


function formatTime(time: string): string {
    return time.slice(0, 5);
}

// the recurring weekly availability template - separate from the calendar since
// rules are day-of-week based, not tied to a specific date
type TimeRangeDraft = { startTime: string; endTime: string };

// most teaching hours fall in this window, so a new/blank range starts here instead
// of empty - saves a click in the common case, still fully editable
const DEFAULT_RULE_RANGE: TimeRangeDraft = { startTime: "08:00", endTime: "16:00" };

export default function ScheduleRulesModal({ scheduleRules, onRulesChanged, onClose }: ScheduleRulesModalProps) {
    const [dayOfWeek, setDayOfWeek] = useState(days[0]);
    const [ranges, setRanges] = useState<TimeRangeDraft[]>([{ ...DEFAULT_RULE_RANGE }]);
    const [errorMessage, setErrorMessage] = useState("");
    const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

    function resetForm() {
        setEditingRuleId(null);
        setDayOfWeek(days[0]);
        setRanges([{ ...DEFAULT_RULE_RANGE }]);
    }

    function startEditRule(rule: ScheduleRule) {
        setErrorMessage("");
        setEditingRuleId(rule.id);
        setDayOfWeek(rule.dayOfWeek);
        setRanges([{ startTime: formatTime(rule.startTime), endTime: formatTime(rule.endTime) }]);
    }

    function updateRange(index: number, field: "startTime" | "endTime", value: string) {
        setRanges(ranges.map((range, i) => (i === index ? { ...range, [field]: value } : range)));
    }

    function addRange() {
        setRanges([...ranges, { ...DEFAULT_RULE_RANGE }]);
    }

    function removeRange(index: number) {
        setRanges(ranges.filter((_, i) => i !== index));
    }

    async function handleSaveRule() {
        setErrorMessage("");
        const isEditing = editingRuleId !== null;

        if (ranges.some((range) => !range.startTime || !range.endTime)) {
            setErrorMessage("Please fill in every time range, or remove the empty one");
            return;
        }

        if (isEditing) {
            const { startTime, endTime } = ranges[0];
            const countResponse = await apiFetch(`/teacher/schedule-rules/${editingRuleId}/affected-lessons-count-for-edit`, {
                method: "POST",
                body: JSON.stringify({ dayOfWeek, startTime, endTime }),
            });
            const affectedCount: number = countResponse.ok ? await countResponse.json() : 0;

            if (affectedCount > 0) {
                const confirmed = window.confirm(
                    `${affectedCount} upcoming lesson${affectedCount === 1 ? "" : "s"} would no longer fall inside this slot. ` +
                    `${affectedCount === 1 ? "It" : "They"} will stay scheduled, just outside your regular hours. Save anyway?`
                );
                if (!confirmed) return;
            }

            const response = await apiFetch(`/teacher/schedule-rules/${editingRuleId}`, {
                method: "PUT",
                body: JSON.stringify({ dayOfWeek, startTime, endTime }),
            });

            if (!response.ok) {
                setErrorMessage(await readErrorMessage(response, "Failed to save rule"));
                return;
            }

            const savedRule: ScheduleRule = await response.json();
            onRulesChanged(sortRules(scheduleRules.map((rule) => (rule.id === savedRule.id ? savedRule : rule))));
            resetForm();
            return;
        }

        // create mode - each range in the list is saved as its own rule, one request
        // at a time, so a conflict on one range doesn't silently drop the others
        const createdRules: ScheduleRule[] = [];
        for (const range of ranges) {
            const response = await apiFetch(`/teacher/schedule-rules`, {
                method: "POST",
                body: JSON.stringify({ dayOfWeek, startTime: range.startTime, endTime: range.endTime }),
            });

            if (!response.ok) {
                const baseMessage = await readErrorMessage(response, "Failed to add rule");
                setErrorMessage(
                    baseMessage +
                    (createdRules.length > 0 ? ` (${createdRules.length} of ${ranges.length} range(s) were saved before this one failed)` : "")
                );
                if (createdRules.length > 0) onRulesChanged(sortRules([...scheduleRules, ...createdRules]));
                return;
            }

            const createdRule: ScheduleRule = await response.json();
            createdRules.push(createdRule);
        }

        onRulesChanged(sortRules([...scheduleRules, ...createdRules]));
        resetForm();
    }

    async function handleDeleteRule(ruleId: number) {
        setErrorMessage("");

        const countResponse = await apiFetch(`/teacher/schedule-rules/${ruleId}/affected-lessons-count`);
        const affectedCount: number = countResponse.ok ? await countResponse.json() : 0;

        if (affectedCount > 0) {
            const confirmed = window.confirm(
                `${affectedCount} upcoming lesson${affectedCount === 1 ? "" : "s"} fall inside this slot. ` +
                `Deleting this rule won't cancel ${affectedCount === 1 ? "it" : "them"} - ${affectedCount === 1 ? "it" : "they"} will stay scheduled, just outside your regular hours. Delete anyway?`
            );
            if (!confirmed) return;
        }

        const response = await apiFetch(`/teacher/schedule-rules/${ruleId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete rule"));
            return;
        }

        onRulesChanged(scheduleRules.filter((rule) => rule.id !== ruleId));
    }

    return (
        <Modal title="Weekly availability" onClose={onClose}>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <select
                        value={dayOfWeek}
                        onChange={(e) => {
                            if (editingRuleId !== null) {
                                resetForm();
                            }
                            setDayOfWeek(e.target.value);
                        }}
                        className={inputClass}
                    >
                        {days.map((day) => (
                            <option key={day} value={day}>{day}</option>
                        ))}
                    </select>

                    {ranges.map((range, index) => (
                        <div key={index} className="flex flex-wrap gap-2 items-center">
                            <TimeSelect
                                value={range.startTime}
                                onChange={(value) => updateRange(index, "startTime", value)}
                                className={inputClass}
                            />
                            <TimeSelect
                                value={range.endTime}
                                onChange={(value) => updateRange(index, "endTime", value)}
                                className={inputClass}
                            />
                            {editingRuleId === null && ranges.length > 1 && (
                                <button
                                    onClick={() => removeRange(index)}
                                    className="px-2 py-1 rounded-md bg-white border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}

                    {editingRuleId === null && (
                        <button
                            onClick={addRange}
                            className="self-start text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            + Add another time range for {dayOfWeek}
                        </button>
                    )}

                    <div className="flex flex-wrap gap-2 items-center mt-1">
                        <button
                            onClick={handleSaveRule}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            {editingRuleId !== null ? "Save changes" : ranges.length > 1 ? `Add ${ranges.length} rules` : "Add rule"}
                        </button>
                        {editingRuleId !== null && (
                            <button
                                onClick={resetForm}
                                className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {scheduleRules.length === 0 && (
                        <p className="px-4 py-6 text-sm text-slate-500 text-center">No rules yet.</p>
                    )}
                    {days
                        .filter((day) => scheduleRules.some((rule) => rule.dayOfWeek === day))
                        .map((day) => (
                            <div key={day} className="px-4 py-2">
                                <p className="text-xs font-semibold text-slate-500 mb-1">{day}</p>
                                <div className="flex flex-col gap-1">
                                    {scheduleRules
                                        .filter((rule) => rule.dayOfWeek === day)
                                        .map((rule) => (
                                            <div key={rule.id} className="flex items-center justify-between">
                                                <span className="text-sm text-slate-900">
                                                    {formatTime(rule.startTime)} to {formatTime(rule.endTime)}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => startEditRule(rule)}
                                                        className="px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="px-2 py-1 rounded-md bg-white border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </Modal>
    );
}
