import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import { Link } from "react-router-dom";



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

  return (
    <div>
      <Link to="/teacher">back</Link>
      <h1>Add Student</h1>
      <p>Email *</p>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <p>Password *</p>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <p>First name *</p>
      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <p>Last name *</p>
      <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <p>Phone *</p>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      <p>Hourly rate *</p>
      <input value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
      <p>Education level *</p>
      <input value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} />
      <p>Notes (optional)</p>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      <br />
      <button onClick={handleRegister}>Add student</button>
      <p>{errorMessage}</p>
      <p>{successMessage}</p>
      <LogoutButton />
    </div>
  );
}

export default RegisterPage;