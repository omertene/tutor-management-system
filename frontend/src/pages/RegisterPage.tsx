import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";
import AddStudentModal from "../components/AddStudentModal";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { Student } from "../types";
import { inputClassFull, labelClass } from "../constants/formStyles";
import { teacherLinks } from "../constants/navLinks";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d+$/;

function validateEmailField(email: string): string | null {
  if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address";
  return null;
}

function validatePasswordField(password: string): string | null {
  if (password.length < 4) return "Password must be at least 4 characters";
  return null;
}

function validatePhoneField(phone: string): string | null {
  if (!PHONE_PATTERN.test(phone)) return "Phone number must contain digits only";
  return null;
}

function validateHourlyRateField(hourlyRate: string): string | null {
  if (!/^\d+$/.test(hourlyRate) || Number(hourlyRate) <= 0) {
    return "Hourly rate must be a positive whole number";
  }
  return null;
}

function RegisterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [listErrorMessage, setListErrorMessage] = useState("");
  const [showingInactive, setShowingInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  const [debtByStudentId, setDebtByStudentId] = useState<Record<number, number>>({});

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [editEducationLevel, setEditEducationLevel] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [credentialsStudent, setCredentialsStudent] = useState<Student | null>(null);
  const [credentialsEmail, setCredentialsEmail] = useState("");
  const [credentialsNewPassword, setCredentialsNewPassword] = useState("");
  const [credentialsErrorMessage, setCredentialsErrorMessage] = useState("");
  const [credentialsSuccessMessage, setCredentialsSuccessMessage] = useState("");

  async function loadStudents(inactiveOnly: boolean) {
    setListErrorMessage("");
    setShowingInactive(inactiveOnly);
    const endpoint = inactiveOnly ? "/teacher/students/all" : "/teacher/students";

    const response = await apiFetch(`${endpoint}`);

    if (!response.ok) {
      setListErrorMessage("Failed to load students");
      return;
    }

    const data: Student[] = await response.json();
    setStudents(inactiveOnly ? data.filter((student) => !student.active) : data);
  }

  async function loadDebts() {

    const response = await apiFetch(`/teacher/debts`);
    if (!response.ok) return;

    const data: { studentId: number; debt: number }[] = await response.json();
    const map: Record<number, number> = {};
    data.forEach((entry) => {
      map[entry.studentId] = entry.debt;
    });
    setDebtByStudentId(map);
  }

  async function loadCounts() {

    const response = await apiFetch(`/teacher/students/all`);
    if (!response.ok) return;

    const data: Student[] = await response.json();
    setActiveCount(data.filter((student) => student.active).length);
    setInactiveCount(data.filter((student) => !student.active).length);
  }

  useEffect(() => {
    loadStudents(false);
    loadDebts();
    loadCounts();
  }, []);

  async function handleToggleActive(student: Student) {
    setListErrorMessage("");

    try {
      const response = await apiFetch(`/teacher/students/${student.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !student.active }),
      });

      if (!response.ok) {
        setListErrorMessage(await readErrorMessage(response, "Failed to update student status"));
        return;
      }

      loadStudents(showingInactive);
      loadDebts();
      loadCounts();
    } catch {
      setListErrorMessage("Could not reach the server. Please try again.");
    }
  }

  // opens the edit form for a student, pre-filled with their current values
  function handleStartEdit(student: Student) {
    setEditingStudentId(student.id);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditPhone(student.phone ?? "");
    setEditHourlyRate(String(student.hourlyRate));
    setEditEducationLevel(student.educationLevel ?? "");
    setEditNotes(student.notes ?? "");
  }

  function handleCancelEdit() {
    setEditingStudentId(null);
  }

  // PUT /teacher/students/{id}
  async function handleSaveEdit(studentId: number) {
    setListErrorMessage("");

    if (!editFirstName.trim() || !editLastName.trim()) {
      setListErrorMessage("First and last name are required");
      return;
    }

    const fieldError = validatePhoneField(editPhone) || validateHourlyRateField(editHourlyRate);
    if (fieldError) {
      setListErrorMessage(fieldError);
      return;
    }

    try {
      const response = await apiFetch(`/teacher/students/${studentId}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          hourlyRate: Number(editHourlyRate),
          educationLevel: editEducationLevel,
          notes: editNotes,
        }),
      });

      if (!response.ok) {
        setListErrorMessage(await readErrorMessage(response, "Failed to update student"));
        return;
      }

      const updatedStudent: Student = await response.json();
      setStudents(students.map((student) => (student.id === studentId ? updatedStudent : student)));
      setEditingStudentId(null);
    } catch {
      setListErrorMessage("Could not reach the server. Please try again.");
    }
  }

  function handleStartCredentials(student: Student) {
    setCredentialsStudent(student);
    setCredentialsEmail(student.email);
    setCredentialsNewPassword("");
    setCredentialsErrorMessage("");
    setCredentialsSuccessMessage("");
  }

  function handleCloseCredentials() {
    setCredentialsStudent(null);
  }

  async function handleSaveEmail() {
    if (!credentialsStudent) return;
    setCredentialsErrorMessage("");
    setCredentialsSuccessMessage("");

    const fieldError = validateEmailField(credentialsEmail);
    if (fieldError) {
      setCredentialsErrorMessage(fieldError);
      return;
    }

    try {
      const response = await apiFetch(`/teacher/students/${credentialsStudent.id}/email`, {
        method: "PATCH",
        body: JSON.stringify({ email: credentialsEmail }),
      });

      if (!response.ok) {
        setCredentialsErrorMessage(await readErrorMessage(response, "Failed to update email"));
        return;
      }

      const updatedStudent: Student = await response.json();
      setStudents(students.map((student) => (student.id === updatedStudent.id ? updatedStudent : student)));
      setCredentialsStudent(updatedStudent);
      setCredentialsSuccessMessage("Email updated");
    } catch {
      setCredentialsErrorMessage("Could not reach the server. Please try again.");
    }
  }

  async function handleResetPassword() {
    if (!credentialsStudent) return;
    setCredentialsErrorMessage("");
    setCredentialsSuccessMessage("");

    const fieldError = validatePasswordField(credentialsNewPassword);
    if (fieldError) {
      setCredentialsErrorMessage(fieldError);
      return;
    }

    try {
      const response = await apiFetch(`/teacher/students/${credentialsStudent.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword: credentialsNewPassword }),
      });

      if (!response.ok) {
        setCredentialsErrorMessage(await readErrorMessage(response, "Failed to reset password"));
        return;
      }

      setCredentialsNewPassword("");
      setCredentialsSuccessMessage("Password reset");
    } catch {
      setCredentialsErrorMessage("Could not reach the server. Please try again.");
    }
  }

  function handleStudentCreated() {
    loadStudents(showingInactive);
    loadDebts();
    loadCounts();
  }

  const filteredStudents = students.filter((student) =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <button
                onClick={() => loadStudents(false)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  !showingInactive
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Show active
              </button>
              <button
                onClick={() => loadStudents(true)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  showingInactive
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Show inactive
              </button>
            </div>
          </div>

          {listErrorMessage && <p className="text-sm text-red-600 mt-2">{listErrorMessage}</p>}

          <p className="text-sm text-slate-500 mt-4">
            {showingInactive ? inactiveCount : activeCount} {showingInactive ? "inactive" : "active"} student
            {(showingInactive ? inactiveCount : activeCount) === 1 ? "" : "s"}
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
              <div key={student.id} className="px-4 py-3">
                {editingStudentId === student.id ? (
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      placeholder="first name"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="last name"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="hourly rate"
                      value={editHourlyRate}
                      onChange={(e) => setEditHourlyRate(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-24"
                    />
                    <input
                      placeholder="education level"
                      value={editEducationLevel}
                      onChange={(e) => setEditEducationLevel(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-32"
                    />
                    <input
                      placeholder="notes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm w-40"
                    />
                    <button
                      onClick={() => handleSaveEdit(student.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-slate-500 text-sm">{student.email}</span>
                        <span className="text-slate-500 text-sm">{student.phone}</span>
                        <span className="text-slate-500 text-sm">₪{student.hourlyRate}/hr</span>
                        {(debtByStudentId[student.id] ?? 0) > 0 && (
                          <span className="text-sm font-medium text-red-600">
                            Debt: ₪{debtByStudentId[student.id]}
                          </span>
                        )}
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            student.active
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {student.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {(student.educationLevel || student.notes) && (
                        <div className="flex items-start gap-2 flex-wrap text-sm text-slate-500">
                          {student.educationLevel && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {student.educationLevel}
                            </span>
                          )}
                          {student.notes && (
                            <span className="italic">{student.notes}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(student)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleStartCredentials(student)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Credentials
                      </button>
                      <button
                        onClick={() => handleToggleActive(student)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        {student.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {showAddStudentModal && (
        <AddStudentModal
          onClose={() => setShowAddStudentModal(false)}
          onCreated={handleStudentCreated}
        />
      )}

      {credentialsStudent && (
        <Modal
          title={`Credentials — ${credentialsStudent.firstName} ${credentialsStudent.lastName}`}
          onClose={handleCloseCredentials}
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={credentialsEmail}
                  onChange={(e) => setCredentialsEmail(e.target.value)}
                  className={inputClassFull}
                />
                <button
                  onClick={handleSaveEmail}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  Save email
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-slate-200">
              <label className={labelClass}>Reset password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New password"
                  value={credentialsNewPassword}
                  onChange={(e) => setCredentialsNewPassword(e.target.value)}
                  className={inputClassFull}
                />
                <button
                  onClick={handleResetPassword}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  Reset password
                </button>
              </div>
            </div>

            {credentialsErrorMessage && <p className="text-sm text-red-600">{credentialsErrorMessage}</p>}
            {credentialsSuccessMessage && <p className="text-sm text-green-600">{credentialsSuccessMessage}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default RegisterPage;