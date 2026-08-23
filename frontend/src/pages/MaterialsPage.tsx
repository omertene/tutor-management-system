import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { decodeToken } from "../utils/jwt";
import { API_BASE_URL, readErrorMessage, getToken } from "../utils/api";
import type { Student, Subject } from "../types";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
    { label: "Settings", to: "/teacher/settings" },
];

const studentLinks = [
    { label: "Lessons", to: "/student/lessons" },
    { label: "Payments", to: "/student/payments" },
    { label: "Materials", to: "/student/materials" },
];

const typeStyles: Record<string, string> = {
    FILE: "bg-purple-50 text-purple-700",
    LINK: "bg-blue-50 text-blue-700",
    NOTE: "bg-amber-50 text-amber-700",
};

type MaterialType = "FILE" | "LINK" | "NOTE";

type Material = {
    id: number;
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    lessonId: number | null;
    lessonDate: string | null;
    lessonStartTime: string | null;
    lessonSubject: string | null;
    title: string;
    description: string;
    type: MaterialType;
    url: string | null;
    fileName: string | null;
    uploadedAt: string;
}

type Lesson = {
    id: number;
    subjectName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
}

// how many of the student's most recent lessons to offer in the "attach to lesson" dropdown
const LESSON_PICKER_LIMIT = 50;

// "2026-10-07T18:00:00" -> "7/10/26 18:00"
function formatUploadedAt(dateTime: string): string {
    const [datePart, timePart] = dateTime.split("T");
    const [year, month, day] = datePart.split("-");
    const time = timePart ? timePart.slice(0, 5) : "";
    return `${Number(day)}/${Number(month)}/${year.slice(2)} ${time}`;
}

// "2026-10-07" + "18:00:00" -> "7/10/26 18:00"
function formatLessonDateTime(date: string, time: string): string {
    const [year, month, day] = date.split("-");
    return `${Number(day)}/${Number(month)}/${year.slice(2)} ${time.slice(0, 5)}`;
}

