import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";

function StudentDashboard() {
  return (
    <div>
      <h1>Student Dashboard</h1>
      <p>Welcome! Here you will see your booked lessons.</p>

      <Link to="/student/lessons">lessons screen</Link>

      <br />
      <LogoutButton />
    </div>
  );
}

export default StudentDashboard;
