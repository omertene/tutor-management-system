import { useState } from "react";
import NavBar from "../components/NavBar";
import ListPager from "../components/ListPager";
import AddMaterialForm from "../components/materials/AddMaterialForm";
import MaterialRow from "../components/materials/MaterialRow";
import { useMaterials } from "../hooks/useMaterials";
import { usePagination } from "../hooks/usePagination";
import { decodeToken } from "../utils/jwt";
import { inputClass } from "../constants/formStyles";
import { formatDateAndTime } from "../utils/time";
import { studentLinks, teacherLinks } from "../constants/navLinks";

const MATERIALS_PER_PAGE = 10;

function MaterialsPage() {
    // ProtectedRoute guarantees a token before this page renders; the ?? "" keeps
    // decodeToken's signature honest and its try/catch handles a malformed value
    const token = localStorage.getItem("token") ?? "";
    const { role } = decodeToken(token);
    const isTeacher = role === "TEACHER";

    const {
        materials, students, subjects,
        errorMessage, setErrorMessage,
        addMaterial, downloadMaterial, deleteMaterial,
    } = useMaterials(role);

    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");
    // lets you jump straight to "materials for this lesson" - matches against the
    // lesson's date/subject text shown in each row (e.g. "7/10/26" or "Math")
    const [lessonFilterQuery, setLessonFilterQuery] = useState("");

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
            const lessonLabel = `${formatDateAndTime(material.lessonDate, material.lessonStartTime)} ${material.lessonSubject}`.toLowerCase();
            return lessonLabel.includes(query);
        })
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

    const { page, totalPages, visibleItems, setPage } = usePagination(
        filteredMaterials,
        MATERIALS_PER_PAGE,
        `${searchQuery}|${typeFilter}|${subjectFilter}|${lessonFilterQuery}`
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={isTeacher ? "/teacher" : "/student"} links={isTeacher ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Materials</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {isTeacher && (
                    <AddMaterialForm students={students} onCreated={addMaterial} onError={setErrorMessage} />
                )}

                <div className="mt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-slate-900">Materials</h2>
                        <div className="flex flex-wrap gap-2">
                            <input
                                type="text"
                                placeholder={isTeacher ? "Search by student or title..." : "Search by title..."}
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
                            {isTeacher && (
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
                        {visibleItems.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                {materials.length === 0 ? "No materials yet." : "No materials match your search."}
                            </p>
                        )}

                        {visibleItems.map((material) => (
                            <MaterialRow
                                key={material.id}
                                material={material}
                                isTeacher={isTeacher}
                                onDownload={downloadMaterial}
                                onDelete={deleteMaterial}
                            />
                        ))}
                    </div>

                    {filteredMaterials.length > 0 && (
                        <ListPager
                            page={page}
                            totalPages={totalPages}
                            totalItems={filteredMaterials.length}
                            perPage={MATERIALS_PER_PAGE}
                            onChange={setPage}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

export default MaterialsPage;