function MaterialsPage() {

    const token = getToken();
    const { role } = decodeToken(token);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [students, setStudents] = useState<Student[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // single "add material" form - shared Student/Lesson/Title fields, plus a type
    // tab (Link / Note / File) that swaps in just the one field that type needs
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [lessonId, setLessonId] = useState("");
    const [title, setTitle] = useState("");
    const [addType, setAddType] = useState<MaterialType>("LINK");

    // description is shared by LINK/FILE (optional extra context); NOTE reuses the
    // same field as its actual note text (the backend's AddNoteRequest.description
    // *is* the note body - there's no separate field), but is labeled "Note text"
    // in the UI below so it doesn't read as an optional description
    const [description, setDescription] = useState("");

    // link-only
    const [url, setUrl] = useState("");

    // file-only
    const [file, setFile] = useState<File | null>(null);

    // search + pagination for the materials list below
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");
    // lets you jump straight to "materials for this lesson" - matches against the
    // lesson's date/subject text shown in each row (e.g. "7/10/26" or "Math")
    const [lessonFilterQuery, setLessonFilterQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const MATERIALS_PER_PAGE = 10;

    async function handleLoadStudents() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/students`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load students");
            return;
        }

        const data: Student[] = await response.json();
        setStudents(data);
    }

    // teacher picked a student in the dropdown - load that student's lessons so they
    // can be picked from a dropdown too instead of typing a lesson id from memory
    async function handleLoadLessonsForStudent(studentId: string) {
        setErrorMessage("");
        setSelectedStudentId(studentId);
        setLessonId("");
        setLessons([]);

        if (!studentId) {
            return;
        }

        const response = await fetch(`${API_BASE_URL}/teacher/students/${studentId}/lessons`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load lessons");
            return;
        }

        const data: Lesson[] = await response.json();
        const sorted = data
            .filter((lesson) => lesson.status !== "CANCELLED")
            .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
        // cap the dropdown to the most recent lessons so it stays scrollable for
        // long-running students - older ones can still be found via the material search
        setLessons(sorted.slice(0, LESSON_PICKER_LIMIT));
    }

    // teacher views every material across every student - GET /teacher/materials
    async function handleLoadAllMaterials() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/materials`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load materials");
            return;
        }

        const data: Material[] = await response.json();
        setMaterials(data);
    }

    // student views their own materials
    async function handleLoadOwnMaterials() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/student/materials`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load materials");
            return;
        }

        const data: Material[] = await response.json();
        setMaterials(data);
    }

    async function handleLoadSubjects() {
        const response = await fetch(`${API_BASE_URL}/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data: Subject[] = await response.json();
        setSubjects(data);
    }

    useEffect(() => {
        handleLoadSubjects();
        if (role === "TEACHER") {
            handleLoadStudents();
            handleLoadAllMaterials();
        } else {
            handleLoadOwnMaterials();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, typeFilter, subjectFilter, lessonFilterQuery]);

    // clears just the fields that are specific to one material type, called after
    // a successful add so switching type tabs afterward doesn't carry stale values over
    function resetAddForm() {
        setTitle("");
        setDescription("");
        setUrl("");
        setFile(null);
    }

    // teacher adds a link - POST /teacher/materials/link
    async function submitAddLink() {
        const response = await fetch(`${API_BASE_URL}/teacher/materials/link`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                studentId: Number(selectedStudentId),
                lessonId: lessonId ? Number(lessonId) : null,
                title,
                description,
                url,
            }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to add link"));
            return;
        }

        const createdMaterial: Material = await response.json();
        setMaterials([...materials, createdMaterial]);
        resetAddForm();
    }

    // teacher adds a note - POST /teacher/materials/note. the note's text is sent
    // as "description" (that's what AddNoteRequest expects - there's no separate
    // field on the backend), but the form below labels it "Note text" for clarity
    async function submitAddNote() {
        const response = await fetch(`${API_BASE_URL}/teacher/materials/note`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                studentId: Number(selectedStudentId),
                lessonId: lessonId ? Number(lessonId) : null,
                title,
                description,
            }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to add note"));
            return;
        }

        const createdMaterial: Material = await response.json();
        setMaterials([...materials, createdMaterial]);
        resetAddForm();
    }

    // teacher uploads a file - POST /teacher/materials/file
    async function submitUploadFile() {
        if (!file) {
            setErrorMessage("Choose a file first");
            return;
        }

        const formData = new FormData();
        formData.append("studentId", selectedStudentId);
        if (lessonId) {
            formData.append("lessonId", lessonId);
        }
        formData.append("title", title);
        formData.append("description", description);
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/teacher/materials/file`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to upload file"));
            return;
        }

        const createdMaterial: Material = await response.json();
        setMaterials([...materials, createdMaterial]);
        resetAddForm();
    }

    // single entry point for the "Add material" button - dispatches to the right
    // submit function based on which type tab is selected
    async function handleAddMaterial() {
        setErrorMessage("");

        if (addType === "LINK") {
            await submitAddLink();
        } else if (addType === "NOTE") {
            await submitAddNote();
        } else {
            await submitUploadFile();
        }
    }

    // downloads a FILE-type material
    async function handleDownload(materialId: number, fileName: string) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/materials/${materialId}/download`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to download file");
            return;
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;

        // the link needs to actually be in the DOM for click() to reliably trigger a
        // download in every browser (Chrome tolerates a detached element, Firefox/Safari
        // don't always). revoking the blob URL on the same tick as the click is the same
        // story - some browsers haven't finished reading it yet, so the download can come
        // back empty/broken. deferring both to a follow-up tick avoids the race
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(blobUrl);
        }, 0);
    }

    // teacher deletes a material - this is a hard delete (unlike lessons/payments,
    // which soft-cancel), so it gets a confirm since it can't be undone
    async function handleDeleteMaterial(material: Material) {
        setErrorMessage("");

        const confirmed = window.confirm(`Delete "${material.title}"? This can't be undone.`);
        if (!confirmed) return;

        const response = await fetch(`${API_BASE_URL}/teacher/materials/${material.id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete material"));
            return;
        }

        setMaterials(materials.filter((m) => m.id !== material.id));
    }

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "text-sm font-medium text-slate-700";
    const primaryButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const smallSecondaryButtonClass = "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

    const filteredMaterials = materials
        .filter((material) => typeFilter === "ALL" || material.type === typeFilter)
        .filter((material) => subjectFilter === "ALL" || material.lessonSubject === subjectFilter)
        .filter((material) => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.trim().toLowerCase();
            const fullName = `${material.studentFirstName} ${material.studentLastName}`.toLowerCase();
            return fullName.includes(query) || material.title.toLowerCase().includes(query);
        })
        .filter((material) => {
            if (!lessonFilterQuery.trim()) return true;
            const query = lessonFilterQuery.trim().toLowerCase();
            // lessonDate and lessonStartTime are always set together (both come from
            // the same optional linked Lesson on the backend - see MaterialService),
            // but TypeScript can't know that from two independently-nullable fields,
            // so both are checked explicitly instead of asserting the second away
            if (!material.lessonDate || !material.lessonStartTime) return false;
            const lessonLabel = `${formatLessonDateTime(material.lessonDate, material.lessonStartTime)} ${material.lessonSubject}`.toLowerCase();
            return lessonLabel.includes(query);
        })
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

    const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / MATERIALS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const visibleMaterials = filteredMaterials.slice(
        (safePage - 1) * MATERIALS_PER_PAGE,
        safePage * MATERIALS_PER_PAGE
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={role === "TEACHER" ? "/teacher" : "/student"} links={role === "TEACHER" ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Materials</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {role === "TEACHER" && (
                    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add material</h2>

                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Student *</label>
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => handleLoadLessonsForStudent(e.target.value)}
                                    className={inputClass}
                                >
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
                                <select
                                    value={lessonId}
                                    onChange={(e) => setLessonId(e.target.value)}
                                    disabled={!selectedStudentId}
                                    className={inputClass}
                                >
                                    <option value="">No specific lesson</option>
                                    {lessons.map((lesson) => (
                                        <option key={lesson.id} value={lesson.id}>
                                            {formatLessonDateTime(lesson.date, lesson.startTime)} — {lesson.subjectName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                <label className={labelClass}>Title *</label>
                                <input
                                    placeholder="Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`${inputClass} w-full`}
                                />
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
                                        <input
                                            placeholder="https://..."
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className={`${inputClass} w-full`}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                        <label className={labelClass}>Description (optional)</label>
                                        <input
                                            placeholder="Description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className={`${inputClass} w-full`}
                                        />
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
                                        {file && (
                                            <p className="text-xs text-slate-500 mt-1 truncate">Selected: {file.name}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                        <label className={labelClass}>Description (optional)</label>
                                        <input
                                            placeholder="Description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className={`${inputClass} w-full`}
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                onClick={handleAddMaterial}
                                disabled={
                                    !selectedStudentId ||
                                    !title ||
                                    (addType === "LINK" && !url) ||
                                    (addType === "NOTE" && !description) ||
                                    (addType === "FILE" && !file)
                                }
                                className={primaryButtonClass}
                            >
                                {addType === "FILE" ? "Upload file" : "Add material"}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-slate-900">Materials</h2>
                        <div className="flex flex-wrap gap-2">
                            <input
                                type="text"
                                placeholder={role === "TEACHER" ? "Search by student or title..." : "Search by title..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={inputClass}
                            />
                            <input
                                type="text"
                                placeholder="Filter by lesson..."
                                title="Filter by lesson date or subject"
                                value={lessonFilterQuery}
                                onChange={(e) => setLessonFilterQuery(e.target.value)}
                                className={`${inputClass} w-32`}
                            />
                            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={inputClass}>
                                <option value="ALL">All subjects</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.name}>{subject.name}</option>
                                ))}
                            </select>
                            {role === "TEACHER" && (
                                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
                                    <option value="ALL">All types</option>
                                    <option value="FILE">File</option>
                                    <option value="LINK">Link</option>
                                    <option value="NOTE">Note</option>
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {visibleMaterials.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                {materials.length === 0 ? "No materials yet." : "No materials match your search."}
                            </p>
                        )}

                        {visibleMaterials.map((material) => (
                            <div key={material.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyles[material.type] ?? "bg-slate-100 text-slate-500"}`}>
                                        {material.type}
                                    </span>
                                    <span className="font-medium text-slate-900">{material.title}</span>
                                    {role === "TEACHER" && (
                                        <span className="text-slate-500 text-sm">
                                            {material.studentFirstName} {material.studentLastName}
                                        </span>
                                    )}
                                    {material.description && (
                                        <span className="text-slate-500 text-sm">— {material.description}</span>
                                    )}
                                    <span className="text-slate-400 text-xs italic">
                                        {material.lessonDate && material.lessonStartTime
                                            ? `from lesson: ${formatLessonDateTime(material.lessonDate, material.lessonStartTime)} — ${material.lessonSubject}`
                                            : "general material"}
                                    </span>
                                    <span className="text-slate-400 text-xs">{formatUploadedAt(material.uploadedAt)}</span>
                                </div>

                                <div className="flex gap-2 items-center">
                                    {material.type === "LINK" && material.url && (
                                        <a
                                            href={material.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={smallSecondaryButtonClass}
                                        >
                                            Open link
                                        </a>
                                    )}

                                    {material.type === "FILE" && material.fileName && (() => {
                                        // captured in a local so the closure below still sees it as
                                        // `string`, not `string | null` - narrowing from the JSX
                                        // condition above doesn't carry into a nested arrow function
                                        const fileName = material.fileName;
                                        return (
                                            <button onClick={() => handleDownload(material.id, fileName)} className={smallSecondaryButtonClass}>
                                                Download
                                            </button>
                                        );
                                    })()}

                                    {role === "TEACHER" && (
                                        <button
                                            onClick={() => handleDeleteMaterial(material)}
                                            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredMaterials.length > 0 && (
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Showing {(safePage - 1) * MATERIALS_PER_PAGE + 1}-{Math.min(safePage * MATERIALS_PER_PAGE, filteredMaterials.length)} of {filteredMaterials.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className={smallSecondaryButtonClass}
                                >
                                    &larr; Previous
                                </button>
                                <span className="text-sm text-slate-500">Page {safePage} of {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className={smallSecondaryButtonClass}
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default MaterialsPage;
