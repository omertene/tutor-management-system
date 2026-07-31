import { useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

const API_BASE_URL = "http://localhost:8080";

type Student = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
};

function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <div>
      <h1>Teacher Dashboard</h1>

      <p>Welcome! Here you will see your upcoming lessons and students.</p>

      <Link to="/teacher/register">Add student</Link>
      <br/>
      <Link to="/teacher/subjects">subject screen</Link>


      <h2>Your Students:</h2>

      <button onClick={handleLoadStudents}>show all students</button>

      <p>{errorMessage}</p>

      <ul>
        {students.map((student) => (
          <li key={student.id}>
            {student.firstName} {student.lastName} - {student.email}
          </li>
        ))}
      </ul>

      <br />

      <LogoutButton />
    </div>
  );
}

export default TeacherDashboard;
