import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthRequired, user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthRequired && !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
