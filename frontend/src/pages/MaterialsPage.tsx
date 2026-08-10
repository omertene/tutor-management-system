import { useState } from "react";
import NavBar from "../components/NavBar";
import { decodeToken } from "../utils/jwt";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
    { label: "Home", to: "/teacher" },
    { label: "Students", to: "/teacher/register" },
    { label: "Subjects", to: "/teacher/subjects" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Overrides", to: "/teacher/schedule-overrides" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
];

const studentLinks = [
    { label: "Home", to: "/student" },
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

        const data = await response.json();
        setLessons(data);
    }

    // teacher views a specific student's materials
    async function handleLoadMaterialsForStudent(studentId: number) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/students/${studentId}/materials`, {
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

    // teacher deletes a material 
    async function handleDeleteMaterial(materialId: number) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/materials/${materialId}`, {
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

        setMaterials(materials.filter((material) => material.id !== materialId));
    }

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const primaryButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const secondaryButtonClass = "px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const smallSecondaryButtonClass = "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={role === "TEACHER" ? "/teacher" : "/student"} links={role === "TEACHER" ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Materials</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {role === "TEACHER" && (
                    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add material</h2>

                        <div className="flex flex-wrap gap-3 items-center">
                            <button onClick={handleLoadStudents} className={secondaryButtonClass}>
                                Load students
                            </button>

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

                            <select
                                value={lessonId}
                                onChange={(e) => setLessonId(e.target.value)}
                                disabled={!selectedStudentId}
                                className={inputClass}
                            >
                                <option value="">No specific lesson (optional)</option>
                                {lessons.map((lesson) => (
                                    <option key={lesson.id} value={lesson.id}>
                                        {lesson.date} {lesson.startTime}-{lesson.endTime} — {lesson.subjectName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center mt-3">
                            <input
                                placeholder="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className={inputClass}
                            />

                            <input
                                placeholder="Description (optional)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className={`${inputClass} flex-1 min-w-[200px]`}
                            />
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
                                <button onClick={handleAddLink} className={`${secondaryButtonClass} w-full mt-2`}>
                                    Add link
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-2">As a note</h3>
                                <p className="text-xs text-slate-500 mb-2">Uses the description above as the note text.</p>
                                <button onClick={handleAddNote} className={`${secondaryButtonClass} w-full`}>
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
                                <button onClick={handleUploadFile} className={`${secondaryButtonClass} w-full mt-2`}>
                                    Upload file
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => handleLoadMaterialsForStudent(Number(selectedStudentId))}
                            disabled={!selectedStudentId}
                            className={`${secondaryButtonClass} mt-4`}
                        >
                            Show materials for selected student
                        </button>
                    </div>
                )}

                {role === "STUDENT" && (
                    <div className="mt-6">
                        <button onClick={handleLoadOwnMaterials} className={secondaryButtonClass}>
                            Show my materials
                        </button>
                    </div>
                )}

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Materials</h2>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {materials.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">No materials loaded yet.</p>
                        )}

                        {materials.map((material) => (
                            <div key={material.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyles[material.type] ?? "bg-slate-100 text-slate-500"}`}>
                                        {material.type}
                                    </span>
                                    <span className="font-medium text-slate-900">{material.title}</span>
                                    {material.description && (
                                        <span className="text-slate-500 text-sm">— {material.description}</span>
                                    )}
                                    <span className="text-slate-400 text-xs italic">
                                        {material.lessonDate
                                            ? `from lesson: ${material.lessonDate} ${material.lessonStartTime} — ${material.lessonSubject}`
                                            : "general material"}
                                    </span>
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
                                            onClick={() => handleDeleteMaterial(material.id)}
                                            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default MaterialsPage;
