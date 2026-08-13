import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";
import type { Student } from "../types";

const teacherLinks = [
  { label: "Students", to: "/teacher/register" },
  { label: "Subjects", to: "/teacher/subjects" },
  { label: "Schedule", to: "/teacher/schedule-rules" },
  { label: "Lessons", to: "/teacher/lessons" },
  { label: "Payments", to: "/teacher/payments" },
  { label: "Materials", to: "/teacher/materials" },
  { label: "Statistics", to: "/teacher/statistics" },
];



const API_BASE_URL = "http://localhost:8080";

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  async function loadStudents(inactiveOnly: boolean) {
    setListErrorMessage("");
    setShowingInactive(inactiveOnly);

    const token = localStorage.getItem("token");
    const endpoint = inactiveOnly ? "/teacher/students/all" : "/teacher/students";

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setListErrorMessage("Failed to load students");
      return;
    }

    const data: Student[] = await response.json();
    setStudents(inactiveOnly ? data.filter((student) => !student.active) : data);
  }

  async function loadDebts() {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/debts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const data: { studentId: number; debt: number }[] = await response.json();
    const map: Record<number, number> = {};
    data.forEach((entry) => {
      map[entry.studentId] = entry.debt;
    });
    setDebtByStudentId(map);
  }

  async function loadCounts() {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/${student.id}/active`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !student.active }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setListErrorMessage(errorData.message || "Failed to update student status");
      return;
    }

    loadStudents(showingInactive);
    loadDebts();
    loadCounts();
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

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/${studentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
      const errorData = await response.json();
      setListErrorMessage(errorData.message || "Failed to update student");
      return;
    }

    const updatedStudent = await response.json();
    setStudents(students.map((student) => (student.id === studentId ? updatedStudent : student)));
    setEditingStudentId(null);
  }

  async function handleRegister() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password || !firstName || !lastName || !phone || !hourlyRate || !educationLevel) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        phone,
        hourlyRate: Number(hourlyRate),
        educationLevel,
        notes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setErrorMessage(errorData.message);
      return;
    }

    setSuccessMessage("Student created successfully");
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setHourlyRate("");
    setEducationLevel("");
    setNotes("");
    loadStudents(showingInactive);
    loadDebts();
    loadCounts();
    setShowAddStudentModal(false);
  }

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "text-sm font-medium text-slate-700";

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
                onClick={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  setShowAddStudentModal(true);
                }}
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(student)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Edit
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
        <Modal title="Add student" onClose={() => setShowAddStudentModal(false)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Password *</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>First name *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Last name *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Phone *</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Hourly rate *</label>
                <input value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Education level *</label>
                <input value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Notes (optional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
              </div>
            </div>

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

            <button
              onClick={handleRegister}
              className="w-full mt-2 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Add student
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default RegisterPage;