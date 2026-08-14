import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { decodeToken } from "../utils/jwt";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Subjects", to: "/teacher/subjects" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
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

    const token = localStorage.getItem("token")!;
    const { role } = decodeToken(token);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [students, setStudents] = useState<Student[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);

    // shared "which student / which lesson" fields for all three add forms
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [lessonId, setLessonId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    // link-only
    const [url, setUrl] = useState("");

    // file-only
    const [file, setFile] = useState<File | null>(null);

    // search + pagination for the materials list below
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    // lets you jump straight to "materials for this lesson" - matches against the
    // lesson's date/subject text shown in each row (e.g. "7/10/26" or "Math")
    const [lessonFilterQuery, setLessonFilterQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const MATERIALS_PER_PAGE = 20;

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

        const data = await response.json();
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

        const data = await response.json();
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

        const data = await response.json();
        setMaterials(data);
    }

    useEffect(() => {
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
    }, [searchQuery, typeFilter, lessonFilterQuery]);

    // teacher adds a link
    async function handleAddLink() {
        setErrorMessage("");

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
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to add link");
            return;
        }

        const createdMaterial = await response.json();
        setMaterials([...materials, createdMaterial]);
        setTitle("");
        setDescription("");
        setUrl("");
    }

    // teacher adds a note
    async function handleAddNote() {
        setErrorMessage("");

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
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to add note");
            return;
        }

        const createdMaterial = await response.json();
        setMaterials([...materials, createdMaterial]);
        setTitle("");
        setDescription("");
    }

    // teacher uploads a file
    async function handleUploadFile() {
        setErrorMessage("");

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
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to upload file");
            return;
        }

        const createdMaterial = await response.json();
        setMaterials([...materials, createdMaterial]);
        setTitle("");
        setDescription("");
        setFile(null);
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
        link.click();

        URL.revokeObjectURL(blobUrl);
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
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to delete material");
            return;
        }

        setMaterials(materials.filter((m) => m.id !== material.id));
    }

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "text-sm font-medium text-slate-700";
    const secondaryButtonClass = "px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const smallSecondaryButtonClass = "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

    const filteredMaterials = materials
        .filter((material) => typeFilter === "ALL" || material.type === typeFilter)
        .filter((material) => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.trim().toLowerCase();
            const fullName = `${material.studentFirstName} ${material.studentLastName}`.toLowerCase();
            return fullName.includes(query) || material.title.toLowerCase().includes(query);
        })
        .filter((material) => {
            if (!lessonFilterQuery.trim()) return true;
            const query = lessonFilterQuery.trim().toLowerCase();
            if (!material.lessonDate) return false;
            const lessonLabel = `${formatLessonDateTime(material.lessonDate, material.lessonStartTime!)} ${material.lessonSubject}`.toLowerCase();
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

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Title *</label>
                                <input
                                    placeholder="Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={inputClass}
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
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border border-slate-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-2">As a link</h3>
                                <input
                                    placeholder="URL"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className={`${inputClass} w-full`}
                                />
                                <button
                                    onClick={handleAddLink}
                                    disabled={!selectedStudentId || !title || !url}
                                    className={`${secondaryButtonClass} w-full mt-2`}
                                >
                                    Add link
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-2">As a note</h3>
                                <p className="text-xs text-slate-500 mb-2">Uses the description above as the note text.</p>
                                <button
                                    onClick={handleAddNote}
                                    disabled={!selectedStudentId || !title || !description}
                                    className={`${secondaryButtonClass} w-full`}
                                >
                                    Add note
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-2">As a file</h3>
                                <input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                    className="text-sm text-slate-600 w-full"
                                />
                                <button
                                    onClick={handleUploadFile}
                                    disabled={!selectedStudentId || !title || !file}
                                    className={`${secondaryButtonClass} w-full mt-2`}
                                >
                                    Upload file
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-slate-900">Materials</h2>
                        <div className="flex flex-wrap gap-2">
                            {role === "TEACHER" && (
                                <input
                                    type="text"
                                    placeholder="Search by student or title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={inputClass}
                                />
                            )}
                            <input
                                type="text"
                                placeholder="Filter by lesson..."
                                title="Filter by lesson date or subject"
                                value={lessonFilterQuery}
                                onChange={(e) => setLessonFilterQuery(e.target.value)}
                                className={`${inputClass} w-32`}
                            />
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

                                    {material.type === "FILE" && material.fileName && (
                                        <button onClick={() => handleDownload(material.id, material.fileName!)} className={smallSecondaryButtonClass}>
                                            Download
                                        </button>
                                    )}

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
