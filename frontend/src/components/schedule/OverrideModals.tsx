import { useState } from "react";
import Modal from "../Modal";
import TimeSelect from "../TimeSelect";
import { inputClassFull, labelClass } from "../../constants/formStyles";
import type { ScheduleOverride } from "../../types/schedule";

// what the override form opens with: a new BLOCK/ADD for a chosen range, or an
// existing override being edited
export type OverrideDraft = {
    overrideId: number | null;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    // when the type was already decided by the action the teacher picked
    // ("Block this time" / "Add availability"), the dropdown is replaced by a
    // sentence - there's no reason to re-ask what they just chose
    typeLocked: boolean;
    note: string;
};

export function draftForNewOverride(date: string, startTime: string, endTime: string, type: string): OverrideDraft {
    return { overrideId: null, date, startTime, endTime, type, typeLocked: true, note: "" };
}

export function draftForExistingOverride(override: ScheduleOverride): OverrideDraft {
    return {
        overrideId: override.id,
        date: override.date,
        startTime: override.startTime.slice(0, 5),
        endTime: override.endTime.slice(0, 5),
        type: override.type,
        typeLocked: true,
        note: override.note ?? "",
    };
}

type OverrideFormModalProps = {
    draft: OverrideDraft;
    onClose: () => void;
    onSave: (
        body: { date: string; startTime: string; endTime: string; type: string; note: string },
        editingOverrideId: number | null,
    ) => Promise<string | null>;
};

export function OverrideFormModal({ draft, onClose, onSave }: OverrideFormModalProps) {
    const [date, setDate] = useState(draft.date);
    const [startTime, setStartTime] = useState(draft.startTime);
    const [endTime, setEndTime] = useState(draft.endTime);
    const [type, setType] = useState(draft.type);
    const [note, setNote] = useState(draft.note);
    const [error, setError] = useState("");

    async function handleSave() {
        setError("");

        const failure = await onSave({ date, startTime, endTime, type, note }, draft.overrideId);

        if (failure) {
            setError(failure);
            return;
        }

        onClose();
    }

    return (
        <Modal title={draft.overrideId !== null ? "Edit override" : "Add schedule override"} onClose={onClose}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClassFull} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Start time</label>
                        <TimeSelect value={startTime} onChange={setStartTime} className={inputClassFull} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>End time</label>
                        <TimeSelect value={endTime} onChange={setEndTime} className={inputClassFull} />
                    </div>
                </div>

                {draft.typeLocked ? (
                    <p className="text-sm text-slate-500">
                        {type === "ADD" ? "Adding extra availability." : "Blocking this time."}
                    </p>
                ) : (
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Type</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClassFull}>
                            <option value="BLOCK">Block (mark unavailable)</option>
                            <option value="ADD">Add (extra availability)</option>
                        </select>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Note (optional)</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason..." className={inputClassFull} />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    onClick={handleSave}
                    className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    Save
                </button>
            </div>
        </Modal>
    );
}

type ViewOverrideModalProps = {
    override: ScheduleOverride;
    onClose: () => void;
    onBookLesson: (override: ScheduleOverride) => void;
    onEdit: (override: ScheduleOverride) => void;
    onDelete: (overrideId: number) => void;
};

export function ViewOverrideModal({ override, onClose, onBookLesson, onEdit, onDelete }: ViewOverrideModalProps) {
    return (
        <Modal title={override.type === "BLOCK" ? "Blocked time" : "Added availability"} onClose={onClose}>
            <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-700">
                    {override.date} &middot; {override.startTime.slice(0, 5)}&ndash;{override.endTime.slice(0, 5)}
                </p>
                {override.note && <p className="text-sm text-slate-500">{override.note}</p>}

                {override.type === "ADD" && (
                    <button
                        onClick={() => onBookLesson(override)}
                        className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                    >
                        Book a lesson here
                    </button>
                )}

                <button
                    onClick={() => onEdit(override)}
                    className="w-full rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium py-2.5 hover:bg-slate-50 transition-colors"
                >
                    Edit
                </button>

                <button
                    onClick={() => onDelete(override.id)}
                    className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                >
                    Delete
                </button>
            </div>
        </Modal>
    );
}
