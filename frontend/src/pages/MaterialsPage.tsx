import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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

/* Materials list for both roles - the teacher can also add and delete, a
   student can only view and download their own */
function MaterialsPage() {
    /* ProtectedRoute guarantees a token before this page renders - the ?? ""
       keeps decodeToken's signature honest, its try/catch handles a bad value */
    const token = localStorage.getItem("token") ?? "";
    const { role } = decodeToken(token);
    const isTeacher = role === "TEACHER";

    const {
        materials, students, subjects,
        errorMessage, setErrorMessage,
        addMaterial, downloadMaterial, deleteMaterial,
    } = useMaterials(role);

    /* "?lesson=ID" (from the student's lessons page) narrows the list to one lesson's materials */
    const [searchParams, setSearchParams] = useSearchParams();
    const lessonIdParam = searchParams.get("lesson");
    const lessonIdFilter = lessonIdParam !== null && /^\d+$/.test(lessonIdParam) ? Number(lessonIdParam) : null;

    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");
    /* Lets you jump to "materials for this lesson" - matches against the
       lesson's date/subject text shown in each row */
    const [lessonFilterQuery, setLessonFilterQuery] = useState("");

    const filteredMaterials = materials
        .filter((material) => lessonIdFilter === null || material.lessonId === lessonIdFilter)
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
            /* lessonDate and lessonStartTime are always set together, but TypeScript
               can't know that from two independently-nullable fields, so both are
               checked explicitly */
            if (!material.lessonDate || !material.lessonStartTime) return false;
            const lessonLabel = `${formatDateAndTime(material.lessonDate, material.lessonStartTime)} ${material.lessonSubject}`.toLowerCase();
            return lessonLabel.includes(query);
        })
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

    const { page, totalPages, visibleItems, setPage } = usePagination(
        filteredMaterials,
        MATERIALS_PER_PAGE,
        `${searchQuery}|${typeFilter}|${subjectFilter}|${lessonFilterQuery}|${lessonIdFilter}`
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={isTeacher ? "/teacher" : "/student"} links={isTeacher ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">חומרי לימוד</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {lessonIdFilter !== null && (() => {
                    const lessonMaterial = materials.find((m) => m.lessonId === lessonIdFilter);
                    return (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3">
                            <div>
                                <p className="text-xs font-medium text-indigo-600">מסונן לפי שיעור</p>
                                <p className="text-base font-semibold text-slate-900">
                                    {lessonMaterial?.lessonSubject ?? "שיעור"}
                                    {lessonMaterial?.lessonDate && lessonMaterial.lessonStartTime && (
                                        <span className="font-normal text-slate-600">
                                            {" "}&middot; <span dir="ltr" className="inline-block">{formatDateAndTime(lessonMaterial.lessonDate, lessonMaterial.lessonStartTime)}</span>
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setSearchParams({})}
                                className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                            >
                                הצגת כל החומרים
                            </button>
                        </div>
                    );
                })()}

                {isTeacher && (
                    <AddMaterialForm students={students} onCreated={addMaterial} onError={setErrorMessage} />
                )}

                <div className="mt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-slate-900">חומרי לימוד</h2>
                        <div className="flex flex-wrap gap-2">
                            <input
                                type="text"
                                placeholder={isTeacher ? "חיפוש לפי תלמיד או כותרת..." : "חיפוש לפי כותרת..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={inputClass}
                            />
                            <input
                                type="text"
                                placeholder="סינון לפי שיעור..."
                                title="סינון לפי תאריך או מקצוע השיעור"
                                value={lessonFilterQuery}
                                onChange={(e) => setLessonFilterQuery(e.target.value)}
                                className={`${inputClass} w-32`}
                            />
                            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={inputClass}>
                                <option value="ALL">כל המקצועות</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.name}>{subject.name}</option>
                                ))}
                            </select>
                            {isTeacher && (
                                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
                                    <option value="ALL">כל הסוגים</option>
                                    <option value="FILE">קובץ</option>
                                    <option value="LINK">קישור</option>
                                    <option value="NOTE">הערה</option>
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {visibleItems.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                {materials.length === 0 ? "אין חומרי לימוד עדיין." : "לא נמצאו חומרים התואמים לחיפוש."}
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
