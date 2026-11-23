import { useState } from "react";
import Modal from "../Modal";
import TimeSelect from "../TimeSelect";
import { inputClassFull, labelClass } from "../../constants/formStyles";
import type { ScheduleOverride } from "../../types/schedule";

/* Two modals for schedule overrides: a form to add/edit one, and a view
   to see an existing one's details. */

/* What the override form opens with: a new BLOCK/ADD for a chosen range,
   or an existing override being edited */
export type OverrideDraft = {
    overrideId: number | null;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    /* true when the action already picked the type (Block/Add) - then the
       dropdown is replaced by a plain sentence instead of asking again */
    typeLocked: boolean;
    note: string;
};

/* Builds an empty draft for a new override, type already decided by the caller */
export function draftForNewOverride(date: string, startTime: string, endTime: string, type: string): OverrideDraft {
    return { overrideId: null, date, startTime, endTime, type, typeLocked: true, note: "" };
}

/* Builds a draft pre-filled from an existing override, for editing */
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

    /* Validates the form and saves the override (create or edit) */
    async function handleSave() {
        setError("");

        /* an empty time fails to deserialize on the backend with a confusing error */
        if (!date || !startTime || !endTime) {
            setError("יש למלא את כל השדות");
            return;
        }

        const failure = await onSave({ date, startTime, endTime, type, note }, draft.overrideId);

        if (failure) {
            setError(failure);
            return;
        }

        onClose();
    }

    return (
        <Modal title={draft.overrideId !== null ? "עריכת חריגה" : "הוספת חריגה בלוח הזמנים"} onClose={onClose}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>תאריך</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClassFull} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>שעת התחלה</label>
                        <TimeSelect value={startTime} onChange={setStartTime} className={inputClassFull} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>שעת סיום</label>
                        <TimeSelect value={endTime} onChange={setEndTime} className={inputClassFull} />
                    </div>
                </div>

                {draft.typeLocked ? (
                    <p className="text-sm text-slate-500">
                        {type === "ADD" ? "מוסיפים זמינות נוספת." : "חוסמים את הזמן הזה."}
                    </p>
                ) : (
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>סוג</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClassFull}>
                            <option value="BLOCK">חסימה (סימון כלא זמין)</option>
                            <option value="ADD">הוספה (זמינות נוספת)</option>
                        </select>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>הערה (אופציונלי)</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="סיבה..." className={inputClassFull} />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    onClick={handleSave}
                    className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    שמירה
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

/* Shows an existing override's details - offers "book a lesson" only for
   ADD overrides, since a BLOCK is unavailable time by definition */
export function ViewOverrideModal({ override, onClose, onBookLesson, onEdit, onDelete }: ViewOverrideModalProps) {
    return (
        <Modal title={override.type === "BLOCK" ? "זמן חסום" : "זמינות נוספת"} onClose={onClose}>
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
                        קביעת שיעור כאן
                    </button>
                )}

                <button
                    onClick={() => onEdit(override)}
                    className="w-full rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium py-2.5 hover:bg-slate-50 transition-colors"
                >
                    עריכה
                </button>

                <button
                    onClick={() => onDelete(override.id)}
                    className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                >
                    מחיקה
                </button>
            </div>
        </Modal>
    );
}
