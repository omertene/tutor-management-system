import { useNavigate } from "react-router-dom";

function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return <button onClick={handleLogout}>Log out</button>;
}

export default LogoutButton;
