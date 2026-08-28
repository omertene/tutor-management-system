import { Navigate } from "react-router-dom";
import { decodeToken } from "../utils/jwt";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: string;
}

/* Blocks access to a page unless the stored token is valid and matches the
   required role - redirects to login otherwise */
function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let role: string;
  try {
    role = decodeToken(token).role;
  } catch {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  if (role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
