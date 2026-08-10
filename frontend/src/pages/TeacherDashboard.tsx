import { useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // which student's edit form is currently open, and the form fields for it
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [notes, setNotes] = useState("");

  async function handleLoadStudents() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

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


  async function handleLoadAllStudentsIncludingInactive() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/all`, {
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


  async function handleToggleActive(student: Student) {
    setErrorMessage("");

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
      setErrorMessage(errorData.message || "Failed to update student status");
      return;
    }

    const updatedStudent = await response.json();
    setStudents(students.map((s) => s.id === student.id ? updatedStudent : s));
  }

  // opens the edit form for a student, pre-filled with their current values
  function handleStartEdit(student: Student) {
    setEditingStudentId(student.id);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setPhone(student.phone ?? "");
    setHourlyRate(String(student.hourlyRate));
    setEducationLevel(student.educationLevel ?? "");
    setNotes(student.notes ?? "");
  }

  function handleCancelEdit() {
    setEditingStudentId(null);
  }

  // PUT /teacher/students/{id}
  async function handleSaveEdit(studentId: number) {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/teacher/students/${studentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
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
      setErrorMessage(errorData.message || "Failed to update student");
      return;
    }

    const updatedStudent = await response.json();
    setStudents(students.map((student) => student.id === studentId ? updatedStudent : student));
    setEditingStudentId(null);
  }

  return (
    <div>
      <h1>Teacher Dashboard</h1>

      <p>Welcome! Here you will see your upcoming lessons and students.</p>

      <Link to="/teacher/register">Add student</Link>
      <br/>
      <Link to="/teacher/subjects">subject screen</Link>
      <br/>
      <Link to="/teacher/schedule-rules">schedule rules screen</Link>
      <br/>
      <Link to="/teacher/schedule-overrides">schedule overrides screen</Link>
      <br/>
      <Link to="/teacher/lessons">lessons screen</Link>
      <br/>
      <Link to="/teacher/payments">payments screen</Link>
      <br/>
      <Link to="/teacher/materials">materials screen</Link>
      <br/>
      <Link to="/teacher/statistics">statistics screen</Link>


      <h2>Your Students:</h2>

      <button onClick={handleLoadStudents}>show active students</button>
      {" "}
      <button onClick={handleLoadAllStudentsIncludingInactive}>show all (including inactive)</button>

      <p>{errorMessage}</p>

      <ul>
        {students.map((student) => (
          <li key={student.id}>
            {editingStudentId === student.id ? (
              <>
                <input placeholder="first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <input placeholder="last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                <input placeholder="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <input placeholder="hourly rate" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                <input placeholder="education level" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} />
                <input placeholder="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button onClick={() => handleSaveEdit(student.id)}>save</button>
                <button onClick={handleCancelEdit}>cancel</button>
              </>
            ) : (
              <>
                {student.firstName} {student.lastName} - {student.email} - {student.phone} - ₪{student.hourlyRate}/hr
                {" "}
                {student.active ? "(active)" : "(inactive)"}
                {" "}
                <button onClick={() => handleStartEdit(student)}>edit</button>
                {" "}
                <button onClick={() => handleToggleActive(student)}>
                  {student.active ? "deactivate" : "reactivate"}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <br />

      <LogoutButton />
    </div>
  );
}

export default TeacherDashboard;
