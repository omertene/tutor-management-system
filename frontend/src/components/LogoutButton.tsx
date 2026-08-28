import { useNavigate } from "react-router-dom";

/* Clears the stored token and sends the user back to login */
function LogoutButton() {
  const navigate = useNavigate();

  /* Removes the token so ProtectedRoute treats the user as logged out */
  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
    >
      Log out
    </button>
  );
}

export default LogoutButton;
