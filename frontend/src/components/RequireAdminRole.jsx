import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function RequireAdminRole({ children }) {
  const { isAuthRequired, user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthRequired && user?.role === "user") {
    return <Navigate to="/" replace />;
  }

  return children;
}
