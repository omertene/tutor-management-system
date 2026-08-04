import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import type { Subject } from "../types";

const API_BASE_URL = "http://localhost:8080";

function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLoadSubjects() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/subjects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setErrorMessage("Failed to load subjects");
      return;
    }

    const data = await response.json();
    setSubjects(data);
  }

  async function handleAddSubjects() {
    setErrorMessage("");

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/subjects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newSubject }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setErrorMessage(errorData.message || "Failed to add subject");
      return;
    }

    const createdSubject = await response.json();
    setSubjects([...subjects, createdSubject]);
    setNewSubject("");
  }

  return (
    <div>
      <h1>hello this is subjects</h1>

      <button onClick={handleLoadSubjects}>show all subjects</button>

      <ul>
        {subjects.map((subject) => (
          <li key={subject.id}>
            {subject.id} {subject.name}
          </li>
        ))}
      </ul>

      <input
        value={newSubject}
        onChange={(e) => setNewSubject(e.target.value)}
      />
      <button onClick={handleAddSubjects}>add subject</button>

      {errorMessage && <p>{errorMessage}</p>}

      <br />

      <LogoutButton />
    </div>
  );
}

export default SubjectsPage;