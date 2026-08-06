import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import { decodeToken } from "../utils/jwt";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

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

    return (

        <div>
            <h1>Materials</h1>

            {role === "TEACHER" && (
                <div>
                    <h2>Add material</h2>

                    <button onClick={handleLoadStudents}>load students</button>

                    <select
                        value={selectedStudentId}
                        onChange={(e) => handleLoadLessonsForStudent(e.target.value)}
                    >
                        <option value="">select student</option>
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
                    >
                        <option value="">no specific lesson (optional)</option>
                        {lessons.map((lesson) => (
                            <option key={lesson.id} value={lesson.id}>
                                {lesson.date} {lesson.startTime}-{lesson.endTime} — {lesson.subjectName}
                            </option>
                        ))}
                    </select>

                    <input
                        placeholder="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <input
                        placeholder="description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <h3>As a link</h3>
                    <input
                        placeholder="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <button onClick={handleAddLink}>add link</button>

                    <h3>As a note</h3>
                    <button onClick={handleAddNote}>add note</button>

                    <h3>As a file</h3>
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    />
                    <button onClick={handleUploadFile}>upload file</button>

                    <br />

                    <button
                        onClick={() => handleLoadMaterialsForStudent(Number(selectedStudentId))}
                        disabled={!selectedStudentId}
                    >
                        show materials for selected student
                    </button>
                </div>
            )}

            {role === "STUDENT" && (
                <div>
                    <button onClick={handleLoadOwnMaterials}>show my materials</button>
                </div>
            )}

            <ul>
                {materials.map((material) => (
                    <li key={material.id}>
                        [{material.type}] {material.title}
                        {material.description && ` — ${material.description}`}

                        {material.lessonDate && (
                            <>
                                {" "}
                                <em>
                                    (from lesson: {material.lessonDate} {material.lessonStartTime} — {material.lessonSubject})
                                </em>
                            </>
                        )}
                        {!material.lessonDate && <> <em>(general material)</em></>}

                        {material.type === "LINK" && material.url && (
                            <>
                                {" "}
                                <a href={material.url} target="_blank" rel="noreferrer">
                                    open link
                                </a>
                            </>
                        )}

                        {material.type === "FILE" && material.fileName && (
                            <>
                                {" "}
                                <button onClick={() => handleDownload(material.id, material.fileName!)}>
                                    download {material.fileName}
                                </button>
                            </>
                        )}

                        {role === "TEACHER" && (
                            <>
                                {" "}
                                <button onClick={() => handleDeleteMaterial(material.id)}>delete</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            {errorMessage && <p>{errorMessage}</p>}

            <br />
            <LogoutButton />
        </div>
    )
}

export default MaterialsPage;
