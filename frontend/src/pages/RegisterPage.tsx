import { useState } from "react";
import NavBar from "../components/NavBar";
import { Link } from "react-router-dom";

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
  }

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar homePath="/teacher" links={teacherLinks} />

      <main className="max-w-xl mx-auto px-4 py-8">
        <Link to="/teacher" className="text-sm text-indigo-600 hover:text-indigo-700">
          &larr; Back
        </Link>

        <h1 className="text-2xl font-semibold text-slate-900 mt-2">Add student</h1>

        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
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

          {errorMessage && <p className="text-sm text-red-600 mt-4">{errorMessage}</p>}
          {successMessage && <p className="text-sm text-green-600 mt-4">{successMessage}</p>}

          <button
            onClick={handleRegister}
            className="w-full mt-6 rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
          >
            Add student
          </button>
        </div>
      </main>
    </div>
  );
}

export default RegisterPage;