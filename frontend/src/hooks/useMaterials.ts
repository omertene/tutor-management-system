import { useEffect, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { Student, Subject } from "../types";
import type { Material } from "../types/material";

// materials for whichever role is viewing, plus the reference data the teacher's
// "add material" form needs. the teacher sees every material; a student sees only
// their own, from a different endpoint.
export function useMaterials(role: string) {
    const isTeacher = role === "TEACHER";

    const [materials, setMaterials] = useState<Material[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function load() {
            const subjectsRes = await apiFetch(`/subjects`);
            if (subjectsRes.ok) setSubjects((await subjectsRes.json()) as Subject[]);

            if (isTeacher) {
                const [studentsRes, materialsRes] = await Promise.all([
                    apiFetch(`/teacher/students`),
                    apiFetch(`/teacher/materials`),
                ]);

                if (studentsRes.ok) setStudents((await studentsRes.json()) as Student[]);
                else setErrorMessage("Failed to load students");

                if (materialsRes.ok) setMaterials((await materialsRes.json()) as Material[]);
                else setErrorMessage("Failed to load materials");
            } else {
                const materialsRes = await apiFetch(`/student/materials`);
                if (materialsRes.ok) setMaterials((await materialsRes.json()) as Material[]);
                else setErrorMessage("Failed to load materials");
            }
        }
        load();
    }, [isTeacher]);

    function addMaterial(created: Material) {
        setMaterials((current) => [...current, created]);
    }

    // downloads a FILE-type material
    async function downloadMaterial(materialId: number, fileName: string) {
        setErrorMessage("");

        const response = await apiFetch(`/materials/${materialId}/download`);
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

    // hard delete (unlike lessons/payments, which soft-cancel), so it gets a confirm
    async function deleteMaterial(material: Material) {
        setErrorMessage("");

        if (!window.confirm(`Delete "${material.title}"? This can't be undone.`)) return;

        const response = await apiFetch(`/teacher/materials/${material.id}`, { method: "DELETE" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to delete material"));
            return;
        }

        setMaterials((current) => current.filter((m) => m.id !== material.id));
    }

    return {
        materials, students, subjects,
        errorMessage, setErrorMessage,
        addMaterial, downloadMaterial, deleteMaterial,
    };
}
