import { useState } from "react";
import { apiFetch, readErrorMessage } from "../../utils/api";
import { inputClass, labelClass, primaryButtonClass } from "../../constants/formStyles";
import { formatDateAndTime } from "../../utils/time";
import type { Material, MaterialLesson, MaterialType } from "../../types/material";
import type { Student } from "../../types";

// how many of the student's most recent lessons to offer in the "attach to lesson" dropdown
const LESSON_PICKER_LIMIT = 50;

type AddMaterialFormProps = {
    students: Student[];
    onCreated: (material: Material) => void;
    onError: (message: string) => void;
};

// one form for all three material kinds: shared Student/Lesson/Title fields, plus a
// type tab (Link / Note / File) that swaps in just the field that type needs.
export default function AddMaterialForm({ students, onCreated, onError }: AddMaterialFormProps) {
    const [studentId, setStudentId] = useState("");
    const [lessons, setLessons] = useState<MaterialLesson[]>([]);
    const [lessonId, setLessonId] = useState("");
    const [title, setTitle] = useState("");
    const [addType, setAddType] = useState<MaterialType>("LINK");

    // description is shared by LINK/FILE (optional extra context); NOTE reuses the
    // same field as its actual note text (the backend's AddNoteRequest.description
    // *is* the note body - there's no separate field), but is labeled "Note text"
    // in the UI below so it doesn't read as an optional description
    const [description, setDescription] = useState("");
    const [url, setUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // teacher picked a student - load that student's lessons so they can be picked
    // from a dropdown too instead of typing a lesson id from memory
    async function handleStudentChange(newStudentId: string) {
        onError("");
        setStudentId(newStudentId);
        setLessonId("");
        setLessons([]);

        if (!newStudentId) return;

        const response = await apiFetch(`/teacher/students/${newStudentId}/lessons`);
        if (!response.ok) {
            onError("Failed to load lessons");
            return;
        }

        const data = (await response.json()) as MaterialLesson[];
        const sorted = data
            .filter((lesson) => lesson.status !== "CANCELLED")
            .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
        // cap the dropdown to the most recent lessons so it stays scrollable for
        // long-running students - older ones can still be found via the material search
        setLessons(sorted.slice(0, LESSON_PICKER_LIMIT));
    }

    // clears just the type-specific fields, so switching tabs after a successful add
    // doesn't carry stale values over
    function resetForm() {
        setTitle("");
        setDescription("");
        setUrl("");
        setFile(null);
    }

    async function handleSubmit() {
        onError("");

        let response: Response;

        if (addType === "FILE") {
            if (!file) {
                onError("Choose a file first");
                return;
            }
            const formData = new FormData();
            formData.append("studentId", studentId);
            if (lessonId) formData.append("lessonId", lessonId);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("file", file);

            response = await apiFetch(`/teacher/materials/file`, { method: "POST", body: formData });
        } else {
            const path = addType === "LINK" ? "/teacher/materials/link" : "/teacher/materials/note";
            const body: Record<string, unknown> = {
                studentId: Number(studentId),
                lessonId: lessonId ? Number(lessonId) : null,
                title,
                description,
            };
            if (addType === "LINK") body.url = url;

            response = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
        }

        if (!response.ok) {
            const fallback = addType === "LINK" ? "Failed to add link"
                : addType === "NOTE" ? "Failed to add note"
                : "Failed to upload file";
            onError(await readErrorMessage(response, fallback));
            return;
        }

        onCreated((await response.json()) as Material);
        resetForm();
    }

    const submitDisabled =
        !studentId ||
        !title ||
        (addType === "LINK" && !url) ||
        (addType === "NOTE" && !description) ||
        (addType === "FILE" && !file);

    return (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add material</h2>

            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Student *</label>
                    <select value={studentId} onChange={(e) => handleStudentChange(e.target.value)} className={inputClass}>
                        <option value="">Select student</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Lesson (optional)</label>
                    <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!studentId} className={inputClass}>
                        <option value="">No specific lesson</option>
                        {lessons.map((lesson) => (
                            <option key={lesson.id} value={lesson.id}>
                                {formatDateAndTime(lesson.date, lesson.startTime)} — {lesson.subjectName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                    <label className={labelClass}>Title *</label>
                    <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} w-full`} />
                </div>
            </div>

            {/* type selector - picks which of the three material kinds this is;
                only the one field that type actually needs is shown below */}
            <div className="mt-4 flex gap-2 border-b border-slate-200">
                {(["LINK", "NOTE", "FILE"] as MaterialType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setAddType(type)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            addType === type
                                ? "border-indigo-600 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {type === "LINK" ? "Link" : type === "NOTE" ? "Note" : "File"}
                    </button>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 items-end">
                {addType === "LINK" && (
                    <>
                        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                            <label className={labelClass}>URL *</label>
                            <input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} className={`${inputClass} w-full`} />
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                            <label className={labelClass}>Description (optional)</label>
                            <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} w-full`} />
                        </div>
                    </>
                )}

                {addType === "NOTE" && (
                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                        <label className={labelClass}>Note text *</label>
                        <textarea
                            placeholder="Write the note here..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className={`${inputClass} w-full`}
                        />
                    </div>
                )}

                {addType === "FILE" && (
                    <>
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>File *</label>
                            <label className="flex flex-col gap-1 cursor-pointer">
                                <input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                    className="text-sm text-slate-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-slate-700 file:text-sm file:font-medium hover:file:bg-slate-50 file:cursor-pointer cursor-pointer"
                                />
                            </label>
                            {file && <p className="text-xs text-slate-500 mt-1 truncate">Selected: {file.name}</p>}
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                            <label className={labelClass}>Description (optional)</label>
                            <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} w-full`} />
                        </div>
                    </>
                )}

                <button onClick={handleSubmit} disabled={submitDisabled} className={primaryButtonClass}>
                    {addType === "FILE" ? "Upload file" : "Add material"}
                </button>
            </div>
        </div>
    );
}
