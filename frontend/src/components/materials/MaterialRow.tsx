import { smallSecondaryButtonClass } from "../../constants/formStyles";
import { formatDateAndTime, formatDateTimeString } from "../../utils/time";
import { typeStyles } from "../../types/material";
import type { Material } from "../../types/material";

type MaterialRowProps = {
    material: Material;
    isTeacher: boolean;
    onDownload: (materialId: number, fileName: string) => void;
    onDelete: (material: Material) => void;
};

export default function MaterialRow({ material, isTeacher, onDownload, onDelete }: MaterialRowProps) {
    return (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyles[material.type] ?? "bg-slate-100 text-slate-500"}`}>
                    {material.type}
                </span>
                <span className="font-medium text-slate-900">{material.title}</span>
                {isTeacher && (
                    <span className="text-slate-500 text-sm">
                        {material.studentFirstName} {material.studentLastName}
                    </span>
                )}
                {material.description && <span className="text-slate-500 text-sm">— {material.description}</span>}
                <span className="text-slate-400 text-xs italic">
                    {material.lessonDate && material.lessonStartTime
                        ? `from lesson: ${formatDateAndTime(material.lessonDate, material.lessonStartTime)} — ${material.lessonSubject}`
                        : "general material"}
                </span>
                <span className="text-slate-400 text-xs">{formatDateTimeString(material.uploadedAt)}</span>
            </div>

            <div className="flex gap-2 items-center">
                {material.type === "LINK" && material.url && (
                    <a href={material.url} target="_blank" rel="noreferrer" className={smallSecondaryButtonClass}>
                        Open link
                    </a>
                )}

                {material.type === "FILE" && material.fileName && (() => {
                    // captured in a local so the closure below still sees it as
                    // `string`, not `string | null` - narrowing from the JSX
                    // condition above doesn't carry into a nested arrow function
                    const fileName = material.fileName;
                    return (
                        <button onClick={() => onDownload(material.id, fileName)} className={smallSecondaryButtonClass}>
                            Download
                        </button>
                    );
                })()}

                {isTeacher && (
                    <button
                        onClick={() => onDelete(material)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}
