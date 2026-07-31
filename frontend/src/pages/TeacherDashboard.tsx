import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

function TeacherDashboard() {
  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <p>Welcome! Here you will see your upcoming lessons and students.</p>
      <Link to="/teacher/register">Add student</Link>
      <br />
      <LogoutButton />
    </div>
  );
}

export default TeacherDashboard;
