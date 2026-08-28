import { useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import AddStudentModal from "../components/AddStudentModal";
import StudentRow from "../components/students/StudentRow";
import CredentialsModal from "../components/students/CredentialsModal";
import { useStudents } from "../hooks/useStudents";
import { teacherLinks } from "../constants/navLinks";
import type { Student } from "../types";

/* The teacher's student roster page - search, filter active/inactive, add a
   student, and open a row's edit or credentials */
function RegisterPage() {
    const {
        students, errorMessage, setErrorMessage, showingInactive,
        activeCount, inactiveCount, debtByStudentId,
        loadStudents, refresh, toggleActive, replaceStudent,
    } = useStudents();

    const [searchQuery, setSearchQuery] = useState("");
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [credentialsStudent, setCredentialsStudent] = useState<Student | null>(null);

    const filteredStudents = students.filter((student) =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const shownCount = showingInactive ? inactiveCount : activeCount;

    /* Styles the active/inactive filter buttons based on which is selected */
    function filterButtonClass(selected: boolean) {
        return `px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            selected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
        }`;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <Link to="/teacher" className="text-sm text-indigo-600 hover:text-indigo-700">
                    &larr; Back
                </Link>

                <h1 className="text-2xl font-semibold text-slate-900 mt-2">Students</h1>

                <div className="mt-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                            />
                            <button
                                onClick={() => setShowAddStudentModal(true)}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                + Add student
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => loadStudents(false)} className={filterButtonClass(!showingInactive)}>
                                Show active
                            </button>
                            <button onClick={() => loadStudents(true)} className={filterButtonClass(showingInactive)}>
                                Show inactive
                            </button>
                        </div>
                    </div>

                    {errorMessage && <p className="text-sm text-red-600 mt-2">{errorMessage}</p>}

                    <p className="text-sm text-slate-500 mt-4">
                        {shownCount} {showingInactive ? "inactive" : "active"} student{shownCount === 1 ? "" : "s"}
                    </p>

                    <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {students.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                {showingInactive ? "No inactive students." : "You have no active students yet."}
                            </p>
                        )}

                        {students.length > 0 && filteredStudents.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">No students match "{searchQuery}".</p>
                        )}

                        {filteredStudents.map((student) => (
                            <StudentRow
                                key={student.id}
                                student={student}
                                debt={debtByStudentId[student.id] ?? 0}
                                onSaved={replaceStudent}
                                onError={setErrorMessage}
                                onOpenCredentials={setCredentialsStudent}
                                onToggleActive={toggleActive}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {showAddStudentModal && (
                <AddStudentModal onClose={() => setShowAddStudentModal(false)} onCreated={refresh} />
            )}

            {credentialsStudent && (
                <CredentialsModal
                    student={credentialsStudent}
                    onClose={() => setCredentialsStudent(null)}
                    onEmailChanged={(updated) => {
                        replaceStudent(updated);
                        setCredentialsStudent(updated);
                    }}
                />
            )}
        </div>
    );
}

export default RegisterPage;
