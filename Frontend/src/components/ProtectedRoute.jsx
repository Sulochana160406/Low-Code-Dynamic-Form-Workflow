import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../services/api";

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;